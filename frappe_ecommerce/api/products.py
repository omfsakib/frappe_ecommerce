import frappe
import json


def _ensure_item_group(group_name):
    if not frappe.db.exists("Item Group", group_name):
        doc = frappe.new_doc("Item Group")
        doc.item_group_name = group_name
        doc.parent_item_group = "All Item Groups"
        doc.insert(ignore_permissions=True)
        frappe.db.commit()


def _ensure_custom_fields():
    """Create custom fields on Item for colours, sizes, badge, discount."""
    needed = [
        {"fieldname": "custom_colors",             "label": "Colors (JSON)",          "fieldtype": "Small Text", "insert_after": "description"},
        {"fieldname": "custom_sizes",              "label": "Sizes (JSON)",           "fieldtype": "Small Text", "insert_after": "custom_colors"},
        {"fieldname": "custom_badge",              "label": "Badge",                  "fieldtype": "Data",       "insert_after": "standard_rate"},
        {"fieldname": "custom_discount_percentage","label": "Discount Percentage",    "fieldtype": "Percent",    "insert_after": "custom_badge"},
        {"fieldname": "variants_pricing",          "label": "Variants Pricing Cache", "fieldtype": "Code",       "insert_after": "custom_discount_percentage"},
    ]
    changed = False
    for f in needed:
        cf_name = "Item-" + f["fieldname"]
        if not frappe.db.exists("Custom Field", cf_name):
            cf = frappe.new_doc("Custom Field")
            cf.dt = "Item"
            cf.fieldname = f["fieldname"]
            cf.label = f["label"]
            cf.fieldtype = f["fieldtype"]
            cf.insert_after = f.get("insert_after", "")
            cf.insert(ignore_permissions=True)
            changed = True
    if changed:
        frappe.db.commit()

    changed_attr = False
    if not frappe.db.exists("Custom Field", "Item Attribute Value-custom_hex_code"):
        cf = frappe.new_doc("Custom Field")
        cf.dt = "Item Attribute Value"
        cf.fieldname = "custom_hex_code"
        cf.label = "Hex Code"
        cf.fieldtype = "Data"
        cf.insert_after = "attribute_value"
        cf.insert(ignore_permissions=True)
        changed_attr = True
    if changed_attr:
        frappe.db.commit()

def _ensure_item_attributes():
    """Create Color and Size Item Attributes if they don't exist."""
    changed = False
    for attr in ["Color", "Size"]:
        if not frappe.db.exists("Item Attribute", attr):
            doc = frappe.new_doc("Item Attribute")
            doc.attribute_name = attr
            doc.numeric_values = 0
            doc.insert(ignore_permissions=True)
            changed = True
    if changed:
        frappe.db.commit()


def _save_item_price(item_code, price):
    """Create or update Item Price in the Standard Selling price list."""
    existing = frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": "Standard Selling", "selling": 1},
        "name",
    )
    if existing:
        doc = frappe.get_doc("Item Price", existing)
        doc.price_list_rate = float(price or 0)
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.new_doc("Item Price")
        doc.item_code = item_code
        doc.price_list = "Standard Selling"
        doc.selling = 1
        doc.price_list_rate = float(price or 0)
        doc.insert(ignore_permissions=True)


def _save_pricing_rule(item_code, discount_percentage):
    """Create, update, or remove a Pricing Rule for item discount."""
    title = f"Ecommerce Discount - {item_code}"
    existing = frappe.db.get_value("Pricing Rule", {"title": title}, "name")

    discount = float(discount_percentage or 0)

    if discount == 0:
        # No discount — remove any existing rule
        if existing:
            frappe.delete_doc("Pricing Rule", existing, force=1, ignore_permissions=True)
        return

    if existing:
        doc = frappe.get_doc("Pricing Rule", existing)
        doc.discount_percentage = discount
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.new_doc("Pricing Rule")
        doc.title = title
        doc.apply_on = "Item Code"
        doc.price_or_product_discount = "Price"
        doc.rate_or_discount = "Discount Percentage"
        doc.discount_percentage = discount
        doc.selling = 1
        doc.append("items", {"item_code": item_code})
        doc.insert(ignore_permissions=True)


def _get_item_price(item_code):
    return frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": "Standard Selling", "selling": 1},
        "price_list_rate",
    ) or 0


