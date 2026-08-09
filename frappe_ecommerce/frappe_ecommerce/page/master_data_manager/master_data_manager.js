frappe.pages['master-data-manager'].on_page_load = function(wrapper) {
	new MasterDataManager(wrapper);
}

class MasterDataManager {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: 'Master Data Manager',
			single_column: true
		});
		
		this.categories = [];
		this.colors = [];
		this.sizes = [];
		
		this.setup_css();
		this.build_layout();
		this.load_data();
	}

	setup_css() {
		if (document.getElementById('mdm-styles')) return;
		const s = document.createElement('style');
		s.id = 'mdm-styles';
		s.innerHTML = `
:root, [data-theme="light"] {
	--mdm-bg: #f8f9fa;
	--mdm-surface: #ffffff;
	--mdm-card: #ffffff;
	--mdm-border: #e2e8f0;
	--mdm-text: #1e293b;
	--mdm-muted: #64748b;
	--mdm-accent: #c8a97e;
	--mdm-danger: #ef4444;
}

[data-theme="dark"] {
	--mdm-bg: #000000;
	--mdm-surface: #111111;
	--mdm-card: #1a1a1a;
	--mdm-border: #333333;
	--mdm-text: #ffffff;
	--mdm-muted: #888888;
	--mdm-accent: #c8a97e;
	--mdm-danger: #ff4444;
}
#mdm-root {
	background: var(--mdm-bg);
	color: var(--mdm-text);
	font-family: 'Inter', sans-serif;
	min-height: 100vh;
	padding: 20px;
}
.mdm-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30px;
}
.mdm-header h2 { margin: 0; font-family: 'Playfair Display', serif; font-size: 28px; }
.mdm-nav-btn {
	background: none; border: 1px solid var(--mdm-border); color: var(--mdm-text);
	padding: 10px 20px; cursor: pointer; transition: all 0.2s; font-size: 12px; letter-spacing: 1px;
}
.mdm-nav-btn:hover { border-color: var(--mdm-accent); color: var(--mdm-accent); }

.mdm-tabs { display: flex; gap: 20px; border-bottom: 1px solid var(--mdm-border); margin-bottom: 30px; }
.mdm-tab {
	padding: 10px 0; cursor: pointer; color: var(--mdm-muted); font-size: 14px; font-weight: 500;
	border-bottom: 2px solid transparent; transition: all 0.2s;
}
.mdm-tab:hover { color: var(--mdm-text); }
.mdm-tab.active { color: var(--mdm-accent); border-bottom-color: var(--mdm-accent); }

.mdm-section { display: none; }
.mdm-section.active { display: block; }

.mdm-card {
	background: var(--mdm-card); border: 1px solid var(--mdm-border); border-radius: 4px; padding: 20px; margin-bottom: 20px;
}
.mdm-card h3 { margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: var(--mdm-accent); }

.mdm-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.mdm-item {
	display: flex; justify-content: space-between; align-items: center;
	background: var(--mdm-surface); border: 1px solid var(--mdm-border); padding: 10px 15px; border-radius: 4px;
}
.mdm-item-left { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.mdm-color-dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--mdm-border); }
.mdm-item-actions { display: flex; gap: 10px; }
.mdm-icon-btn {
	background: none; border: none; color: var(--mdm-muted); cursor: pointer; padding: 5px; font-size: 16px; transition: color 0.2s;
}
.mdm-icon-btn:hover { color: var(--mdm-text); }
.mdm-icon-btn.del:hover { color: var(--mdm-danger); }

.mdm-add-form { display: flex; gap: 10px; align-items: center; }
.mdm-input {
	flex: 1; background: var(--mdm-surface); border: 1px solid var(--mdm-border); color: var(--mdm-text);
	padding: 10px 15px; font-size: 13px; outline: none; border-radius: 4px;
}
.mdm-input:focus { border-color: var(--mdm-accent); }
.mdm-btn {
	background: var(--mdm-accent); color: #000; border: none; padding: 10px 20px; font-size: 12px; font-weight: 700;
	cursor: pointer; letter-spacing: 1px; border-radius: 4px; transition: opacity 0.2s;
}
.mdm-btn:hover { opacity: 0.9; }

input[type="color"] {
	-webkit-appearance: none; border: none; width: 38px; height: 38px; border-radius: 4px;
	padding: 0; cursor: pointer; background: var(--mdm-surface);
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: 1px solid var(--mdm-border); border-radius: 4px; }
`;
		document.head.appendChild(s);
	}

	build_layout() {
		const page = this.wrapper.querySelector('.page-content') || this.wrapper;
		page.innerHTML = `
<div id="mdm-root">
	<div class="mdm-header">
		<h2>Master Data Manager</h2>
		<button class="mdm-nav-btn" onclick="frappe.set_route('product-manager')">Back to Products</button>
	</div>
	
	<div class="mdm-tabs">
		<div class="mdm-tab active" data-tab="categories">Categories</div>
		<div class="mdm-tab" data-tab="variants">Variants (Colors & Sizes)</div>
	</div>

	<div class="mdm-section active" id="sec-categories">
		<div class="mdm-card">
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
				<h3 style="margin:0;">Manage Product Categories</h3>
				<button class="mdm-btn" onclick="window._mdm.add_category()">+ Add Category</button>
			</div>
			<div class="mdm-list" id="cat-list"></div>
		</div>
	</div>

	<div class="mdm-section" id="sec-variants">
		<div class="mdm-card">
			<h3>Manage Colors</h3>
			<div class="mdm-list" id="color-list"></div>
			<div class="mdm-add-form">
				<input type="color" id="new-color-hex" value="#ffffff" />
				<input type="text" class="mdm-input" id="new-color-name" placeholder="Color Name (e.g. Navy)" />
				<button class="mdm-btn" onclick="window._mdm.save_color()">Add Color</button>
			</div>
		</div>
		
		<div class="mdm-card">
			<h3>Manage Sizes</h3>
			<div class="mdm-list" id="size-list"></div>
			<div class="mdm-add-form">
				<input type="text" class="mdm-input" id="new-size-name" placeholder="Size Name (e.g. XL)" />
				<button class="mdm-btn" onclick="window._mdm.save_size()">Add Size</button>
			</div>
		</div>
	</div>
</div>
`;
		window._mdm = this;

		// Tab switching
		const root = document.getElementById('mdm-root');
		root.querySelectorAll('.mdm-tab').forEach(t => {
			t.addEventListener('click', () => {
				root.querySelectorAll('.mdm-tab').forEach(x => x.classList.remove('active'));
				root.querySelectorAll('.mdm-section').forEach(x => x.classList.remove('active'));
				t.classList.add('active');
				document.getElementById(`sec-${t.dataset.tab}`).classList.add('active');
			});
		});
	}

	load_data() {
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.get_categories',
			callback: (r) => {
				this.categories = r.message || [];
				this.render_categories();
			}
		});
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.get_attributes',
			callback: (r) => {
				this.colors = r.message.colors || [];
				this.sizes = r.message.sizes || [];
				this.render_variants();
			}
		});
	}

	render_categories() {
		const el = document.getElementById('cat-list');
		if (!this.categories.length) {
			el.innerHTML = '<div style="color:var(--mdm-muted);font-size:13px;padding:10px 0;">No categories found.</div>';
			return;
		}
		el.innerHTML = this.categories.map(c => `
<div class="mdm-item">
	<div class="mdm-item-left">
		${c.image ? `<img src="${c.image}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;border:1px solid var(--mdm-border);" />` : `<div style="width:24px;height:24px;border-radius:4px;border:1px solid var(--mdm-border);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--mdm-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
		<span id="cat-name-${c.name}">${c.item_group_name || c.name}</span>
	</div>
	<div class="mdm-item-actions">
		<button class="mdm-icon-btn" onclick="window._mdm.edit_category('${c.name}')">✎</button>
		<button class="mdm-icon-btn del" onclick="window._mdm.delete_category('${c.name}')">×</button>
	</div>
</div>
		`).join('');
	}

	add_category() {
		const d = new frappe.ui.Dialog({
			title: 'Add Category',
			fields: [
				{ label: 'Category Name', fieldname: 'new_name', fieldtype: 'Data', reqd: 1 },
				{ label: 'Image', fieldname: 'image', fieldtype: 'Attach Image' }
			],
			primary_action: (v) => {
				this.save_category_api(null, v.new_name, v.image);
				d.hide();
			}
		});
		d.show();
	}

	edit_category(name) {
		const cat = this.categories.find(c => c.name === name);
		const d = new frappe.ui.Dialog({
			title: 'Edit Category',
			fields: [
				{ label: 'Category Name', fieldname: 'new_name', fieldtype: 'Data', reqd: 1, default: cat.item_group_name || cat.name },
				{ label: 'Image', fieldname: 'image', fieldtype: 'Attach Image', default: cat.image }
			],
			primary_action: (v) => {
				this.save_category_api(name, v.new_name, v.image);
				d.hide();
			}
		});
		d.show();
	}

	save_category_api(old_name, new_name, image) {
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.save_category',
			args: { name: old_name, new_name: new_name, image: image || '' },
			callback: (r) => {
				this.load_data();
			}
		});
	}

	render_variants() {
		const cEl = document.getElementById('color-list');
		const sEl = document.getElementById('size-list');
		
		cEl.innerHTML = this.colors.length ? this.colors.map(c => `
<div class="mdm-item">
	<div class="mdm-item-left">
		<div class="mdm-color-dot" style="background:${c.custom_hex_code || '#fff'}"></div>
		<span>${c.attribute_value}</span>
	</div>
	<div class="mdm-item-actions">
		<button class="mdm-icon-btn del" onclick="window._mdm.delete_attribute('Color', '${c.attribute_value}')">×</button>
	</div>
</div>`).join('') : '<div style="color:var(--mdm-muted);font-size:13px;padding:10px 0;">No colors found.</div>';

		sEl.innerHTML = this.sizes.length ? this.sizes.map(s => `
<div class="mdm-item">
	<div class="mdm-item-left">
		<span>${s.attribute_value}</span>
	</div>
	<div class="mdm-item-actions">
		<button class="mdm-icon-btn del" onclick="window._mdm.delete_attribute('Size', '${s.attribute_value}')">×</button>
	</div>
</div>`).join('') : '<div style="color:var(--mdm-muted);font-size:13px;padding:10px 0;">No sizes found.</div>';
	}

	delete_category(name) {
		if (!confirm(`Remove category "${name}" from e-commerce?`)) return;
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.delete_category',
			args: { name: name },
			callback: (r) => {
				this.load_data();
			}
		});
	}

	save_color() {
		const val = document.getElementById('new-color-name').value.trim();
		const hex = document.getElementById('new-color-hex').value;
		if (!val) return;
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.save_attribute',
			args: { parent: 'Color', value: val, hex_code: hex },
			callback: (r) => {
				document.getElementById('new-color-name').value = '';
				this.load_data();
			}
		});
	}

	save_size() {
		const val = document.getElementById('new-size-name').value.trim();
		if (!val) return;
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.save_attribute',
			args: { parent: 'Size', value: val },
			callback: (r) => {
				document.getElementById('new-size-name').value = '';
				this.load_data();
			}
		});
	}

	delete_attribute(parent, value) {
		if (!confirm(`Delete ${parent} "${value}"?`)) return;
		frappe.call({
			method: 'frappe_ecommerce.api.master_data.delete_attribute',
			args: { parent: parent, value: value },
			callback: (r) => {
				this.load_data();
			}
		});
	}
}