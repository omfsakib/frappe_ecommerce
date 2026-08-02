import frappe
import json


def _get_stock_map(item_codes):
    """Return {item_code: total actual_qty across warehouses}."""
    item_codes = [c for c in (item_codes or []) if c]
    if not item_codes:
        return {}
    rows = frappe.db.sql(
        """
        SELECT item_code, SUM(actual_qty) AS qty
        FROM `tabBin`
        WHERE item_code IN %(item_codes)s
        GROUP BY item_code
        """,
        {"item_codes": item_codes},
        as_dict=True,
    )
    return {r.item_code: float(r.qty or 0) for r in rows}


def _is_in_stock(item_code, is_stock_item, stock_map):
    """Non-stock items are treated as always available; stock items need actual_qty > 0."""
    if not is_stock_item:
        return True
    return stock_map.get(item_code, 0) > 0


def clear_storefront_page_cache(doc=None, method=None):
    """Bust Frappe's cached website page HTML (see cache_html in
    frappe/website/page_renderers/template_page.py) whenever storefront-wide
    settings change, so www pages reflect the new values on the next request
    instead of needing a manual `bench clear-cache`.
    """
    from frappe.website.utils import delete_page_cache
    delete_page_cache(None)


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
            "image", "has_variants", "is_stock_item",
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

    # Bulk-fetch variants (+ their Size attribute) for templates that have them
    template_codes = [i["name"] for i in items if i.get("has_variants")]
    variants_by_template = {}
    variant_size_map = {}
    stock_map = {}
    if template_codes:
        variant_rows = frappe.get_all(
            "Item",
            filters={"variant_of": ["in", template_codes], "disabled": 0},
            fields=["name", "variant_of", "is_stock_item"],
        )
        variant_codes = [v["name"] for v in variant_rows]
        for v in variant_rows:
            variants_by_template.setdefault(v["variant_of"], []).append(v)

        if variant_codes:
            size_attr_rows = frappe.get_all(
                "Item Variant Attribute",
                filters={"parent": ["in", variant_codes], "attribute": "Size"},
                fields=["parent", "attribute_value"],
            )
            variant_size_map = {r["parent"]: r["attribute_value"] for r in size_attr_rows}
            stock_map = _get_stock_map(variant_codes)

    # Stock for simple (non-variant) stock items
    simple_stock_codes = [i["name"] for i in items if not i.get("has_variants") and i.get("is_stock_item")]
    if simple_stock_codes:
        stock_map.update(_get_stock_map(simple_stock_codes))

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

        # Variant info + stock availability
        has_variants = item.get("has_variants")
        default_variant = None
        in_stock = True
        out_of_stock_sizes = []

        if has_variants:
            item_variants = variants_by_template.get(item["name"], [])
            if item_variants:
                default_variant = item_variants[0]["name"]

            in_stock = any(
                _is_in_stock(v["name"], v.get("is_stock_item"), stock_map)
                for v in item_variants
            )

            size_available = {}
            for v in item_variants:
                size = variant_size_map.get(v["name"])
                if not size:
                    continue
                available = _is_in_stock(v["name"], v.get("is_stock_item"), stock_map)
                size_available[size] = size_available.get(size, False) or available
            out_of_stock_sizes = [s for s in sizes if not size_available.get(s, False)]
        else:
            in_stock = _is_in_stock(item["name"], item.get("is_stock_item"), stock_map)

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
            "has_variants": bool(has_variants),
            "default_variant": default_variant,
            "in_stock": in_stock,
            "out_of_stock_sizes": out_of_stock_sizes,
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

    # Variants map + stock availability
    variants = []
    in_stock = True
    if doc.has_variants:
        variant_items = frappe.get_all("Item",
            filters={"variant_of": doc.name, "disabled": 0},
            fields=["name", "is_stock_item"]
        )
        stock_map = _get_stock_map([v.name for v in variant_items])
        for v in variant_items:
            v_attrs = {}
            # Fetch attributes from Item Variant Attribute table
            attrs = frappe.get_all("Item Variant Attribute",
                filters={"parent": v.name},
                fields=["attribute", "attribute_value"]
            )
            for a in attrs:
                v_attrs[a.attribute] = a.attribute_value

            variants.append({
                "name": v.name,
                "attributes": v_attrs,
                "in_stock": _is_in_stock(v.name, v.is_stock_item, stock_map),
            })
        in_stock = any(v["in_stock"] for v in variants)
    else:
        stock_map = _get_stock_map([doc.name])
        in_stock = _is_in_stock(doc.name, doc.is_stock_item, stock_map)

    return {
        "name": doc.name,
        "item_name": doc.item_name,
        "category": doc.item_group,
        "description": doc.description or "",
        "image": doc.image or "",
        "price": price,
        "in_stock": in_stock,
        "old_price": old_price,
        "badge": doc.get("custom_badge") or "",
        "colors": colors,
        "sizes": sizes,
        "has_variants": bool(doc.has_variants),
        "variants": variants
    }


