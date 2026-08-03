frappe.pages['product-manager'].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Product Manager', single_column: true });
	new ProductManager(wrapper);
};

class ProductManager {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.current = null;
		this.products = [];
		this.inject_styles();
		this.build_layout();
		this.bootstrap();
	}

	inject_styles() {
		if (document.getElementById('pm-styles')) return;
		const s = document.createElement('style');
		s.id = 'pm-styles';
		s.textContent = `
:root, [data-theme="light"] {
	--pm-bg:#f8f9fa;
	--pm-surface:#ffffff;
	--pm-card:#ffffff;
	--pm-border:#e2e8f0;
	--pm-accent:#c8a97e;
	--pm-accent2:#b6956b;
	--pm-text:#1e293b;
	--pm-muted:#64748b;
	--pm-danger:#ef4444;
	--pm-green:#10b981;
}

[data-theme="dark"] {
	--pm-bg:#0f0f0f;
	--pm-surface:#181818;
	--pm-card:#1e1e1e;
	--pm-border:#2a2a2a;
	--pm-accent:#c8a97e;
	--pm-accent2:#e8c9a0;
	--pm-text:#f0ece6;
	--pm-muted:#888;
	--pm-danger:#e53935;
	--pm-green:#43a047;
}
#pm-root{font-family:'Inter',sans-serif;background:var(--pm-bg);color:var(--pm-text);height:calc(100vh - 46px);display:flex;flex-direction:column;overflow:hidden;position:relative;}
#pm-topbar{display:flex;align-items:center;gap:12px;padding:20px 28px 16px;border-bottom:1px solid var(--pm-border);flex-wrap:wrap;}
#pm-cat-filters{display:flex;gap:8px;flex-wrap:wrap;}
#pm-topbar h2{font-family:'Playfair Display',serif;font-size:22px;color:var(--pm-accent);margin-right:auto;}
.pm-cat-btn{padding:7px 18px;border:1px solid var(--pm-border);background:none;color:var(--pm-muted);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:all .2s;}
.pm-cat-btn.active,.pm-cat-btn:hover{border-color:var(--pm-accent);color:var(--pm-accent);background:rgba(200,169,126,.08);}
#pm-add-btn{display:flex;align-items:center;gap:6px;padding:9px 20px;background:var(--pm-accent);color:#000;border:none;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:background .2s;}
#pm-add-btn:hover{background:var(--pm-accent2);}
#pm-body{display:flex;flex:1;overflow:hidden;}
#pm-grid-wrap{flex:1;overflow-y:auto;padding:24px 28px;}
#pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}
.pm-card{background:var(--pm-card);border:1px solid var(--pm-border);cursor:pointer;transition:transform .25s,border-color .2s;position:relative;overflow:hidden;}
.pm-card:hover{transform:translateY(-3px);border-color:var(--pm-accent);}
.pm-card-img{width:100%;aspect-ratio:3/4;object-fit:cover;background:var(--pm-surface);display:block;transition:transform .4s;}
.pm-card:hover .pm-card-img{transform:scale(1.04);}
.pm-card-badge{position:absolute;top:10px;left:10px;padding:3px 8px;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--pm-accent);color:#000;}
.pm-card-dis{position:absolute;top:10px;right:10px;padding:3px 8px;font-size:9px;font-weight:700;letter-spacing:1px;background:var(--pm-border);color:var(--pm-muted);text-transform:uppercase;}
.pm-card-body{padding:12px 14px;}
.pm-card-cat{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--pm-accent);margin-bottom:4px;}
.pm-card-name{font-size:13px;font-weight:500;color:var(--pm-text);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pm-card-price{font-size:14px;font-weight:700;color:var(--pm-accent);}
.pm-card-oldp{font-size:11px;color:var(--pm-muted);text-decoration:line-through;margin-left:6px;}
.pm-card-swatches{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;}
.pm-swatch{width:14px;height:14px;border-radius:50%;border:1px solid var(--pm-border);}
.pm-card-sizes{font-size:10px;color:var(--pm-muted);margin-top:6px;}

/* DRAWER */
#pm-drawer{width:420px;height:100%;background:var(--pm-surface);border-left:1px solid var(--pm-border);display:flex;flex-direction:column;position:absolute;top:0;right:0;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1), visibility .3s;z-index:100;box-shadow:-10px 0 30px rgba(0,0,0,0.2);visibility:hidden;}
#pm-drawer.open{transform:translateX(0);visibility:visible;}
#pm-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--pm-border);flex-shrink:0;}
#pm-drawer-head h3{font-size:15px;font-weight:600;color:var(--pm-text);}
#pm-drawer-close{background:none;border:none;color:var(--pm-muted);font-size:20px;cursor:pointer;line-height:1;transition:color .2s;}
#pm-drawer-close:hover{color:var(--pm-text);}
#pm-drawer-tabs{display:flex;border-bottom:1px solid var(--pm-border);flex-shrink:0;}
.pm-tab{flex:1;padding:11px;text-align:center;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--pm-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;}
.pm-tab.active{color:var(--pm-accent);border-bottom-color:var(--pm-accent);}
#pm-drawer-body{flex:1;overflow-y:auto;padding:20px 22px;overscroll-behavior:contain;}
.pm-field{margin-bottom:18px;}
.pm-label{display:block;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--pm-muted);margin-bottom:7px;}
.pm-input,.pm-select,.pm-textarea{width:100%;background:var(--pm-card);border:1px solid var(--pm-border);color:var(--pm-text);padding:10px 12px;font-size:13px;font-family:'Inter',sans-serif;transition:border-color .2s;outline:none;border-radius:0;}
.pm-input:focus,.pm-select:focus,.pm-textarea:focus{border-color:var(--pm-accent);}
.pm-select option{background:var(--pm-card);}
.pm-textarea{min-height:80px;resize:vertical;}
.pm-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.pm-divider{border:none;border-top:1px solid var(--pm-border);margin:18px 0;}

/* Variants */
.pm-var-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.pm-var-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--pm-muted);}
.pm-add-var{background:none;border:1px solid var(--pm-border);color:var(--pm-accent);font-size:11px;padding:5px 12px;cursor:pointer;transition:all .2s;}
.pm-add-var:hover{background:rgba(200,169,126,.1);}
.pm-chip-list{display:flex;flex-wrap:wrap;gap:7px;min-height:36px;}
.pm-chip{display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--pm-card);border:1px solid var(--pm-border);font-size:11px;color:var(--pm-text);}
.pm-chip-del{background:none;border:none;color:var(--pm-muted);cursor:pointer;font-size:14px;line-height:1;padding:0;}
.pm-chip-del:hover{color:var(--pm-danger);}
.pm-color-row{display:flex;gap:8px;align-items:center;}
.pm-color-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--pm-border);flex-shrink:0;}
.pm-add-form{display:flex;gap:8px;margin-top:10px;align-items:flex-end;}
.pm-add-form .pm-input{flex:1;}
.pm-add-form input[type=color]{width:38px;height:38px;border:1px solid var(--pm-border);padding:2px;background:var(--pm-card);cursor:pointer;}
.pm-sm-btn{padding:9px 14px;background:var(--pm-accent);color:#000;border:none;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .2s;}
.pm-sm-btn:hover{background:var(--pm-accent2);}

/* Actions */
#pm-drawer-foot{padding:16px 22px;border-top:1px solid var(--pm-border);display:flex;gap:10px;flex-shrink:0;}
#pm-save-btn{flex:1;padding:12px;background:var(--pm-accent);color:#000;border:none;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:background .2s;}
#pm-save-btn:hover{background:var(--pm-accent2);}
#pm-del-btn{padding:12px 16px;border:1px solid var(--pm-danger);background:none;color:var(--pm-danger);font-size:11px;cursor:pointer;transition:all .2s;}
#pm-del-btn:hover{background:var(--pm-danger);color:#fff;}
#pm-toggle-btn{padding:12px 16px;border:1px solid var(--pm-border);background:none;color:var(--pm-muted);font-size:11px;cursor:pointer;transition:all .2s;}
#pm-toggle-btn:hover{border-color:var(--pm-accent);color:var(--pm-accent);}
.pm-empty{text-align:center;padding:60px 0;color:var(--pm-muted);font-size:14px;}
.pm-loading{text-align:center;padding:40px;color:var(--pm-muted);}
.pm-img-wrap{border:1px dashed var(--pm-border);padding:12px;display:flex;flex-direction:column;gap:10px;}
.pm-img-actions{display:flex;gap:8px;}
.pm-attach-btn{padding:7px 16px;background:var(--pm-accent);color:#000;border:none;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:1px;transition:background .2s;}
.pm-attach-btn:hover{background:var(--pm-accent2);}
.pm-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;width:100%;}
.pm-gallery-item{position:relative;aspect-ratio:1/1;border:1px solid var(--pm-border);overflow:hidden;background:var(--pm-bg);}
.pm-gallery-item img{width:100%;height:100%;object-fit:cover;display:block;}
.pm-gallery-item.is-cover{border-color:var(--pm-accent);}
.pm-gallery-cover-badge{position:absolute;bottom:0;left:0;right:0;padding:2px 4px;font-size:8px;letter-spacing:1px;text-transform:uppercase;text-align:center;background:var(--pm-accent);color:#000;font-weight:700;}
.pm-gallery-del{position:absolute;top:2px;right:2px;width:18px;height:18px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}
.pm-gallery-del:hover{background:var(--pm-danger);}
.pm-gallery-empty{color:var(--pm-muted);font-size:11px;padding:16px 0;text-align:center;width:100%;}
.pm-quill-override .frappe-control{margin-bottom:0 !important;}
.pm-quill-override .ql-editor{min-height:120px !important;background:var(--pm-card) !important;color:var(--pm-text) !important;font-size:13px !important;font-family:'Inter',sans-serif !important;border:1px solid var(--pm-border) !important;}
.pm-quill-override .ql-toolbar{background:var(--pm-card) !important;border:1px solid var(--pm-border) !important;border-bottom:none !important;}
.pm-quill-override .ql-container{border:none !important;background:var(--pm-card) !important;color:var(--pm-text) !important;}
.pm-quill-override .ql-stroke{stroke:var(--pm-text) !important;}
.pm-quill-override .ql-fill{fill:var(--pm-text) !important;}
.pm-quill-override .ql-picker{color:var(--pm-text) !important;}
.pm-quill-override .ql-picker-options{background:var(--pm-surface) !important;border:1px solid var(--pm-border) !important;}
.pm-quill-override .ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-stroke{stroke:var(--pm-accent) !important;}
.pm-quill-override .ql-snow .ql-picker.ql-expanded .ql-picker-options{border-color:var(--pm-accent) !important;}
.pm-var-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px;}
.pm-var-table th{text-align:left;padding:8px 6px;border-bottom:1px solid var(--pm-border);color:var(--pm-muted);font-weight:600;letter-spacing:1px;text-transform:uppercase;}
.pm-var-table td{padding:8px 6px;border-bottom:1px solid var(--pm-border);}
.pm-var-table input{width:100%;background:var(--pm-surface);border:1px solid var(--pm-border);color:var(--pm-text);padding:6px 8px;font-size:11px;outline:none;border-radius:2px;}
.pm-var-table input:focus{border-color:var(--pm-accent);}
.pm-mdm-btn{background:none;border:1px solid var(--pm-border);color:var(--pm-text);padding:8px 16px;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:1px;transition:all .2s;}
.pm-mdm-btn:hover{border-color:var(--pm-accent);color:var(--pm-accent);}

@media (max-width: 768px) {
    #pm-topbar { padding: 12px 16px; flex-direction: column; align-items: stretch; gap: 12px; }
    #pm-topbar h2 { font-size: 18px; margin-bottom: 4px; }
    #pm-cat-filters { width: 100%; overflow-x: auto; display: flex; gap: 6px; padding-bottom: 4px; }
    .pm-cat-btn { white-space: nowrap; padding: 6px 12px; font-size: 10px; }
    
    #pm-grid-wrap { padding: 12px; }
    #pm-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .pm-card-body { padding: 8px; }
    .pm-card-name { font-size: 11px; }
    .pm-card-price { font-size: 12px; }
    
    #pm-drawer { width: 100%; border-left: none; }
    #pm-drawer-body { padding: 16px; }
    #pm-drawer-foot { padding: 12px 16px; }
}
`;
		document.head.appendChild(s);

		// Google Font
		if (!document.querySelector('[href*="Playfair"]')) {
			const lnk = document.createElement('link');
			lnk.rel = 'stylesheet';
			lnk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap';
			document.head.appendChild(lnk);
		}
	}

	build_layout() {
		const page = this.wrapper.querySelector('.page-content') || this.wrapper;
		page.style.overflow = 'hidden';
		page.style.position = 'relative';
		page.innerHTML = `
<div id="pm-root">
  <div id="pm-topbar">
    <h2>Product Manager</h2>
    <div id="pm-cat-filters"><button class="pm-cat-btn active" data-cat="All">All</button></div>
	<div style="display:flex;gap:10px;">
		<button class="pm-mdm-btn" onclick="frappe.set_route('master-data-manager')">Manage Data</button>
		<button id="pm-add-btn">
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Product
    </button>
  </div>
  </div>
  <div id="pm-body">
    <div id="pm-grid-wrap">
      <div id="pm-grid"><div class="pm-loading">Loading products…</div></div>
    </div>
    <div id="pm-drawer">
      <div id="pm-drawer-head">
        <h3 id="pm-drawer-title">New Product</h3>
        <button id="pm-drawer-close">✕</button>
      </div>
      <div id="pm-drawer-tabs">
        <div class="pm-tab active" data-tab="details">Details</div>
        <div class="pm-tab" data-tab="variants">Variants</div>
      </div>
      <div id="pm-drawer-body"></div>
      <div id="pm-drawer-foot">
        <button id="pm-save-btn">Save Product</button>
        <button id="pm-toggle-btn" style="display:none">Enable</button>
        <button id="pm-del-btn" style="display:none">Delete</button>
      </div>
    </div>
  </div>
</div>`;
		this.bind_events();
	}

	bind_events() {
		// Category filters — delegated on the container so dynamic buttons work
		document.getElementById('pm-cat-filters').addEventListener('click', (e) => {
			const btn = e.target.closest('.pm-cat-btn');
			if (!btn) return;
			document.querySelectorAll('.pm-cat-btn').forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			this.load_products(btn.dataset.cat);
		});

		// Add button
		document.getElementById('pm-add-btn').addEventListener('click', () => this.open_drawer(null));

		// Close drawer
		document.getElementById('pm-drawer-close').addEventListener('click', () => this.close_drawer());

		// Tabs
		document.querySelectorAll('.pm-tab').forEach(t => {
			t.addEventListener('click', () => {
				document.querySelectorAll('.pm-tab').forEach(x => x.classList.remove('active'));
				t.classList.add('active');
				this.render_tab(t.dataset.tab);
			});
		});

		// Save
		document.getElementById('pm-save-btn').addEventListener('click', () => this.save_product());

		// Delete
		document.getElementById('pm-del-btn').addEventListener('click', () => this.delete_product());

		// Toggle status
		document.getElementById('pm-toggle-btn').addEventListener('click', () => this.toggle_status());
	}

	bootstrap() {
		frappe.call({
			method: 'frappe_ecommerce.api.products.bootstrap',
			callback: () => {
				frappe.call({
					method: 'frappe_ecommerce.api.products.get_item_groups',
					callback: (r) => {
						this.item_groups = r.message || [];
						this.render_filter_tabs();

						frappe.call({
							method: 'frappe_ecommerce.api.products.get_item_attributes',
							callback: (r2) => {
								this.item_attributes = r2.message || { colors: [], sizes: [] };
								this.load_products('All');
							}
						});
					}
				});
			}
		});
	}

	render_filter_tabs() {
		const container = document.getElementById('pm-cat-filters');
		const extra = this.item_groups.map(g =>
			`<button class="pm-cat-btn" data-cat="${g}">${g}</button>`
		).join('');
		container.innerHTML = `<button class="pm-cat-btn active" data-cat="All">All</button>${extra}`;
	}

	load_products(category) {
		this.active_category = category || 'All';
		document.getElementById('pm-grid').innerHTML = '<div class="pm-loading">Loading…</div>';
		frappe.call({
			method: 'frappe_ecommerce.api.products.get_products',
			args: { category: this.active_category },
			callback: (r) => {
				this.products = r.message || [];
				this.render_grid();
			}
		});
	}

	render_grid() {
		const grid = document.getElementById('pm-grid');
		if (!this.products.length) {
			grid.innerHTML = '<div class="pm-empty">No products found. Click <b>Add Product</b> to create one.</div>';
			return;
		}
		grid.innerHTML = this.products.map(p => {
			let colors = [];
			try { colors = JSON.parse(p.custom_colors || '[]'); } catch (e) { }
			let sizes = [];
			try { sizes = JSON.parse(p.custom_sizes || '[]'); } catch (e) { }
			const swatches = colors.slice(0, 5).map(c =>
				`<div class="pm-swatch" style="background:${c.hex || c}" title="${c.name || ''}"></div>`
			).join('');
			const price = p.price || 0;
			const disc = p.custom_discount_percentage || 0;
			const finalPrice = disc > 0 ? price * (1 - disc / 100) : price;
			const priceHtml = disc > 0
				? `<span class="pm-card-price">৳${Math.round(finalPrice).toLocaleString()}</span><span class="pm-card-oldp">৳${price.toLocaleString()}</span>`
				: `<span class="pm-card-price">৳${price.toLocaleString()}</span>`;
			return `
<div class="pm-card" data-name="${p.name}">
  ${p.custom_badge ? `<span class="pm-card-badge">${p.custom_badge}</span>` : ''}
  ${p.disabled ? '<span class="pm-card-dis">Disabled</span>' : ''}
  <img class="pm-card-img" src="${p.image || 'https://via.placeholder.com/300x400/1e1e1e/888?text=No+Image'}" alt="${p.item_name}" />
  <div class="pm-card-body">
    <div class="pm-card-cat">${p.item_group}</div>
    <div class="pm-card-name">${p.item_name}</div>
    <div>${priceHtml}</div>
    ${swatches ? `<div class="pm-card-swatches">${swatches}</div>` : ''}
    ${sizes.length ? `<div class="pm-card-sizes">${sizes.map(s => s.label || s).join(' · ')}</div>` : ''}
  </div>
</div>`;
		}).join('');

		// bind card clicks
		document.querySelectorAll('.pm-card').forEach(card => {
			card.addEventListener('click', () => this.open_drawer(card.dataset.name));
		});
	}

	open_drawer(name) {
		this.current = null;
		this.current_colors = [];
		this.current_sizes = [];

		const drawer = document.getElementById('pm-drawer');
		const title = document.getElementById('pm-drawer-title');
		const delBtn = document.getElementById('pm-del-btn');
		const togBtn = document.getElementById('pm-toggle-btn');

		// Reset tabs
		document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
		document.querySelector('.pm-tab[data-tab="details"]').classList.add('active');

		if (!name) {
			title.textContent = 'New Product';
			delBtn.style.display = 'none';
			togBtn.style.display = 'none';
			const defaultGroup = (this.item_groups && this.item_groups[0]) || '';
			this.current = { item_name: '', item_group: defaultGroup, price: 0, custom_discount_percentage: 0, custom_badge: '', description: '', image: '' };
			this.current_gallery_images = [];
			this.current_colors = [];
			this.current_sizes = [];
			this.current_variants_pricing = {};
			this.render_tab('details');
			drawer.classList.add('open');
		} else {
			frappe.call({
				method: 'frappe_ecommerce.api.products.get_product',
				args: { name },
				callback: (r) => {
					const p = r.message;
					this.current = p;
					try {
						this.current_gallery_images = JSON.parse(p.custom_gallery_images || '[]');
					} catch (e) { this.current_gallery_images = []; }
					if (!this.current_gallery_images.length && p.image) this.current_gallery_images = [p.image];
					try { this.current_colors = JSON.parse(p.custom_colors || '[]'); } catch (e) { this.current_colors = []; }
					try { this.current_sizes = JSON.parse(p.custom_sizes || '[]'); } catch (e) { this.current_sizes = []; }
					try { this.current_variants_pricing = typeof p.variants_pricing === 'string' ? JSON.parse(p.variants_pricing || '{}') : (p.variants_pricing || {}); } catch (e) { this.current_variants_pricing = {}; }
					title.textContent = p.item_name;
					delBtn.style.display = '';
					togBtn.style.display = '';
					togBtn.textContent = p.disabled ? 'Enable' : 'Disable';
					this.render_tab('details');
					drawer.classList.add('open');
				}
			});
		}
	}

	close_drawer() {
		document.getElementById('pm-drawer').classList.remove('open');
	}

	render_tab(tab) {
		const body = document.getElementById('pm-drawer-body');
		if (tab === 'details') {
			const p = this.current || {};
			body.innerHTML = `
<div class="pm-field">
  <label class="pm-label">Product Name *</label>
  <input class="pm-input" id="pm-f-name" value="${p.item_name || ''}" placeholder="e.g. Classic Graphic Tee" />
</div>
<div class="pm-row">
  <div class="pm-field">
    <label class="pm-label">Category</label>
    <select class="pm-select" id="pm-f-cat">
      ${(this.item_groups || []).map(g =>
				`<option value="${g}" ${p.item_group === g ? 'selected' : ''}>${g}</option>`
			).join('')}
    </select>
  </div>
  <div class="pm-field">
    <label class="pm-label">Badge</label>
    <input class="pm-input" id="pm-f-badge" value="${p.custom_badge || ''}" placeholder="SALE / NEW" />
  </div>
</div>
<div class="pm-row">
  <div class="pm-field">
    <label class="pm-label">Price (৳)</label>
    <input class="pm-input" id="pm-f-price" type="number" value="${p.price || 0}" />
  </div>
  <div class="pm-field">
    <label class="pm-label">Discount (%)</label>
    <input class="pm-input" id="pm-f-discount" type="number" min="0" max="100" value="${p.custom_discount_percentage || 0}" placeholder="0" />
  </div>
</div>
<div class="pm-field">
  <label class="pm-label">Stock Quantity</label>
  <input class="pm-input" id="pm-f-stock" type="number" min="0" value="${p.stock_qty || 0}" />
  <span style="display:block;font-size:10px;color:var(--pm-muted);margin-top:5px;">Only used when this product has no color/size variants — variant stock is set in the Variants tab.</span>
</div>
<div class="pm-field">
  <label class="pm-label">Product Images</label>
  <div class="pm-img-wrap" id="pm-img-wrap">
    <div class="pm-gallery-grid" id="pm-gallery-grid"></div>
    <div class="pm-img-actions">
      <button class="pm-attach-btn" onclick="window._pm.attach_image()">Add Images</button>
    </div>
  </div>
</div>
<div class="pm-field" style="margin-bottom: 40px;">
  <div id="pm-desc-wrapper" class="pm-quill-override"></div>
</div>`;

			this.desc_editor = frappe.ui.form.make_control({
				parent: document.getElementById('pm-desc-wrapper'),
				df: {
					fieldtype: 'Text Editor',
					fieldname: 'description',
					label: 'Description'
				},
				render_input: true
			});
			this.desc_editor.set_value(p.description || '');
			this.render_gallery();

		} else {
			const colorOptions = (this.item_attributes?.colors || []).map(c => `<option value="${c.attribute_value}" data-hex="${c.custom_hex_code || ''}"></option>`).join('');
			const sizeOptions = (this.item_attributes?.sizes || []).map(s => `<option value="${s.attribute_value}"></option>`).join('');

			body.innerHTML = `
<datalist id="pm-colors-dl">${colorOptions}</datalist>
<datalist id="pm-sizes-dl">${sizeOptions}</datalist>
<div class="pm-var-head">
  <span class="pm-var-title">Colors</span>
</div>
<div class="pm-chip-list" id="pm-colors-list"></div>
<div class="pm-add-form">
  <input type="color" id="pm-new-color-hex" value="#c8a97e" />
  <input class="pm-input" id="pm-new-color-name" placeholder="Color name (e.g. Navy)" list="pm-colors-dl" />
  <button class="pm-sm-btn" onclick="window._pm.add_color()">Add</button>
</div>
<hr class="pm-divider" />
<div class="pm-var-head">
  <span class="pm-var-title">Sizes</span>
</div>
<div class="pm-chip-list" id="pm-sizes-list"></div>
<div class="pm-add-form">
  <input class="pm-input" id="pm-new-size" placeholder="Size (e.g. M / 32)" list="pm-sizes-dl" />
  <button class="pm-sm-btn" onclick="window._pm.add_size()">Add</button>
</div>
<hr class="pm-divider" />
<div class="pm-var-head">
  <span class="pm-var-title">Variant Pricing</span>
</div>
<div id="pm-variants-table-wrap"></div>
`;
			this.render_colors();
			this.render_sizes();
			this.render_variants_table();

			const colorInput = document.getElementById('pm-new-color-name');
			colorInput.addEventListener('input', (e) => {
				const val = e.target.value;
				const colors = this.item_attributes?.colors || [];
				const match = colors.find(c => c.attribute_value === val);
				if (match && match.custom_hex_code) {
					document.getElementById('pm-new-color-hex').value = match.custom_hex_code;
				}
			});
		}
	}

	render_colors() {
		const el = document.getElementById('pm-colors-list');
		if (!el) return;
		el.innerHTML = this.current_colors.map((c, i) => `
<div class="pm-chip">
  <div class="pm-color-dot" style="background:${c.hex}"></div>
  <span>${c.name}</span>
  <button class="pm-chip-del" onclick="window._pm.remove_color(${i})">×</button>
</div>`).join('') || '<span style="color:var(--pm-muted);font-size:12px">No colors yet.</span>';
	}

	render_sizes() {
		const el = document.getElementById('pm-sizes-list');
		if (!el) return;
		el.innerHTML = this.current_sizes.map((s, i) => `
<div class="pm-chip">
  <span>${s.label}</span>
  <button class="pm-chip-del" onclick="window._pm.remove_size(${i})">×</button>
</div>`).join('') || '<span style="color:var(--pm-muted);font-size:12px">No sizes yet.</span>';
	}

	add_color() {
		const hex = document.getElementById('pm-new-color-hex').value;
		const name = document.getElementById('pm-new-color-name').value.trim();
		if (!name) { frappe.msgprint('Enter a color name.'); return; }
		this.current_colors.push({ hex, name });
		document.getElementById('pm-new-color-name').value = '';
		this.render_colors();
		this.render_variants_table();
	}

	remove_color(i) {
		this.current_colors.splice(i, 1);
		this.render_colors();
		this.render_variants_table();
	}

	add_size() {
		const val = document.getElementById('pm-new-size').value.trim();
		if (!val) { frappe.msgprint('Enter a size.'); return; }
		this.current_sizes.push({ label: val });
		document.getElementById('pm-new-size').value = '';
		this.render_sizes();
		this.render_variants_table();
	}

	remove_size(i) {
		this.current_sizes.splice(i, 1);
		this.render_sizes();
		this.render_variants_table();
	}

	render_variants_table() {
		const wrap = document.getElementById('pm-variants-table-wrap');
		if (!wrap) return;

		// Save current inputs
		const inputs = wrap.querySelectorAll('.pm-var-price-input');
		inputs.forEach(inp => {
			const key = inp.dataset.key;
			if (!this.current_variants_pricing[key]) this.current_variants_pricing[key] = {};
			this.current_variants_pricing[key][inp.dataset.field] = parseFloat(inp.value) || 0;
		});

		// Combinations
		const combos = [];
		const colors = this.current_colors.length ? this.current_colors : [{ name: '' }];
		const sizes = this.current_sizes.length ? this.current_sizes : [{ label: '' }];

		colors.forEach(c => {
			sizes.forEach(s => {
				if (c.name || s.label) {
					combos.push({ color: c.name, size: s.label });
				}
			});
		});

		if (combos.length === 0) {
			wrap.innerHTML = '<div class="pm-empty" style="padding:20px 0;">Add colors or sizes to configure variants.</div>';
			return;
		}

		const basePrice = document.getElementById('pm-f-price') ? parseFloat(document.getElementById('pm-f-price').value) || 0 : (this.current ? this.current.price || 0 : 0);
		const baseDisc = document.getElementById('pm-f-discount') ? parseFloat(document.getElementById('pm-f-discount').value) || 0 : (this.current ? this.current.custom_discount_percentage || 0 : 0);

		let html = '<table class="pm-var-table"><thead><tr><th>Variant</th><th>Price (৳)</th><th>Discount (%)</th><th>Stock Qty</th></tr></thead><tbody>';
		combos.forEach(cb => {
			const key = [cb.color, cb.size].filter(Boolean).join('-');
			const existing = this.current_variants_pricing[key] || {};
			const price = existing.price !== undefined ? existing.price : basePrice;
			const discount = existing.discount !== undefined ? existing.discount : baseDisc;
			const opening_stock = existing.opening_stock !== undefined ? existing.opening_stock : 0;

			const label = [cb.color, cb.size].filter(Boolean).join(' - ');

			html += `
<tr>
  <td>${label}</td>
  <td><input type="number" class="pm-var-price-input" data-key="${key}" data-field="price" value="${price}" /></td>
  <td><input type="number" class="pm-var-price-input" data-key="${key}" data-field="discount" value="${discount}" min="0" max="100" /></td>
  <td><input type="number" class="pm-var-price-input" data-key="${key}" data-field="opening_stock" value="${opening_stock}" placeholder="0" min="0" /></td>
</tr>`;
		});
		html += '</tbody></table>';
		wrap.innerHTML = html;
	}

	attach_image() {
		new frappe.ui.FileUploader({
			allow_multiple: true,
			restrictions: { allowed_file_types: ['image/*'] },
			on_success: (file) => {
				this.current_gallery_images.push(file.file_url);
				this.render_gallery();
			}
		});
	}

	remove_gallery_image(i) {
		this.current_gallery_images.splice(i, 1);
		this.render_gallery();
	}

	set_cover_image(i) {
		const [img] = this.current_gallery_images.splice(i, 1);
		this.current_gallery_images.unshift(img);
		this.render_gallery();
	}

	render_gallery() {
		const grid = document.getElementById('pm-gallery-grid');
		if (!grid) return;

		if (!this.current_gallery_images.length) {
			grid.innerHTML = '<div class="pm-gallery-empty">No images attached yet.</div>';
			return;
		}

		grid.innerHTML = this.current_gallery_images.map((src, i) => `
<div class="pm-gallery-item ${i === 0 ? 'is-cover' : ''}" onclick="window._pm.set_cover_image(${i})" title="${i === 0 ? 'Cover image' : 'Click to set as cover'}">
  <img src="${src}" alt="product image ${i + 1}" />
  ${i === 0 ? '<span class="pm-gallery-cover-badge">Cover</span>' : ''}
  <button class="pm-gallery-del" onclick="event.stopPropagation();window._pm.remove_gallery_image(${i})">×</button>
</div>`).join('');
	}

	_collect_form() {
		const nameEl = document.getElementById('pm-f-name');
		if (!nameEl) return null;

		// Make sure to capture latest pricing inputs if variant tab is active
		const wrap = document.getElementById('pm-variants-table-wrap');
		if (wrap) {
			const inputs = wrap.querySelectorAll('.pm-var-price-input');
			inputs.forEach(inp => {
				const key = inp.dataset.key;
				if (!this.current_variants_pricing[key]) this.current_variants_pricing[key] = {};
				this.current_variants_pricing[key][inp.dataset.field] = parseFloat(inp.value) || 0;
			});
		}

		return {
			name: this.current && this.current.name ? this.current.name : null,
			item_name: nameEl.value.trim(),
			item_group: document.getElementById('pm-f-cat').value,
			price: document.getElementById('pm-f-price').value,
			custom_discount_percentage: document.getElementById('pm-f-discount').value,
			custom_badge: document.getElementById('pm-f-badge').value.trim().toUpperCase(),
			description: this.desc_editor ? this.desc_editor.get_value() : (this.current.description || ''),
			image: this.current_gallery_images[0] || '',
			custom_gallery_images: JSON.stringify(this.current_gallery_images),
			opening_stock: document.getElementById('pm-f-stock').value,
			custom_colors: JSON.stringify(this.current_colors),
			custom_sizes: JSON.stringify(this.current_sizes),
			variants_pricing: JSON.stringify(this.current_variants_pricing)
		};
	}

	save_product() {
		// Ensure we capture variants even if currently on variants tab
		const data = this._collect_form() || {
			name: this.current && this.current.name ? this.current.name : null,
			item_name: this.current.item_name,
			item_group: this.current.item_group,
			price: this.current.price,
			custom_discount_percentage: this.current.custom_discount_percentage,
			custom_badge: this.current.custom_badge,
			description: this.current.description,
			image: this.current_gallery_images[0] || '',
			custom_gallery_images: JSON.stringify(this.current_gallery_images),
			opening_stock: this.current.stock_qty || 0,
			custom_colors: JSON.stringify(this.current_colors),
			custom_sizes: JSON.stringify(this.current_sizes),
			variants_pricing: JSON.stringify(this.current_variants_pricing)
		};

		if (!data.item_name) { frappe.msgprint('Product name is required.'); return; }

		const btn = document.getElementById('pm-save-btn');
		const originalText = btn.textContent;
		btn.disabled = true;
		btn.textContent = 'Saving...';

		frappe.call({
			method: 'frappe_ecommerce.api.products.save_product',
			args: { data: JSON.stringify(data) },
			callback: (r) => {
				frappe.show_alert({ message: 'Product saved!', indicator: 'green' });
				this.close_drawer();
				this.load_products(this.active_category);
			},
			always: () => {
				btn.disabled = false;
				btn.textContent = originalText;
			}
		});
	}

	delete_product() {
		if (!this.current || !this.current.name) return;
		frappe.confirm(`Delete <b>${this.current.item_name}</b>? This cannot be undone.`, () => {
			const btn = document.getElementById('pm-del-btn');
			const originalText = btn.textContent;
			btn.disabled = true;
			btn.textContent = 'Deleting...';

			frappe.call({
				method: 'frappe_ecommerce.api.products.delete_product',
				args: { name: this.current.name },
				callback: () => {
					frappe.show_alert({ message: 'Product deleted.', indicator: 'red' });
					this.close_drawer();
					this.load_products(this.active_category);
				},
				always: () => {
					btn.disabled = false;
					btn.textContent = originalText;
				}
			});
		});
	}

	toggle_status() {
		if (!this.current || !this.current.name) return;
		const btn = document.getElementById('pm-toggle-btn');
		const originalText = btn.textContent;
		btn.disabled = true;
		btn.textContent = 'Processing...';

		frappe.call({
			method: 'frappe_ecommerce.api.products.toggle_product_status',
			args: { name: this.current.name },
			callback: (r) => {
				const disabled = r.message.disabled;
				this.current.disabled = disabled;
				frappe.show_alert({ message: disabled ? 'Product disabled.' : 'Product enabled.', indicator: disabled ? 'orange' : 'green' });
				this.load_products(this.active_category);
			},
			always: () => {
				btn.disabled = false;
				btn.textContent = this.current.disabled ? 'Enable' : 'Disable';
			}
		});
	}
}

// Expose instance for inline onclick handlers
frappe.pages['product-manager'].on_page_load = (function (original) {
	return function (wrapper) {
		frappe.ui.make_app_page({ parent: wrapper, title: 'Product Manager', single_column: true });
		window._pm = new ProductManager(wrapper);
	};
})(frappe.pages['product-manager'].on_page_load);
