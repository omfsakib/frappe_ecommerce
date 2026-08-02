/* ───── State ───── */
let ALL_PRODUCTS = [];
let CATEGORIES = [];
let activeCategory = 'All';

/* ───── Render Categories (filters + nav) ───── */
function renderCategories(categories) {
  CATEGORIES = categories;
  const filtersEl = document.getElementById('products');
  const navEl = document.getElementById('nav-links');

  let filterHTML = '<button class="filter-btn active" data-category="All" onclick="filterCategory(\'All\')">All</button>';
  let navHTML = '<a href="/shop" class="active" onclick="event.preventDefault(); filterCategory(\'All\')">All</a>';

  categories.forEach(cat => {
    const name = cat.name;
    const escaped = name.replace(/'/g, "\\'");
    filterHTML += `<button class="filter-btn" data-category="${name}" onclick="filterCategory('${escaped}')">${name}</button>`;
    navHTML += `<a href="#" onclick="event.preventDefault(); filterCategory('${escaped}')">${name}</a>`;
  });

  if (filtersEl) filtersEl.innerHTML = filterHTML;
  if (navEl) navEl.innerHTML = navHTML;
}

/* ───── Render Products ───── */
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');

  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:var(--muted); font-size:15px;">No products found.</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const inStock = p.in_stock !== false;
    const oosSizes = p.out_of_stock_sizes || [];
    return `
    <div class="card" onclick="openProduct('${p.name.replace(/'/g, "\\'")}')">
      ${!inStock
        ? `<span class="card-badge card-badge-oos">Stock Out</span>`
        : (p.badge ? `<span class="card-badge">${p.badge}</span>` : '')}
      <img class="card-img" src="${p.image || ''}" alt="${p.item_name}" loading="lazy" />
      <div class="card-swatches">
        ${(p.colors || []).map(c => `<div class="swatch" style="background:${c}" onclick="event.stopPropagation()"></div>`).join('')}
      </div>
      <div class="card-body">
        <div class="card-cat">${p.category}</div>
        <div class="card-name">${p.item_name}</div>
        <div class="card-footer">
          <div>
            <span class="card-price">৳${Number(p.price).toLocaleString()}</span>
            ${p.old_price ? `<span class="card-price-old">৳${Number(p.old_price).toLocaleString()}</span>` : ''}
          </div>
          ${inStock
            ? `<button class="card-add" onclick="event.stopPropagation(); addToCart('${p.name.replace(/'/g, "\\'")}', this)" title="Add to bag">
                <svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>`
            : `<button class="card-add card-add-disabled" disabled onclick="event.stopPropagation()" title="Stock Out"></button>`}
        </div>
        <div class="card-sizes" style="margin-top:10px">
          ${(p.sizes || []).map(s => `<div class="size-dot ${oosSizes.includes(s) ? 'oos' : ''}">${s}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
  }).join('');
}

/* ───── Filter ───── */
function filterCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-category') === cat);
  });
  document.querySelectorAll('#nav-links a').forEach((a, i) => {
    const navCats = ['All', ...CATEGORIES.map(c => c.name)];
    a.classList.toggle('active', navCats[i] === cat);
  });
  const titleEl = document.getElementById('section-title');
  if (titleEl) titleEl.textContent = cat === 'All' ? 'All Products' : cat;

  if (cat === 'All') {
    renderProducts(ALL_PRODUCTS);
  } else {
    renderProducts(ALL_PRODUCTS.filter(p => p.category === cat));
  }
}


async function addToCart(itemName, btn) {
  const p = ALL_PRODUCTS.find(x => x.name === itemName);
  if (!p) return;
  if (p.in_stock === false) {
    showToast('This item is out of stock.');
    return;
  }

  // Handle visual feedback
  let originalHTML = '';
  if (btn) {
    originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="font-size:10px">...</span>';
  }

  let targetName = p.name;
  if (p.has_variants && p.default_variant) {
    targetName = p.default_variant;
  }

  const existing = cart.find(x => x.name === targetName);
  if (existing) { existing.qty++; }
  else { cart.push({...p, name: targetName, qty: 1}); }
  
  try {
    await syncCart();
    showToast('Added to bag — ' + p.item_name);
  } catch (err) {
    showToast('Failed to add to bag.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }
}


function openProduct(itemName) {
  window.location.href = '/product?name=' + encodeURIComponent(itemName);
}

/* ───── Init ───── */
async function init() {
  try {
    const [categories, products] = await Promise.all([
      apiCall('frappe_ecommerce.api.storefront.get_categories'),
      apiCall('frappe_ecommerce.api.storefront.get_products')
    ]);

    renderCategories(categories || []);
    ALL_PRODUCTS = products || [];
    renderProducts(ALL_PRODUCTS);

    if (USER !== 'Guest') {
      cart = await apiCall('frappe_ecommerce.api.storefront.get_cart') || [];
      const local = getLocalCart();
      if (local.length > 0) {
        local.forEach(l => {
          const existing = cart.find(c => c.name === l.name);
          if (existing) { existing.qty += l.qty; }
          else { cart.push(l); }
        });
        saveLocalCart([]); 
        await syncCart();
      }
    } else {
      cart = getLocalCart();
    }
    updateCartUI();
  } catch (err) {
    console.error('Failed to load shop data:', err);
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.textContent = 'Error loading products';
  }
}

init();