def _get_or_create_customer(phone=None, first_name=None, last_name=None):
    user = frappe.session.user
    customer = None

    if user != "Guest":
        customer = frappe.db.get_value("Customer", {"email_id": user}, "name")
        if customer: return customer

    # For Guest or if not found by email, try phone
    if phone:
        customer = frappe.db.get_value("Customer", {"mobile_no": phone}, "name")

    if not customer:
        customer_name = f"{first_name or ''} {last_name or ''}".strip()
        if not customer_name:
            customer_name = user if user != "Guest" else (phone or "Guest Customer")
            
        doc = frappe.new_doc("Customer")
        doc.customer_name = customer_name
        doc.customer_type = "Individual"
        doc.mobile_no = phone
        if user != "Guest":
            doc.email_id = user
            
        # Dynamically find a non-group Customer Group and Territory
        doc.customer_group = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
        doc.territory = frappe.db.get_value("Territory", {"is_group": 0}, "name")
        
        doc.insert(ignore_permissions=True)
        customer = doc.name
        
    return customer


@frappe.whitelist()
def get_user_details():
    """Return basic user details to pre-fill the checkout form."""
    user = frappe.session.user
    if user == "Guest":
        return None
    
    user_doc = frappe.get_doc("User", user)
    
    # Try to get phone from Customer record
    phone = frappe.db.get_value("Customer", {"email_id": user}, "mobile_no")
    
    return {
        "first_name": user_doc.first_name,
        "last_name": user_doc.last_name,
        "phone": phone or user_doc.mobile_no
    }


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
        item_code = item.get("name")
        rate = item.get("price")

        # Template-to-variant safety resolver
        has_variants = frappe.db.get_value("Item", item_code, "has_variants")
        if has_variants:
            # Check if this item_code is a template (not a variant itself)
            # In ERPNext, a template has has_variants=1 and variant_of=None
            variant_of = frappe.db.get_value("Item", item_code, "variant_of")
            if not variant_of:
                # Resolve to first available variant
                variant = frappe.db.get_value("Item", {"variant_of": item_code, "disabled": 0}, "name", order_by="creation asc")
                if variant:
                    item_code = variant
                    # Optionally fetch variant price if template price is zero
                    if not rate:
                        rate = frappe.db.get_value("Item Price", {"item_code": item_code, "selling": 1, "price_list": "Standard Selling"}, "price_list_rate")

        doc.append("items", {
            "item_code": item_code,
            "qty": item.get("qty"),
            "rate": rate
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


@frappe.whitelist(allow_guest=True)
def place_order(**kwargs):
    """Place an order for Guest or Logged-in users."""
    user = frappe.session.user
    
    phone = kwargs.get("phone")
    first_name = kwargs.get("first_name")
    last_name = kwargs.get("last_name")

    if user == "Guest" and not phone:
        return {"status": "error", "message": "Phone number is required for guest checkout"}

    customer = _get_or_create_customer(phone, first_name, last_name)
    if not customer:
        return {"status": "error", "message": "Could not identify or create customer"}

    # Update or create Address
    address_name = _update_address(customer, kwargs)

    # For Guest, create SO directly from cart_items
    if user == "Guest":
        cart_items = kwargs.get("cart_items")
        if isinstance(cart_items, str):
            cart_items = json.loads(cart_items)
            
        if not cart_items:
            return {"status": "error", "message": "Cart is empty"}
            
        so = frappe.new_doc("Sales Order")
        so.customer = customer
        so.transaction_date = frappe.utils.today()
        so.delivery_date = frappe.utils.add_days(frappe.utils.today(), 3)
        
        company = frappe.db.get_default("company")
        if not company:
            company = frappe.get_all("Company", limit=1)[0].name
        so.company = company
        
        for item in cart_items:
            item_code = item.get("name")
            # Resolve variant if template
            has_variants = frappe.db.get_value("Item", item_code, "has_variants")
            if has_variants:
                variant_of = frappe.db.get_value("Item", item_code, "variant_of")
                if not variant_of:
                    v = frappe.db.get_value("Item", {"variant_of": item_code, "disabled": 0}, "name")
                    if v: item_code = v
                
            so.append("items", {
                "item_code": item_code,
                "qty": item.get("qty"),
                "rate": item.get("price") or frappe.db.get_value("Item Price", {"item_code": item_code, "selling": 1, "price_list": "Standard Selling"}, "price_list_rate"),
                "delivery_date": so.delivery_date
            })
        
        so.customer_address = address_name
        
        # Apply Shipping Rule
        shipping_area = kwargs.get("shipping_area")
        ecom_settings = frappe.get_cached_doc("Ecommerce Settings")
        shipping_rule = None
        if shipping_area == "Inside City":
            shipping_rule = ecom_settings.inside_city_shipping_rule
        elif shipping_area == "Outside City":
            shipping_rule = ecom_settings.outside_city_shipping_rule
            
        if shipping_rule:
            so.shipping_rule = shipping_rule
            so.run_method("apply_shipping_rule")
            
        so.insert(ignore_permissions=True)
        so.submit()
        frappe.db.commit()
        return {"status": "ok", "order_id": so.name}

    else:
        # Logged-in user logic (Quotation based)
        # Sync cart one last time (just in case)
        if kwargs.get("cart_items"):
            sync_cart(kwargs.get("cart_items"))

        quotation_name = frappe.db.get_value("Quotation",
            {"party_name": customer, "status": "Draft", "docstatus": 0},
            "name", order_by="creation desc")

        if not quotation_name:
            return {"status": "error", "message": "No active cart found"}

        quotation = frappe.get_doc("Quotation", quotation_name)
        quotation.submit()

        from erpnext.selling.doctype.quotation.quotation import make_sales_order
        so = make_sales_order(quotation_name)
        so.customer_address = address_name
        so.delivery_date = frappe.utils.add_days(frappe.utils.today(), 3)
        
        # Apply Shipping Rule
        shipping_area = kwargs.get("shipping_area")
        ecom_settings = frappe.get_cached_doc("Ecommerce Settings")
        shipping_rule = None
        if shipping_area == "Inside City":
            shipping_rule = ecom_settings.inside_city_shipping_rule
        elif shipping_area == "Outside City":
            shipping_rule = ecom_settings.outside_city_shipping_rule
            
        if shipping_rule:
            so.shipping_rule = shipping_rule
            so.run_method("apply_shipping_rule")
        
        so.save(ignore_permissions=True)
        so.submit()
        
        frappe.db.set_value("Quotation", quotation_name, "status", "Ordered")
        frappe.db.commit()
        return {"status": "ok", "order_id": so.name}


def _update_address(customer, data):
    """Create or update an address for the customer."""
    first_name = data.get('first_name') or "Guest"
    last_name = data.get('last_name') or ""
    full_name = f"{first_name} {last_name}".strip()
    
    # Check for existing address for this customer specifically
    existing_address = frappe.db.sql("""
        SELECT parent FROM `tabDynamic Link` 
        WHERE link_doctype='Customer' AND link_name=%s AND parenttype='Address'
        LIMIT 1
    """, customer)

    if existing_address:
        address_name = existing_address[0][0]
        # Update existing address with new details if provided
        addr = frappe.get_doc("Address", address_name)
        addr.address_line1 = data.get("address_line1") or addr.address_line1
        addr.address_line2 = data.get("address_line2") or addr.address_line2
        addr.city = data.get("city") or addr.city
        addr.phone = data.get("phone") or addr.phone
        addr.save(ignore_permissions=True)
        return address_name
        
    # Create new address
    addr = frappe.new_doc("Address")
    addr.address_title = full_name
    addr.address_line1 = data.get("address_line1")
    addr.address_line2 = data.get("address_line2")
    addr.city = data.get("city")
    addr.phone = data.get("phone")
    addr.address_type = "Shipping"
    addr.country = "Bangladesh"
    
    addr.append("links", {
        "link_doctype": "Customer",
        "link_name": customer
    })
    addr.insert(ignore_permissions=True)
    return addr.name

@frappe.whitelist(allow_guest=True)
def calculate_shipping(shipping_area, cart_items):
    """Calculate shipping amount based on area and items."""
    if isinstance(cart_items, str):
        cart_items = json.loads(cart_items)
        
    if not cart_items:
        return {"amount": 0}

    ecom_settings = frappe.get_cached_doc("Ecommerce Settings")
    shipping_rule = None
    if shipping_area == "Inside City":
        shipping_rule = ecom_settings.inside_city_shipping_rule
    elif shipping_area == "Outside City":
        shipping_rule = ecom_settings.outside_city_shipping_rule
        
    if not shipping_rule:
        return {"amount": 0}

    # Create a dummy Sales Order to calculate charges
    so = frappe.new_doc("Sales Order")
    company = frappe.db.get_default("company")
    if not company: company = frappe.get_all("Company", limit=1)[0].name
    so.company = company
    
    # Try to find a dummy customer or use any
    customer = frappe.db.get_value("Customer", {}, "name")
    if not customer: return {"amount": 0}
    so.customer = customer
    
    for item in cart_items:
        so.append("items", {
            "item_code": item.get("name"),
            "qty": item.get("qty"),
            "rate": item.get("price") or 0,
            "delivery_date": frappe.utils.today()
        })
    
    so.shipping_rule = shipping_rule
    try:
        so.run_method("apply_shipping_rule")
    except Exception:
        pass
        
    shipping_amount = 0
    # Usually shipping rule adds a tax with description = shipping_rule
    for tax in so.get("taxes"):
        if tax.description == shipping_rule or "Shipping" in (tax.description or ""):
            shipping_amount = tax.tax_amount
            break
            
    if shipping_amount == 0 and so.taxes:
        shipping_amount = sum(t.tax_amount for t in so.taxes)

    return {"amount": shipping_amount}
