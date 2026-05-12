import frappe
import json


@frappe.whitelist(allow_guest=True)
def get_categories():
    """Return ecommerce categories (Item Groups) for the public storefront."""
    return frappe.get_all(
        "Item Group",
        filters={"custom_is_ecommerce_category": 1},
        fields=["name", "item_group_name", "image"],
        order_by="name asc",
    )


@frappe.whitelist(allow_guest=True)
def get_products(category=None):
    """Return published products for the storefront.

    Only returns non-disabled template items (variant_of is not set).
    Enriches each item with price, discount old-price, parsed colors/sizes.
    """
    filters = {"variant_of": ["is", "not set"], "disabled": 0}
    if category and category != "All":
        filters["item_group"] = category

    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=[
            "name", "item_name", "item_group", "description",
            "image",
            "custom_colors", "custom_sizes", "custom_badge",
            "custom_discount_percentage",
        ],
        order_by="creation desc",
    )

    if not items:
        return []

    # Bulk-fetch prices
    item_codes = [i["name"] for i in items]
    price_rows = frappe.get_all(
        "Item Price",
        filters={
            "item_code": ["in", item_codes],
            "selling": 1,
            "price_list": "Standard Selling",
        },
        fields=["item_code", "price_list_rate"],
    )
    price_map = {r["item_code"]: r["price_list_rate"] for r in price_rows}

    result = []
    for item in items:
        base_price = float(price_map.get(item["name"], 0))
        discount = float(item.get("custom_discount_percentage") or 0)
        if discount > 0:
            price = round(base_price * (1 - discount / 100), 2)
            old_price = base_price
        else:
            price = base_price
            old_price = 0

        # Parse colors JSON → list of hex codes for swatches
        colors = []
        try:
            raw_colors = json.loads(item.get("custom_colors") or "[]")
            for c in raw_colors:
                if isinstance(c, dict):
                    colors.append(c.get("hex", "#888"))
                elif isinstance(c, str):
                    colors.append(c)
        except (json.JSONDecodeError, TypeError):
            pass

        # Parse sizes JSON → list of labels
        sizes = []
        try:
            raw_sizes = json.loads(item.get("custom_sizes") or "[]")
            for s in raw_sizes:
                if isinstance(s, dict):
                    sizes.append(s.get("label", str(s)))
                elif isinstance(s, str):
                    sizes.append(s)
        except (json.JSONDecodeError, TypeError):
            pass

        result.append({
            "name": item["name"],
            "item_name": item["item_name"],
            "category": item["item_group"],
            "image": item.get("image") or "",
            "price": price,
            "old_price": old_price,
            "badge": item.get("custom_badge") or "",
            "colors": colors,
            "sizes": sizes,
        })

    return result


@frappe.whitelist(allow_guest=True)
def get_product(name):
    """Return a single product detail for the product page."""
    if not name or not frappe.db.exists("Item", name):
        frappe.throw("Product not found", frappe.DoesNotExistError)

    doc = frappe.get_doc("Item", name)

    if doc.disabled:
        frappe.throw("Product not available", frappe.DoesNotExistError)

    base_price = float(
        frappe.db.get_value(
            "Item Price",
            {"item_code": doc.name, "price_list": "Standard Selling", "selling": 1},
            "price_list_rate",
        ) or 0
    )

    discount = float(doc.get("custom_discount_percentage") or 0)
    if discount > 0:
        price = round(base_price * (1 - discount / 100), 2)
        old_price = base_price
    else:
        price = base_price
        old_price = 0

    # Colors with name + hex
    colors = []
    try:
        raw = json.loads(doc.get("custom_colors") or "[]")
        for c in raw:
            if isinstance(c, dict):
                colors.append({"name": c.get("name", ""), "hex": c.get("hex", "#888")})
            elif isinstance(c, str):
                colors.append({"name": c, "hex": c})
    except (json.JSONDecodeError, TypeError):
        pass

    # Sizes
    sizes = []
    try:
        raw = json.loads(doc.get("custom_sizes") or "[]")
        for s in raw:
            if isinstance(s, dict):
                sizes.append(s.get("label", str(s)))
            elif isinstance(s, str):
                sizes.append(s)
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "name": doc.name,
        "item_name": doc.item_name,
        "category": doc.item_group,
        "description": doc.description or "",
        "image": doc.image or "",
        "price": price,
        "old_price": old_price,
        "badge": doc.get("custom_badge") or "",
        "colors": colors,
        "sizes": sizes,
    }


def _get_or_create_customer():
    user = frappe.session.user
    if user == "Guest":
        return None

    customer = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not customer:
        customer_name = frappe.db.get_value("User", user, "full_name") or user
        doc = frappe.new_doc("Customer")
        doc.customer_name = customer_name
        doc.customer_type = "Individual"
        doc.customer_group = "All Customer Groups"
        doc.territory = "All Territories"
        doc.email_id = user
        doc.insert(ignore_permissions=True)
        customer = doc.name
    return customer


@frappe.whitelist()
def get_cart():
    """Retrieve the cart items from the latest Draft Quotation for the logged-in user."""
    user = frappe.session.user
    if user == "Guest":
        return []

    customer = _get_or_create_customer()
    quotation = frappe.db.get_value("Quotation",
        {"party_name": customer, "status": "Draft", "docstatus": 0},
        "name", order_by="creation desc")

    if not quotation:
        return []

    doc = frappe.get_doc("Quotation", quotation)
    items = []
    
    # Get image mapping from items
    item_codes = [i.item_code for i in doc.items]
    item_images = {i.name: i.image for i in frappe.get_all("Item", filters={"name": ["in", item_codes]}, fields=["name", "image"])}

    for item in doc.items:
        items.append({
            "name": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "price": item.rate,
            "image": item_images.get(item.item_code) or ""
        })
    return items


@frappe.whitelist()
def sync_cart(cart_items):
    """Save the cart items to a Draft Quotation for the logged-in user."""
    user = frappe.session.user
    if user == "Guest":
        return {"status": "error", "message": "Guest cannot sync to Quotation"}

    if isinstance(cart_items, str):
        cart_items = json.loads(cart_items)

    customer = _get_or_create_customer()

    # Find existing Draft Quotation
    quotation_name = frappe.db.get_value("Quotation",
        {"party_name": customer, "status": "Draft", "docstatus": 0},
        "name", order_by="creation desc")

    if quotation_name:
        doc = frappe.get_doc("Quotation", quotation_name)
        doc.items = []  # Clear existing items
    else:
        doc = frappe.new_doc("Quotation")
        doc.quotation_to = "Customer"
        doc.party_name = customer
        doc.transaction_date = frappe.utils.today()
        # Fallback for company
        company = frappe.db.get_default("company")
        if not company:
            companies = frappe.get_all("Company", limit=1)
            if companies:
                company = companies[0].name
        doc.company = company

    for item in cart_items:
        doc.append("items", {
            "item_code": item.get("name"),
            "qty": item.get("qty"),
            "rate": item.get("price")
        })

    if not doc.items:
        if quotation_name:
            frappe.delete_doc("Quotation", quotation_name)
            frappe.db.commit()
            return {"status": "deleted"}
        return {"status": "empty"}

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok", "quotation": doc.name}