def _get_item_prices_bulk(item_codes):
    """Return {item_code: price_list_rate} for a list of item codes."""
    if not item_codes:
        return {}
    rows = frappe.get_all(
        "Item Price",
        filters={"item_code": ["in", item_codes], "selling": 1, "price_list": "Standard Selling"},
        fields=["item_code", "price_list_rate"],
    )
    return {r["item_code"]: r["price_list_rate"] for r in rows}


@frappe.whitelist()
def bootstrap():
    """Called once when the page loads — ensure custom fields exist."""
    _ensure_custom_fields()
    _ensure_item_attributes()
    return {"status": "ok"}


@frappe.whitelist()
def get_item_groups():
    """Return Item Groups where custom_is_ecommerce_category is checked."""
    groups = frappe.get_all(
        "Item Group",
        filters={"custom_is_ecommerce_category": 1},
        fields=["name"],
        order_by="name asc",
    )
    return [g["name"] for g in groups]

@frappe.whitelist()
def get_item_attributes():
    """Return existing Colors (with hex) and Sizes."""
    if not frappe.db.exists("Item Attribute", "Color"):
        colors = []
    else:
        colors = frappe.get_all("Item Attribute Value", filters={"parent": "Color"}, fields=["attribute_value", "custom_hex_code"])
        
    if not frappe.db.exists("Item Attribute", "Size"):
        sizes = []
    else:
        sizes = frappe.get_all("Item Attribute Value", filters={"parent": "Size"}, fields=["attribute_value"])
        
    return {"colors": colors, "sizes": sizes}


@frappe.whitelist()
def get_products(category=None):
    _ensure_custom_fields()
    if category and category != "All":
        filters = {"item_group": category, "variant_of": ["is", "not set"]}
    else:
        filters = {"variant_of": ["is", "not set"]}

    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=[
            "name", "item_name", "item_group", "description",
            "image", "disabled",
            "custom_colors", "custom_sizes", "custom_badge",
            "custom_discount_percentage",
        ],
        order_by="creation desc",
    )

    if items:
        price_map = _get_item_prices_bulk([i["name"] for i in items])
        for item in items:
            item["price"] = price_map.get(item["name"], 0)

    return items


@frappe.whitelist()
def get_product(name):
    _ensure_custom_fields()
    doc = frappe.get_doc("Item", name)
    return {
        "name":                     doc.name,
        "item_name":                doc.item_name,
        "item_group":               doc.item_group,
        "description":              doc.description or "",
        "price":                    _get_item_price(doc.name),
        "image":                    doc.image or "",
        "disabled":                 doc.disabled,
        "custom_colors":            doc.get("custom_colors") or "[]",
        "custom_sizes":             doc.get("custom_sizes") or "[]",
        "custom_badge":             doc.get("custom_badge") or "",
        "custom_discount_percentage": doc.get("custom_discount_percentage") or 0,
        "variants_pricing":         doc.get("variants_pricing") or "{}",
    }


def _ensure_item_attribute_value(attribute, value, hex_code=None):
    if not value:
        return
    if not frappe.db.exists("Item Attribute Value", {"parent": attribute, "attribute_value": value}):
        attr_doc = frappe.get_doc("Item Attribute", attribute)
        
        abbr = str(value)
        existing_abbrs = [d.abbr for d in attr_doc.item_attribute_values if d.abbr]
        if abbr in existing_abbrs:
            abbr = f"{str(value)[:5]}-{frappe.generate_hash(length=4)}"
            
        attr_doc.append("item_attribute_values", {
            "attribute_value": value,
            "abbr": abbr,
            "custom_hex_code": hex_code or ""
        })
        attr_doc.save(ignore_permissions=True)
    elif hex_code:
        # Update existing hex code
        val_name = frappe.db.get_value("Item Attribute Value", {"parent": attribute, "attribute_value": value}, "name")
        if val_name:
            frappe.db.set_value("Item Attribute Value", val_name, "custom_hex_code", hex_code)


