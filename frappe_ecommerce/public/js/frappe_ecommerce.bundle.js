// ecommerce.js must load first: it defines window.cart and the shared
// helpers (apiCall, showToast, syncCart, updateCartUI, ...) that the other
// files read from `window` at both call-time and, in checkout.js's case,
// at module top-level evaluation time.
import "./ecommerce.js";
import "./checkout.js";
import "./product.js";
import "./shop.js";