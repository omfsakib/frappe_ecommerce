frappe.pages['order-manager'].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Order Manager', single_column: true });
	new OrderManager(wrapper);
};

class OrderManager {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.orders = [];
		this.filter = 'All';
		this.inject_styles();
		this.build_layout();
		this.load_orders();
	}

	inject_styles() {
		if (document.getElementById('om-styles')) return;
		const s = document.createElement('style');
		s.id = 'om-styles';
		s.textContent = `
:root, [data-theme="light"] {
	--om-bg:#f8f9fa;
	--om-surface:#ffffff;
	--om-border:#e2e8f0;
	--om-accent:#c8a97e;
	--om-accent2:#b6956b;
	--om-text:#1e293b;
	--om-muted:#64748b;
	--om-green:#10b981;
	--om-blue:#3b82f6;
	--om-orange:#f59e0b;
}

[data-theme="dark"] {
	--om-bg:#0f0f0f;
	--om-surface:#181818;
	--om-border:#2a2a2a;
	--om-accent:#c8a97e;
	--om-text:#f0ece6;
	--om-muted:#888;
}

#om-root { font-family:'Inter', sans-serif; background:var(--om-bg); color:var(--om-text); height:calc(100vh - 46px); display:flex; flex-direction:column; overflow:hidden; }
#om-topbar { display:flex; align-items:center; gap:12px; padding:20px 28px; border-bottom:1px solid var(--om-border); }
#om-topbar h2 { font-family:'Playfair Display', serif; font-size:22px; color:var(--om-accent); margin-right:auto; }

.om-filter-btn { padding:7px 18px; border:1px solid var(--om-border); background:none; color:var(--om-muted); font-size:11px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all .2s; }
.om-filter-btn.active, .om-filter-btn:hover { border-color:var(--om-accent); color:var(--om-accent); background:rgba(200,169,126,0.08); }

#om-body { flex:1; overflow-y:auto; padding:24px 28px; }
.om-table-card { background:var(--om-surface); border:1px solid var(--om-border); border-radius:4px; overflow:hidden; }
.om-table { width:100%; border-collapse:collapse; text-align:left; }
.om-table th { padding:14px 20px; font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--om-muted); border-bottom:1px solid var(--om-border); font-weight:600; }
.om-table td { padding:16px 20px; font-size:13px; border-bottom:1px solid var(--om-border); vertical-align:middle; }
.om-table tr:last-child td { border-bottom:none; }
.om-table tr:hover { background:rgba(200,169,126,0.02); }

.om-badge { padding:4px 10px; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:2px; }
.om-badge-Draft { background:rgba(100,116,139,0.1); color:var(--om-muted); }
.om-badge-To-Deliver { background:rgba(245,158,11,0.1); color:var(--om-orange); }
.om-badge-Completed { background:rgba(16,185,129,0.1); color:var(--om-green); }
.om-badge-Cancelled { background:rgba(239,68,68,0.1); color:#ef4444; }

.om-btn-view { background:none; border:1px solid var(--om-border); color:var(--om-text); padding:6px 12px; font-size:11px; cursor:pointer; transition:all .2s; }
.om-btn-view:hover { border-color:var(--om-accent); color:var(--om-accent); }

/* Order Detail Drawer */
#om-drawer { width:500px; height:100%; background:var(--om-surface); border-left:1px solid var(--om-border); position:absolute; top:0; right:0; transform:translateX(100%); transition:transform .3s ease, visibility .3s; z-index:1000; box-shadow:-10px 0 30px rgba(0,0,0,0.1); display:flex; flex-direction:column; visibility:hidden; }
#om-drawer.open { transform:translateX(0); visibility:visible; }
#om-drawer-head { padding:20px 24px; border-bottom:1px solid var(--om-border); display:flex; justify-content:space-between; align-items:center; }
#om-drawer-body { flex:1; overflow-y:auto; padding:24px; }
#om-drawer-foot { padding:16px 24px; border-top:1px solid var(--om-border); display:flex; gap:10px; }

.om-item-row { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
.om-item-img { width:48px; height:60px; object-fit:cover; background:var(--om-bg); }
.om-item-info { flex:1; }
.om-item-name { font-size:13px; font-weight:500; }
.om-item-meta { font-size:11px; color:var(--om-muted); }
.om-summary-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; }
.om-summary-total { border-top:1px dashed var(--om-border); padding-top:12px; margin-top:12px; font-weight:700; font-size:16px; color:var(--om-accent); }

/* Dropdown */
.om-dropdown { position:relative; display:inline-block; flex:1; }
.om-dropdown-content { 
  display:none; position:absolute; bottom:100%; left:0; right:0; 
  background:var(--om-surface); border:1px solid var(--om-border); 
  box-shadow:0 -5px 20px rgba(0,0,0,0.1); z-index:10; margin-bottom:8px;
}
.om-dropdown.open .om-dropdown-content { display:block; }
.om-dropdown-item { 
  width:100%; padding:12px 16px; border:none; background:none; 
  text-align:left; font-size:11px; text-transform:uppercase; 
  letter-spacing:1px; cursor:pointer; color:var(--om-text);
  border-bottom:1px solid var(--om-border); transition:background .2s;
}
.om-dropdown-item:last-child { border-bottom:none; }
.om-dropdown-item:hover { background:rgba(200,169,126,0.1); color:var(--om-accent); }

.om-btn-primary { width:100%; padding:12px; background:var(--om-accent); color:#000; border:none; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
.om-btn-secondary { padding:12px 20px; border:1px solid var(--om-border); background:none; color:var(--om-text); font-size:11px; cursor:pointer; }

@media (max-width: 768px) {
    #om-topbar { padding: 12px 16px; gap: 12px; }
    #om-topbar h2 { font-size: 18px; }
    #om-filters { gap: 4px; }
    .om-filter-btn { padding: 5px 10px; font-size: 9px; }
    
    #om-body { padding: 12px; }
    .om-table thead { display: none; }
    .om-table tr { 
        display: grid; 
        grid-template-columns: 1fr auto; 
        grid-template-areas: "id status" "cust total" "action action";
        padding: 12px 16px; 
        gap: 4px;
        border-bottom: 1px solid var(--om-border);
    }
    .om-table td { display: block; padding: 0 !important; border: none !important; }
    .om-table td::before { display: none; }
    
    .om-table td[data-label="Order ID"] { grid-area: id; font-size: 13px; font-weight: 700; color: var(--om-text); }
    .om-table td[data-label="Status"] { grid-area: status; text-align: right; }
    .om-table td[data-label="Customer"] { grid-area: cust; font-size: 12px; color: var(--om-muted); }
    .om-table td[data-label="Total"] { grid-area: total; text-align: right; font-weight: 700; color: var(--om-accent); font-size: 13px; }
    .om-table td[data-label="Action"] { grid-area: action; margin-top: 8px; }
    .om-table td[data-label="Date"] { display: none; }
    
    .om-btn-view { width: 100%; padding: 8px; background: var(--om-accent); color: #000; border: none; font-weight: 700; }
    
    #om-drawer { width: 100%; border-left: none; }
}
`;
		document.head.appendChild(s);
	}

	build_layout() {
		const page = this.wrapper.querySelector('.page-content') || this.wrapper;
		page.style.overflow = 'hidden';
		page.style.position = 'relative';
		page.innerHTML = `
<div id="om-root">
  <div id="om-topbar">
    <h2>Order Manager</h2>
    <div id="om-filters">
      <button class="om-filter-btn active" data-status="All">All</button>
      <button class="om-filter-btn" data-status="To Deliver">To Deliver</button>
      <button class="om-filter-btn" data-status="Completed">Completed</button>
      <button class="om-filter-btn" data-status="Cancelled">Cancelled</button>
    </div>
  </div>
  <div id="om-body">
    <div class="om-table-card">
      <table class="om-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="om-table-body">
          <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--om-muted);">Loading orders...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="om-drawer">
    <div id="om-drawer-head">
      <h3 id="om-order-id">#Order</h3>
      <button style="background:none; border:none; color:var(--om-muted); font-size:20px; cursor:pointer;" onclick="document.getElementById('om-drawer').classList.remove('open')">✕</button>
    </div>
    <div id="om-drawer-body"></div>
    <div id="om-drawer-foot"></div>
  </div>
</div>`;

		this.wrapper.querySelectorAll('.om-filter-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				this.wrapper.querySelectorAll('.om-filter-btn').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				this.filter = btn.dataset.status;
				this.load_orders();
			});
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.om-dropdown')) {
				document.querySelectorAll('.om-dropdown').forEach(d => d.classList.remove('open'));
			}
		});
	}

	load_orders() {
		frappe.call({
			method: 'frappe_ecommerce.api.orders.get_orders',
			args: { status: this.filter },
			callback: (r) => {
				this.orders = r.message || [];
				this.render_orders();
			}
		});
	}

	render_orders() {
		const tbody = document.getElementById('om-table-body');
		if (!this.orders.length) {
			tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--om-muted);">No orders found</td></tr>`;
			return;
		}

		tbody.innerHTML = this.orders.map(o => {
			const statusClass = o.status.replace(/ /g, '-');
			return `
<tr>
  <td data-label="Order ID" style="font-weight:600;">${o.name}</td>
  <td data-label="Customer">
    <div style="font-weight:500;">${o.customer_name}</div>
    <div style="font-size:11px; color:var(--om-muted);">${o.customer}</div>
  </td>
  <td data-label="Date">${frappe.datetime.str_to_user(o.transaction_date)}</td>
  <td data-label="Total" style="font-weight:700; color:var(--om-accent);">৳${o.grand_total.toLocaleString()}</td>
  <td data-label="Status"><span class="om-badge om-badge-${statusClass}">${o.status}</span></td>
  <td data-label="Action"><button class="om-btn-view" onclick="window._om.view_order('${o.name}')">View Details</button></td>
</tr>`;
		}).join('');
		window._om = this;
	}

	view_order(name) {
		frappe.call({
			method: 'frappe_ecommerce.api.orders.get_order_details',
			args: { name },
			callback: (r) => {
				const o = r.message;
				this.render_order_details(o);
				document.getElementById('om-drawer').classList.add('open');
			}
		});
	}

	render_order_details(o) {
		document.getElementById('om-order-id').textContent = o.name;
		const body = document.getElementById('om-drawer-body');
		const foot = document.getElementById('om-drawer-foot');

		body.innerHTML = `
<div style="margin-bottom:32px;">
  <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--om-muted); margin-bottom:8px;">Customer Info</div>
  <div style="font-size:15px; font-weight:600; margin-bottom:4px;">${o.customer_name}</div>
  <div style="font-size:13px; color:var(--om-muted);">${o.contact_email || ''}</div>
  <div style="font-size:13px; color:var(--om-muted);">${o.contact_mobile || ''}</div>
</div>

<div style="margin-bottom:32px;">
  <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--om-muted); margin-bottom:8px;">Shipping Address</div>
  <div style="font-size:13px; line-height:1.6; white-space:pre-wrap;">${o.address_display || 'No address provided'}</div>
</div>

<div style="margin-bottom:32px;">
  <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--om-muted); margin-bottom:12px;">Order Items</div>
  ${o.items.map(item => `
    <div class="om-item-row">
      <img src="${item.image || ''}" class="om-item-img" />
      <div class="om-item-info">
        <div class="om-item-name">${item.item_name}</div>
        <div class="om-item-meta">${item.item_code} × ${item.qty}</div>
      </div>
      <div style="font-weight:600;">৳${item.amount.toLocaleString()}</div>
    </div>
  `).join('')}
</div>

<div class="om-summary">
  <div class="om-summary-row"><span>Subtotal</span><span>৳${o.total.toLocaleString()}</span></div>
  <div class="om-summary-row"><span>Taxes</span><span>৳${(o.total_taxes_and_charges || 0).toLocaleString()}</span></div>
  <div class="om-summary-row om-summary-total"><span>Total</span><span>৳${o.grand_total.toLocaleString()}</span></div>
</div>
`;

		let actionButtons = ``;
		const canDeliver = ['To Deliver and Bill', 'To Deliver'].includes(o.status);
		const canBill = ['To Deliver and Bill', 'To Bill'].includes(o.status);
		const canPay = o.status !== 'Cancelled' && o.status !== 'Completed';

		if (canDeliver || canBill || canPay) {
			actionButtons += `
<div class="om-dropdown" id="om-actions-dropdown">
  <button class="om-btn-primary" onclick="this.parentElement.classList.toggle('open')">
    Actions <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
  </button>
  <div class="om-dropdown-content">
    ${canDeliver ? `<button class="om-dropdown-item" onclick="window._om.update_status('${o.name}', 'Delivery Note')">Mark As Delivered</button>` : ''}
    ${canBill ? `<button class="om-dropdown-item" onclick="window._om.update_status('${o.name}', 'Sales Invoice')">Mark As Billed</button>` : ''}
    ${canPay ? `<button class="om-dropdown-item" onclick="window._om.open_payment_dialog('${o.name}', ${o.grand_total})">Mark As Paid</button>` : ''}
  </div>
</div>`;
		}

		if (o.status !== 'Cancelled' && o.status !== 'Completed') {
			actionButtons += `<button class="om-btn-secondary" onclick="window._om.update_status('${o.name}', 'Cancel')">Cancel</button>`;
		}

		foot.innerHTML = actionButtons;
	}

	open_payment_dialog(name, total) {
		frappe.call({
			method: 'frappe_ecommerce.api.orders.get_payment_modes',
			callback: (r) => {
				const modes = r.message || [];
				const d = new frappe.ui.Dialog({
					title: 'Mark As Paid',
					fields: [
						{ label: 'Amount', fieldname: 'amount', fieldtype: 'Currency', default: total, reqd: 1 },
						{ label: 'Mode of Payment', fieldname: 'mode_of_payment', fieldtype: 'Select', options: modes.map(m => m.name), reqd: 1 }
					],
					primary_action_label: 'Submit Payment',
					primary_action: (values) => {
						this.update_status(name, 'Payment Entry', values);
						d.hide();
					}
				});
				d.show();
			}
		});
	}

	update_status(name, action, extra = {}) {
		frappe.call({
			method: 'frappe_ecommerce.api.orders.update_order_status',
			args: { name, action, ...extra },
			callback: (r) => {
				if (r.message && r.message.status === 'ok') {
					frappe.show_alert({ message: `Action '${action}' completed: ${r.message.doc}`, indicator: 'green' });
					document.getElementById('om-drawer').classList.remove('open');
					this.load_orders();
				} else {
					frappe.msgprint(r.message ? r.message.message : 'Action failed');
				}
			}
		});
	}
}
