import frappe

def sync_template_to_variants(doc, method=None):
    """Sync image and item group from template to variants."""
    if doc.has_variants:
        variants = frappe.get_all("Item", filters={"variant_of": doc.name}, fields=["name"])
        for v in variants:
            v_doc = frappe.get_doc("Item", v.name)

            updated = False
            if not v_doc.image or v_doc.image == doc.get_db_value("image"):
                v_doc.image = doc.image
                updated = True
            
            if v_doc.item_group != doc.item_group:
                v_doc.item_group = doc.item_group
                updated = True
                
            if updated:
                v_doc.db_update()
    
    elif doc.variant_of:
        # This is a variant. If it's new or missing info, pull from template.
        template = frappe.get_doc("Item", doc.variant_of)
        if not doc.image:
            doc.image = template.image
        if not doc.item_group:
            doc.item_group = template.item_group
