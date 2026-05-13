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

  const mainImg = document.getElementById('main-img');
  if (mainImg) mainImg.src = p.image || '';

  const thumbsRow = document.getElementById('thumbs-row');
  if (thumbsRow && p.image) {
    thumbsRow.innerHTML = `<img class="thumb active" src="${p.image}" onclick="setThumb(this,'${p.image}')" />`;
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
      sizesEl.innerHTML = sizes.map(s =>
        `<button class="size-btn" onclick="selectSize(this,'${s}')">${s}</button>`
      ).join('');
    } else {
      const label = sizesEl.previousElementSibling;
      if (label && label.classList.contains('info-label')) label.style.display = 'none';
      sizesEl.style.display = 'none';
    }
  }
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
}
function selectSize(el, size) {
  selectedSize = size;
  document.querySelectorAll('.size-btn').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}
function changeQty(delta) {
  qty = Math.max(1, qty + delta);
  const qtyEl = document.getElementById('qty-val');
  if (qtyEl) qtyEl.textContent = qty;
}


async function addToCart() {
  if (!product) return;
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
