/* ───── Global State ───── */
let cart = [];

/* ───── API Helper ───── */
function apiCall(method, args, type = 'GET') {
  const options = {
    method: type,
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': csrf_token
    }
  };

  let url = '/api/method/' + method;
  if (type === 'GET') {
    const params = new URLSearchParams(args || {});
    const qs = params.toString() ? '?' + params.toString() : '';
    url += qs;
  } else {
    options.body = JSON.stringify(args || {});
  }

  return fetch(url, options)
    .then(r => r.json())
    .then(d => d.message);
}

/* ───── Cookie Helpers ───── */
function getLocalCart() {
  const name = "cart=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') { c = c.substring(1); }
    if (c.indexOf(name) == 0) {
      try { return JSON.parse(c.substring(name.length, c.length)); }
      catch(e) { return []; }
    }
  }
  return [];
}

function saveLocalCart(items) {
  const d = new Date();
  d.setTime(d.getTime() + (30*24*60*60*1000));
  const expires = "expires="+ d.toUTCString();
  document.cookie = "cart=" + JSON.stringify(items) + ";" + expires + ";path=/";
}

async function syncCart() {
  if (USER !== 'Guest') {
    await apiCall('frappe_ecommerce.api.storefront.sync_cart', { cart_items: JSON.stringify(cart) });
  } else {
    saveLocalCart(cart);
  }
  updateCartUI();
}

/* ───── UI Helpers ───── */
function toggleCart() {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (overlay) overlay.classList.toggle('open');
  if (drawer) drawer.classList.toggle('open');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const countEls = document.querySelectorAll('.cart-badge, #cart-count');
  countEls.forEach(el => el.textContent = count);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = '৳' + total.toLocaleString();

  const itemsEl = document.getElementById('cart-items');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<div class="cart-empty">Your bag is empty.</div>';
    return;
  }
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image || ''}" alt="${item.item_name}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.item_name}</div>
        <div class="cart-item-meta">${item.category}</div>
        <div class="cart-item-row">
          <span class="cart-item-price">৳${Number(item.price).toLocaleString()}</span>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', -1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function changeQty(itemName, delta) {
  const idx = cart.findIndex(x => x.name === itemName);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartUI();
  await syncCart();
}

function checkout() {
  window.location.href = '/checkout';
}

async function initCart() {
  if (USER !== 'Guest') {
    cart = await apiCall('frappe_ecommerce.api.storefront.get_cart') || [];
  } else {
    cart = getLocalCart();
  }
  updateCartUI();
}

window.addEventListener('DOMContentLoaded', initCart);
