import frappe
import json

@frappe.whitelist()
def get_orders(status="All"):
    """Fetch Sales Orders with basic details."""
    filters = {}
    if status != "All":
        if status == "To Deliver":
            filters["status"] = ["in", ["To Deliver and Bill", "To Deliver"]]
        else:
            filters["status"] = status
            
    orders = frappe.get_all("Sales Order",
        filters=filters,
        fields=["name", "customer_name", "customer", "transaction_date", "grand_total", "status"],
        order_by="creation desc"
    )
    return orders

@frappe.whitelist()
def get_order_details(name):
    """Fetch full details of a single Sales Order."""
    doc = frappe.get_doc("Sales Order", name)
    
    # Enrich items with images
    for item in doc.items:
        item.image = frappe.db.get_value("Item", item.item_code, "image")
        
    res = doc.as_dict()
    
    # Add address display
    if doc.customer_address:
        res["address_display"] = frappe.get_doc("Address", doc.customer_address).get_display()
        
    return res

@frappe.whitelist()
def update_order_status(name, action, **kwargs):
    """Handle complex order actions."""
    if action == "Delivery Note":
        from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note
        dn = make_delivery_note(name)
        dn.insert(ignore_permissions=True)
        dn.submit()
        return {"status": "ok", "doc": dn.name}

    elif action == "Sales Invoice":
        from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice
        si = make_sales_invoice(name)
        si.set_advances()
        si.insert(ignore_permissions=True)
        si.submit()
        return {"status": "ok", "doc": si.name}

    elif action == "Payment Entry":
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
        
        # Check if there is a Sales Invoice first
        invoice = frappe.db.get_value("Sales Invoice Item", {"sales_order": name}, "parent")
        dt = "Sales Invoice" if invoice else "Sales Order"
        dn = invoice if invoice else name
        
        pe = get_payment_entry(dt, dn, 
            bank_account=kwargs.get("bank_account"),
            payment_type="Receive"
        )
        amount = frappe.utils.flt(kwargs.get("amount"))
        pe.paid_amount = amount
        pe.received_amount = amount
        pe.mode_of_payment = kwargs.get("mode_of_payment")
        pe.reference_no = f"ECOM-{name}"
        pe.reference_date = frappe.utils.today()
        
        pe.insert(ignore_permissions=True)
        pe.submit()
        return {"status": "ok", "doc": pe.name}
    
    elif action == "Cancel":
        doc = frappe.get_doc("Sales Order", name)
        if doc.docstatus == 1:
            doc.cancel()
        else:
            doc.delete()
        frappe.db.commit()
        return {"status": "ok"}
            
    return {"status": "error", "message": "Action not supported"}

@frappe.whitelist()
def get_payment_modes():
    """Return available modes of payment."""
    return frappe.get_all("Mode of Payment", fields=["name"])
