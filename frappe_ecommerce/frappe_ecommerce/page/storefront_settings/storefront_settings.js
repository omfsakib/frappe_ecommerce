frappe.pages['storefront-settings'].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Storefront Settings', single_column: true });
	new EcommerceSettingsManager(wrapper);
};

class EcommerceSettingsManager {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.settings = {};
		this.inject_styles();
		this.build_layout();
		this.load_settings();
	}

	inject_styles() {
		if (document.getElementById('es-styles')) return;
		const s = document.createElement('style');
		s.id = 'es-styles';
		s.textContent = `
:root, [data-theme="light"] {
	--es-bg:#f8f9fa;
	--es-surface:#ffffff;
	--es-border:#e2e8f0;
	--es-accent:#c8a97e;
	--es-text:#1e293b;
	--es-muted:#64748b;
}

[data-theme="dark"] {
	--es-bg:#0f0f0f;
	--es-surface:#181818;
	--es-border:#2a2a2a;
	--es-accent:#c8a97e;
	--es-text:#f0ece6;
	--es-muted:#888;
}

#es-root { font-family:'Inter', sans-serif; background:var(--es-bg); color:var(--es-text); min-height:calc(100vh - 46px); padding:40px; overflow-x:hidden; }
#es-container { width:100%; margin:0 auto; }
#es-header { margin-bottom:40px; }
#es-header h2 { font-family:'Playfair Display', serif; font-size:32px; color:var(--es-accent); margin-bottom:8px; }
#es-header p { font-size:15px; color:var(--es-muted); }

.es-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(400px, 1fr)); gap:24px; align-items:start; }
.es-section { background:var(--es-surface); border:1px solid var(--es-border); border-radius:8px; padding:32px; height:100%; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.es-section-title { font-size:12px; text-transform:uppercase; letter-spacing:1.5px; font-weight:700; color:var(--es-muted); margin-bottom:24px; border-bottom:1px solid var(--es-border); padding-bottom:12px; }

.es-field { margin-bottom:24px; }
.es-label { display:block; font-size:12px; font-weight:600; margin-bottom:8px; color:var(--es-text); }
.es-input { width:100%; padding:12px; background:var(--es-bg); border:1px solid var(--es-border); color:var(--es-text); font-size:14px; border-radius:4px; transition:all .2s; }
.es-input:focus { border-color:var(--es-accent); outline:none; box-shadow:0 0 0 2px rgba(200, 169, 126, 0.1); }

.es-image-upload { display:flex; align-items:center; gap:20px; }
.es-image-preview { width:100px; height:100px; background:var(--es-bg); border:1px solid var(--es-border); display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:4px; }
.es-image-preview img { max-width:100%; max-height:100%; object-fit:contain; }
.es-btn-upload { background:none; border:1px dashed var(--es-accent); color:var(--es-accent); padding:10px 20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; cursor:pointer; border-radius:4px; }

#es-footer { display:flex; justify-content:flex-end; gap:12px; margin-top:40px; position:sticky; bottom:20px; }
.es-btn-save { background:var(--es-accent); color:#000; border:none; padding:16px 48px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:2px; cursor:pointer; transition:all .2s; border-radius:4px; box-shadow:0 4px 12px rgba(200, 169, 126, 0.2); }
.es-btn-save:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(200, 169, 126, 0.3); }
.es-btn-save:active { transform:translateY(0); }
.es-btn-save:disabled { opacity:0.6; cursor:not-allowed; }

@media (max-width: 768px) {
    #es-root { padding: 20px 16px; }
    .es-grid { grid-template-columns: 1fr; }
    .es-section { padding: 24px; }
}
`;
		document.head.appendChild(s);
	}

	build_layout() {
		const page = this.wrapper.querySelector('.page-content') || this.wrapper;
		page.style.overflow = 'auto';
		page.innerHTML = `
<div id="es-root">
  <div id="es-container">
    <div id="es-header">
      <h2>Storefront Settings</h2>
      <p>Customize your storefront identity, branding, and SEO.</p>
    </div>

    <div class="es-grid">
      <div class="es-section">
        <div class="es-section-title">Identity & Branding</div>
        <div class="es-field">
          <label class="es-label">Site Name</label>
          <input type="text" class="es-input" id="es-site-name" placeholder="e.g. THREAD">
        </div>
        <div class="es-field">
          <label class="es-label">App Logo</label>
          <div class="es-image-upload">
            <div class="es-image-preview" id="es-logo-preview"><span style="color:var(--es-muted); font-size:10px;">No Logo</span></div>
            <button class="es-btn-upload" onclick="window._esm.upload('app_logo')">Change Logo</button>
          </div>
        </div>
        <div class="es-field">
          <label class="es-label">Favicon</label>
          <div class="es-image-upload">
            <div class="es-image-preview" id="es-favicon-preview"><span style="color:var(--es-muted); font-size:10px;">No Icon</span></div>
            <button class="es-btn-upload" onclick="window._esm.upload('favicon')">Change Favicon</button>
          </div>
        </div>
      </div>

      <div class="es-section">
        <div class="es-section-title">Shipping</div>
        <div class="es-field">
          <label class="es-label">Inside City Shipping Rule</label>
          <div id="es-inside-city-wrap"></div>
        </div>
        <div class="es-field">
          <label class="es-label">Outside City Shipping Rule</label>
          <div id="es-outside-city-wrap"></div>
        </div>
      </div>

      <div class="es-section">
        <div class="es-section-title">SEO & Metadata</div>
        <div class="es-field">
          <label class="es-label">Meta Description</label>
          <textarea class="es-input" id="es-meta-desc" rows="3" placeholder="Enter site description for search engines..."></textarea>
        </div>
      </div>

      <div class="es-section">
        <div class="es-section-title">Footer</div>
        <div class="es-field">
          <label class="es-label">Footer Text</label>
          <textarea class="es-input" id="es-footer-text" rows="2" placeholder="Copyright © 2026 THREAD..."></textarea>
        </div>
      </div>
    </div>

    <div id="es-footer">
      <button class="es-btn-save" id="es-save-btn">Save Changes</button>
    </div>
  </div>
</div>`;

		document.getElementById('es-save-btn').onclick = () => this.save_settings();
		window._esm = this;
	}

	load_settings() {
		frappe.call({
			method: 'frappe.client.get',
			args: { doctype: 'Ecommerce Settings', name: 'Ecommerce Settings' },
			callback: (r) => {
				this.settings = r.message || {};
				this.render_settings();
			}
		});
	}

	render_settings() {
		document.getElementById('es-site-name').value = this.settings.site_name || '';
		document.getElementById('es-meta-desc').value = this.settings.meta_description || '';
		document.getElementById('es-footer-text').value = this.settings.footer_text || '';
		
		if (this.settings.app_logo) {
			document.getElementById('es-logo-preview').innerHTML = `<img src="${this.settings.app_logo}">`;
		}
		if (this.settings.favicon) {
			document.getElementById('es-favicon-preview').innerHTML = `<img src="${this.settings.favicon}">`;
		}

		// Shipping Rules (Link Controls)
		if (!this.inside_city_control) {
			this.inside_city_control = frappe.ui.form.make_control({
				parent: document.getElementById('es-inside-city-wrap'),
				df: {
					fieldtype: 'Link',
					options: 'Shipping Rule',
					fieldname: 'inside_city_shipping_rule',
					placeholder: 'Select Shipping Rule'
				},
				render_input: true
			});
		}
		this.inside_city_control.set_value(this.settings.inside_city_shipping_rule || '');

		if (!this.outside_city_control) {
			this.outside_city_control = frappe.ui.form.make_control({
				parent: document.getElementById('es-outside-city-wrap'),
				df: {
					fieldtype: 'Link',
					options: 'Shipping Rule',
					fieldname: 'outside_city_shipping_rule',
					placeholder: 'Select Shipping Rule'
				},
				render_input: true
			});
		}
		this.outside_city_control.set_value(this.settings.outside_city_shipping_rule || '');
	}

	upload(fieldname) {
		new frappe.ui.FileUploader({
			on_success: (file) => {
				this.settings[fieldname] = file.file_url;
				this.render_settings();
			}
		});
	}

	save_settings() {
		const btn = document.getElementById('es-save-btn');
		btn.disabled = true;
		btn.textContent = 'Saving...';

		const data = {
			site_name: document.getElementById('es-site-name').value,
			meta_description: document.getElementById('es-meta-desc').value,
			footer_text: document.getElementById('es-footer-text').value,
			app_logo: this.settings.app_logo,
			favicon: this.settings.favicon,
			inside_city_shipping_rule: this.inside_city_control.get_value(),
			outside_city_shipping_rule: this.outside_city_control.get_value()
		};

		frappe.call({
			method: 'frappe.client.set_value',
			args: {
				doctype: 'Ecommerce Settings',
				name: 'Ecommerce Settings',
				fieldname: data
			},
			callback: () => {
				frappe.show_alert({ message: 'Settings saved!', indicator: 'green' });
			},
			always: () => {
				btn.disabled = false;
				btn.textContent = 'Save Changes';
			}
		});
	}
}
