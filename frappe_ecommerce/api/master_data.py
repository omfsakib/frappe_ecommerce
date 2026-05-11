import frappe
import json

@frappe.whitelist()
def get_categories():
    return frappe.get_all(
        "Item Group",
        filters={"custom_is_ecommerce_category": 1},
        fields=["name", "item_group_name", "image"],
        order_by="name asc"
    )

@frappe.whitelist()
def save_category(name, new_name, image=None):
    """Create or rename a category."""
    if name:
        if name != new_name:
            frappe.rename_doc("Item Group", name, new_name, ignore_permissions=True)
            doc = frappe.get_doc("Item Group", new_name)
            doc.item_group_name = new_name
            if image is not None:
                doc.image = image
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.get_doc("Item Group", name)
            if image is not None:
                doc.image = image
            doc.save(ignore_permissions=True)
        frappe.db.commit()
        return new_name
    else:
        if frappe.db.exists("Item Group", new_name):
            doc = frappe.get_doc("Item Group", new_name)
            doc.custom_is_ecommerce_category = 1
            if image is not None:
                doc.image = image
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Item Group")
            doc.item_group_name = new_name
            doc.parent_item_group = "All Item Groups"
            doc.custom_is_ecommerce_category = 1
            if image is not None:
                doc.image = image
            doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

@frappe.whitelist()
def delete_category(name):
    # Just uncheck the ecommerce flag instead of deleting the whole group to be safe
    doc = frappe.get_doc("Item Group", name)
    doc.custom_is_ecommerce_category = 0
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True

@frappe.whitelist()
def get_attributes():
    colors = []
    if frappe.db.exists("Item Attribute", "Color"):
        colors = frappe.get_all("Item Attribute Value", filters={"parent": "Color"}, fields=["name", "attribute_value", "custom_hex_code"], order_by="idx asc")
    
    sizes = []
    if frappe.db.exists("Item Attribute", "Size"):
        sizes = frappe.get_all("Item Attribute Value", filters={"parent": "Size"}, fields=["name", "attribute_value"], order_by="idx asc")
        
    return {"colors": colors, "sizes": sizes}

@frappe.whitelist()
def save_attribute(parent, value, hex_code=""):
    """Create or update an attribute value."""
    if not frappe.db.exists("Item Attribute", parent):
        doc = frappe.new_doc("Item Attribute")
        doc.attribute_name = parent
        doc.numeric_values = 0
        doc.insert(ignore_permissions=True)
        
    if not frappe.db.exists("Item Attribute Value", {"parent": parent, "attribute_value": value}):
        attr_doc = frappe.get_doc("Item Attribute", parent)
        abbr = str(value)
        existing_abbrs = [d.abbr for d in attr_doc.item_attribute_values if d.abbr]
        if abbr in existing_abbrs:
            abbr = f"{str(value)[:5]}-{frappe.generate_hash(length=4)}"
            
        attr_doc.append("item_attribute_values", {
            "attribute_value": value,
            "abbr": abbr,
            "custom_hex_code": hex_code
        })
        attr_doc.save(ignore_permissions=True)
    elif hex_code:
        val_name = frappe.db.get_value("Item Attribute Value", {"parent": parent, "attribute_value": value}, "name")
        if val_name:
            frappe.db.set_value("Item Attribute Value", val_name, "custom_hex_code", hex_code)
    frappe.db.commit()
    return True

@frappe.whitelist()
def delete_attribute(parent, value):
    val_name = frappe.db.get_value("Item Attribute Value", {"parent": parent, "attribute_value": value}, "name")
    if val_name:
        frappe.delete_doc("Item Attribute Value", val_name, force=1, ignore_permissions=True)
        frappe.db.commit()
    return True
