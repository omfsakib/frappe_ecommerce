/* ───── State ───── */
let product = null;
let qty = 1;
let selectedSize = null;
let selectedColor = 0;
let wished = false;

/* ───── Render Product Detail ───── */
function renderProduct(p) {
  product = p;
  document.title = p.item_name + ' — THREAD';
  const bcCat = document.getElementById('bc-cat');
  if (bcCat) bcCat.textContent = p.category;
  
  const bcName = document.getElementById('bc-name');
  if (bcName) bcName.textContent = p.item_name;
  
  const infoCat = document.getElementById('info-cat');
  if (infoCat) infoCat.textContent = p.category;
  
  const infoName = document.getElementById('info-name');
  if (infoName) infoName.textContent = p.item_name;
  
  const infoPrice = document.getElementById('info-price');
  if (infoPrice) infoPrice.textContent = '৳' + Number(p.price).toLocaleString();
  
  const infoDesc = document.getElementById('info-desc');
  if (infoDesc) infoDesc.innerHTML = p.description || '';

  if (p.old_price) {
    const oldPriceEl = document.getElementById('info-old');
    if (oldPriceEl) {
      oldPriceEl.textContent = '৳' + Number(p.old_price).toLocaleString();
      oldPriceEl.style.display = '';
    }
    const saveEl = document.getElementById('info-save');
    if (saveEl) {
      const save = Math.round((1 - p.price / p.old_price) * 100);
      saveEl.textContent = save + '% off';
      saveEl.style.display = '';
    }
  }

  if (p.badge) {
    const b = document.getElementById('prod-badge');
    if (b) { b.textContent = p.badge; b.style.display = ''; }
  }

  const gallery = (p.gallery_images && p.gallery_images.length) ? p.gallery_images : (p.image ? [p.image] : []);

  const mainImg = document.getElementById('main-img');
  if (mainImg) mainImg.src = gallery[0] || p.image || '';

  const thumbsRow = document.getElementById('thumbs-row');
  if (thumbsRow && gallery.length) {
    thumbsRow.innerHTML = gallery.map((src, i) =>
      `<img class="thumb ${i === 0 ? 'active' : ''}" src="${src}" onclick="setThumb(this,'${src}')" />`
    ).join('');
  }

  // Colors
  const colors = p.colors || [];
  const swatchesEl = document.getElementById('swatches');
  if (swatchesEl) {
    if (colors.length > 0) {
      swatchesEl.innerHTML = colors.map((c, i) =>
        `<button class="swatch-btn ${i===0?'active':''}" style="background:${c.hex || c}" title="${c.name || c}" onclick="selectColor(this,${i})"></button>`
      ).join('');
    } else {
      const label = swatchesEl.previousElementSibling;
      if (label && label.classList.contains('info-label')) label.style.display = 'none';
      swatchesEl.style.display = 'none';
    }
  }

  // Sizes
  const sizes = p.sizes || [];
  const sizesEl = document.getElementById('sizes');
  if (sizesEl) {
    if (sizes.length > 0) {
      renderSizeButtons();
    } else {
      const label = sizesEl.previousElementSibling;
      if (label && label.classList.contains('info-label')) label.style.display = 'none';
      sizesEl.style.display = 'none';
    }
  }

  refreshAddButtonState();
}

/* ───── Stock Availability ───── */
function isSizeAvailable(size) {
  if (!product || !product.has_variants) return true;
  const colorLabel = product.colors.length > 0 ? (product.colors[selectedColor].name || product.colors[selectedColor]) : null;
  return (product.variants || []).some(v => {
    if (colorLabel && v.attributes['Color'] !== colorLabel) return false;
    if (v.attributes['Size'] !== size) return false;
    return v.in_stock;
  });
}

function renderSizeButtons() {
  const sizesEl = document.getElementById('sizes');
  if (!sizesEl || !product) return;
  const sizes = product.sizes || [];
  if (selectedSize && !isSizeAvailable(selectedSize)) selectedSize = null;
  sizesEl.innerHTML = sizes.map(s => {
    const available = isSizeAvailable(s);
    const isActive = selectedSize === s;
    return `<button class="size-btn ${isActive ? 'active' : ''} ${available ? '' : 'oos'}" ${available ? '' : 'disabled'} onclick="selectSize(this,'${s}')">${s}</button>`;
  }).join('');
}