def _sync_variants(template_doc, colors_data, sizes_data, pricing_data):
    """Generate variants and apply pricing."""
    if not colors_data and not sizes_data:
        return

    # Ensure Attribute Values exist
    color_names = []
    for c in colors_data:
        _ensure_item_attribute_value("Color", c.get("name"), c.get("hex"))
        if c.get("name"): color_names.append(c["name"])

    size_names = []
    for s in sizes_data:
        _ensure_item_attribute_value("Size", s.get("label"))
        if s.get("label"): size_names.append(s["label"])

    # Attach attributes to template
    existing_attrs = [d.attribute for d in template_doc.get("attributes", [])]
    if color_names and "Color" not in existing_attrs:
        template_doc.append("attributes", {"attribute": "Color"})
    if size_names and "Size" not in existing_attrs:
        template_doc.append("attributes", {"attribute": "Size"})

    if not template_doc.has_variants:
        template_doc.has_variants = 1

    template_doc.save(ignore_permissions=True)

    # Generate or sync variants
    from erpnext.controllers.item_variant import create_variant, get_variant

    if not color_names: color_names = [""]
    if not size_names: size_names = [""]

    for c in color_names:
        for s in size_names:
            if not c and not s: continue
            
            key = "-".join(filter(None, [c, s]))
            pricing = pricing_data.get(key, {})
            price = pricing.get("price", 0)
            discount = pricing.get("discount", 0)

            args = {}
            if c: args["Color"] = c
            if s: args["Size"] = s

            # Find existing variant
            variant_name = get_variant(template_doc.name, args)

            if not variant_name:
                variant_doc = create_variant(template_doc.name, args)
                opening_stock = pricing.get("opening_stock")
                if opening_stock:
                    try:
                        variant_doc.opening_stock = float(opening_stock)
                        company = frappe.defaults.get_user_default("Company")
                        if company:
                            # Try to set a default warehouse if needed for opening stock
                            wh = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0}, "name")
                            if wh: variant_doc.default_warehouse = wh
                    except Exception:
                        pass

                variant_doc.insert(ignore_permissions=True)
                variant_name = variant_doc.name
            
            pricing["saved"] = True

            _save_item_price(variant_name, price)
            _save_pricing_rule(variant_name, discount)


@frappe.whitelist()
def save_product(data):
    _ensure_custom_fields()
    if isinstance(data, str):
        data = json.loads(data)

    is_new = not data.get("name") or not frappe.db.exists("Item", data.get("name"))

    if is_new:
        doc = frappe.new_doc("Item")
        raw = data.get("item_name", "New Item")
        doc.item_code = raw.upper().replace(" ", "-")[:140]
    else:
        doc = frappe.get_doc("Item", data["name"])

    doc.item_name    = data.get("item_name", doc.item_name)
    doc.item_group   = data.get("item_group") or "All Item Groups"
    doc.description  = data.get("description", "")
    doc.image        = data.get("image", "")
    doc.stock_uom    = "Nos"
    doc.is_stock_item = 0

    doc.custom_colors             = data.get("custom_colors", "[]")
    doc.custom_sizes              = data.get("custom_sizes", "[]")
    doc.custom_badge              = data.get("custom_badge", "")
    doc.custom_discount_percentage = float(data.get("custom_discount_percentage") or 0)
    doc.variants_pricing          = data.get("variants_pricing", "{}")

    if is_new:
        doc.insert(ignore_permissions=True)
    else:
        doc.save(ignore_permissions=True)

    try:
        colors_data = json.loads(doc.custom_colors) if doc.custom_colors else []
        sizes_data = json.loads(doc.custom_sizes) if doc.custom_sizes else []
        pricing_data = json.loads(doc.variants_pricing) if doc.variants_pricing else {}
    except:
        colors_data, sizes_data, pricing_data = [], [], {}

    if colors_data or sizes_data:
        # Sync variants
        _sync_variants(doc, colors_data, sizes_data, pricing_data)
        doc.db_set("variants_pricing", json.dumps(pricing_data))
    else:
        # Save directly to item
        _save_item_price(doc.name, data.get("price") or 0)
        _save_pricing_rule(doc.name, data.get("custom_discount_percentage") or 0)

    frappe.db.commit()
    return doc.name


@frappe.whitelist()
def delete_product(name):
    # Clean up related docs first
    price_name = frappe.db.get_value(
        "Item Price",
        {"item_code": name, "price_list": "Standard Selling", "selling": 1},
        "name",
    )
    if price_name:
        frappe.delete_doc("Item Price", price_name, force=1, ignore_permissions=True)

    rule_title = f"Ecommerce Discount - {name}"
    rule_name = frappe.db.get_value("Pricing Rule", {"title": rule_title}, "name")
    if rule_name:
        frappe.delete_doc("Pricing Rule", rule_name, force=1, ignore_permissions=True)

    frappe.delete_doc("Item", name, force=1, ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist()
def toggle_product_status(name):
    doc = frappe.get_doc("Item", name)
    doc.disabled = 0 if doc.disabled else 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"disabled": doc.disabled}
