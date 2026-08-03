/* ───── Checkout Logic ───── */

function renderSummary() {
  const itemsEl = document.getElementById('summary-items');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">Your cart is empty</div>';
    document.getElementById('btn-place-order').disabled = true;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="summary-item">
      <img src="${item.image || ''}" alt="${item.item_name}" />
      <div class="summary-item-info">
        <div class="summary-item-name">${item.item_name}</div>
        <div class="summary-item-meta">Qty: ${item.qty}</div>
        <div class="summary-item-price">৳${(item.price * item.qty).toLocaleString()}</div>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  document.getElementById('summary-subtotal').textContent = '৳' + subtotal.toLocaleString();
  document.getElementById('summary-shipping').textContent = '৳' + (window.shippingAmount || 0).toLocaleString();
  document.getElementById('summary-total').textContent = '৳' + (subtotal + (window.shippingAmount || 0)).toLocaleString();
}

async function updateShippingCharge() {
  const area = document.querySelector('input[name="shipping_area"]:checked')?.value;
  if (!area) return;

  try {
    const res = await apiCall('frappe_ecommerce.api.storefront.calculate_shipping', {
      shipping_area: area,
      cart_items: JSON.stringify(cart)
    }, 'POST');
    
    window.shippingAmount = res.amount || 0;
    document.getElementById('summary-shipping').textContent = '৳' + window.shippingAmount.toLocaleString();
    renderSummary(); // Re-render to update total
  } catch (err) {
    console.error('Shipping calc error:', err);
  }
}

async function placeOrder() {
  const form = document.getElementById('checkout-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const btn = document.getElementById('btn-place-order');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.cart_items = JSON.stringify(cart);

  try {
    const response = await apiCall('frappe_ecommerce.api.storefront.place_order', data, 'POST');
    if (response && response.order_id) {
      // Success
      cart = [];
      saveLocalCart([]);
      document.getElementById('order-id').textContent = response.order_id;
      document.getElementById('success-overlay').style.display = 'flex';
    } else {
      showToast('Failed to place order. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('An error occurred during checkout.');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

async function initCheckout() {
  // Wait for ecommerce.js to load cart
  if (USER !== 'Guest') {
    const [cartData, userData] = await Promise.all([
      apiCall('frappe_ecommerce.api.storefront.get_cart'),
      apiCall('frappe_ecommerce.api.storefront.get_user_details')
    ]);
    cart = cartData || [];

    // Pre-fill form
    if (userData) {
      if (userData.first_name) document.getElementById('first_name').value = userData.first_name;
      if (userData.last_name) document.getElementById('last_name').value = userData.last_name;
      if (userData.phone) document.getElementById('phone').value = userData.phone;
    }
  } else {
    cart = getLocalCart();
  }

  // Attach shipping listeners
  document.querySelectorAll('input[name="shipping_area"]').forEach(input => {
    input.addEventListener('change', updateShippingCharge);
  });
  
  // Initial calculation
  await updateShippingCharge();

  renderSummary();
}

// Exposed for the inline onclick handler on the Place Order button — the
// build bundles this file into a private closure, so it needs to be
// reachable from window.
window.placeOrder = placeOrder;

// Override updateCartUI to also update summary if we are on checkout page
const originalUpdateCartUI = updateCartUI;
updateCartUI = function () {
  originalUpdateCartUI();
  renderSummary();
};

window.addEventListener('DOMContentLoaded', initCheckout);