function refreshAddButtonState() {
  const btn = document.getElementById('btn-add');
  if (!btn || !product) return;

  let outOfStock = !product.in_stock;

  if (!outOfStock && product.has_variants) {
    const colorLabel = product.colors.length > 0 ? (product.colors[selectedColor].name || product.colors[selectedColor]) : null;
    if (colorLabel || selectedSize) {
      const match = (product.variants || []).find(v => {
        if (colorLabel && v.attributes['Color'] !== colorLabel) return false;
        if (selectedSize && v.attributes['Size'] !== selectedSize) return false;
        return true;
      });
      if (match && !match.in_stock) outOfStock = true;
    }
  }

  btn.disabled = outOfStock;
  btn.textContent = outOfStock ? 'Stock Out' : 'Add to Bag';
}

/* ───── Render Related Products ───── */
function renderRelated(products, currentName) {
  const grid = document.getElementById('related-grid');
  if (!grid) return;
  const related = products.filter(p => p.name !== currentName).slice(0, 4);
  grid.innerHTML = related.map(p =>
    `<div class="rel-card" onclick="location.href='/product?name=${encodeURIComponent(p.name)}'">
      <img src="${p.image || ''}" alt="${p.item_name}" loading="lazy" />
      <div class="rel-card-body">
        <div class="rel-cat">${p.category}</div>
        <div class="rel-name">${p.item_name}</div>
        <div class="rel-price">৳${Number(p.price).toLocaleString()}</div>
      </div>
    </div>`
  ).join('');
}

/* ───── UI Interactions ───── */
function setThumb(el, src) {
  const mainImg = document.getElementById('main-img');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}
function selectColor(el, idx) {
  selectedColor = idx;
  document.querySelectorAll('.swatch-btn').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  renderSizeButtons();
  refreshAddButtonState();
}
function selectSize(el, size) {
  if (el.disabled) return;
  selectedSize = size;
  renderSizeButtons();
  refreshAddButtonState();
}
function changeQty(delta) {
  qty = Math.max(1, qty + delta);
  const qtyEl = document.getElementById('qty-val');
  if (qtyEl) qtyEl.textContent = qty;
}


async function addToCart() {
  if (!product) return;
  if (!product.in_stock) {
    showToast('This item is out of stock.');
    return;
  }
  const sizes = product.sizes || [];
  if (sizes.length > 0 && !selectedSize) {
    showToast('Please select a size first!');
    return;
  }

  const btn = document.getElementById('btn-add');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Adding...';

  let targetName = product.name;
  let targetAttrs = {};

  if (product.has_variants) {
    const colorLabel = product.colors.length > 0 ? (product.colors[selectedColor].name || product.colors[selectedColor]) : null;
    const sizeLabel = selectedSize;

    const match = (product.variants || []).find(v => {
      let isMatch = true;
      if (colorLabel && v.attributes["Color"] !== colorLabel) isMatch = false;
      if (sizeLabel && v.attributes["Size"] !== sizeLabel) isMatch = false;
      return isMatch;
    });

    if (!match) {
      showToast('Selected combination is not available.');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    if (!match.in_stock) {
      showToast('Selected combination is out of stock.');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    targetName = match.name;
    targetAttrs = match.attributes;
  }
  
  const existing = cart.find(x => x.name === targetName);
  if (existing) { existing.qty += qty; }
  else { 
    cart.push({
      ...product, 
      name: targetName, 
      qty: qty,
      variant_attributes: targetAttrs
    }); 
  }
  
  try {
    await syncCart();
    const attrText = Object.values(targetAttrs).join(' / ');
    const finalLabel = attrText ? `${product.item_name} (${attrText})` : product.item_name;
    showToast(`${finalLabel} × ${qty} added to bag!`);
  } catch (err) {
    showToast('Failed to add to bag.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function toggleWish() {
  wished = !wished;
  const btn = document.getElementById('btn-wish');
  if (btn) btn.classList.toggle('active', wished);
  showToast(wished ? 'Added to wishlist ♥' : 'Removed from wishlist');
}

// Exposed for inline onclick handlers in the product page markup — the
// build bundles this file into a private closure, so these need to be
// reachable from window.
window.setThumb = setThumb;
window.selectColor = selectColor;
window.selectSize = selectSize;
window.changeQty = changeQty;
window.addToCart = addToCart;
window.toggleWish = toggleWish;

/* ───── Init ───── */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const itemName = params.get('name');

  if (!itemName) {
    const nameEl = document.getElementById('info-name');
    if (nameEl) nameEl.textContent = 'Product not found';
    return;
  }

  try {
    const [productData, allProducts] = await Promise.all([
      apiCall('frappe_ecommerce.api.storefront.get_product', { name: itemName }),
      apiCall('frappe_ecommerce.api.storefront.get_products')
    ]);

    if (!productData) {
      const nameEl = document.getElementById('info-name');
      if (nameEl) nameEl.textContent = 'Product not found';
      return;
    }

    renderProduct(productData);
    renderRelated(allProducts || [], itemName);

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
    console.error('Failed to load product:', err);
  }
}

init();
