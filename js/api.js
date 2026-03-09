/**
 * API.js - Session-based API Communication Module
 * Technology rules:
 * - Vanilla JS Fetch API only
 * - Session auth via HttpSession cookies (credentials: 'include')
 */

const API_BASE_URL = 'http://localhost:8080/api';

async function apiRequest(path, options = {}) {
    const {
        method = 'GET',
        body,
        headers = {},
    } = options;

    const fetchOptions = {
        method,
        credentials: 'include',
        headers: { ...headers },
    };

    if (body !== undefined) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
        const message = (data && data.message) ? data.message : `Request failed (${res.status})`;
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

// =========================
// Auth
// =========================

async function register(name, email, password) {
    return await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
    });
}

async function login(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
    });
}

async function logout() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
        // Always clear any old localStorage remnants from previous JWT version
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    }
}

async function fetchAuthMe() {
    return await apiRequest('/auth/me');
}

// =========================
// Products
// =========================

async function fetchProducts() {
    const data = await apiRequest('/products');
    return Array.isArray(data) ? data : (data && data.products ? data.products : []);
}

async function fetchProductById(productId) {
    const data = await apiRequest(`/products/${encodeURIComponent(productId)}`);
    return data && data.product ? data.product : data;
}

// =========================
// Cart
// =========================

async function fetchCartItems() {
    const data = await apiRequest('/cart');
    return Array.isArray(data) ? data : (data && data.items ? data.items : []);
}

async function addToCart(productId, quantity = 1) {
    return await apiRequest('/cart', {
        method: 'POST',
        body: { productId: String(productId), quantity: Number(quantity) || 1 },
    });
}

async function updateCartItemQuantity(cartItemId, quantity) {
    return await apiRequest(`/cart/update/${encodeURIComponent(cartItemId)}`, {
        method: 'PUT',
        body: { quantity: Number(quantity) },
    });
}

async function removeCartItem(cartItemId) {
    return await apiRequest(`/cart/${encodeURIComponent(cartItemId)}`, {
        method: 'DELETE',
    });
}

async function clearUserCart() {
    return await apiRequest('/cart/clear', { method: 'DELETE' });
}

// =========================
// Wishlist
// =========================

async function fetchWishlistItems() {
    const data = await apiRequest('/wishlist');
    return Array.isArray(data) ? data : (data && data.items ? data.items : []);
}

async function addToWishlist(productId) {
    return await apiRequest('/wishlist', {
        method: 'POST',
        body: { productId: String(productId) },
    });
}

async function removeWishlistItem(wishlistItemId) {
    return await apiRequest(`/wishlist/${encodeURIComponent(wishlistItemId)}`, {
        method: 'DELETE',
    });
}

// =========================
// Orders
// =========================

async function fetchMyOrders() {
    const data = await apiRequest('/orders');
    return Array.isArray(data) ? data : (data && data.orders ? data.orders : []);
}

async function createOrder(shippingAddress) {
    return await apiRequest('/orders/create', {
        method: 'POST',
        body: { shippingAddress },
    });
}

async function applyCoupon(code) {
    return await apiRequest('/coupons/apply', {
        method: 'POST',
        body: { code },
    });
}

async function createOrderWithCoupon(shippingAddress, couponCode) {
    const body = { shippingAddress };
    if (couponCode) body.couponCode = couponCode;
    return await apiRequest('/orders/create', { method: 'POST', body });
}

async function processPayment(orderId, stripeToken) {
    return await apiRequest('/orders/payment', {
        method: 'POST',
        body: { orderId, stripeToken },
    });
}

// =========================
// User / Dashboard
// =========================

async function fetchMe() {
    return await apiRequest('/users/me');
}

async function fetchMyStats() {
    return await apiRequest('/users/me/stats');
}

async function updateMyProfile(updates) {
    return await apiRequest('/users/me', {
        method: 'PUT',
        body: updates || {},
    });
}

async function setMyPhone(phone) {
    return await apiRequest('/users/me/phone', {
        method: 'PUT',
        body: { phone },
    });
}

// =========================
// Addresses (required: /api/address)
// =========================

async function fetchMyAddresses() {
    const data = await apiRequest('/address');
    return Array.isArray(data) ? data : [];
}

async function addMyAddress(address) {
    return await apiRequest('/address', {
        method: 'POST',
        body: address,
    });
}

async function updateMyAddress(id, address) {
    return await apiRequest(`/address/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: address,
    });
}

async function deleteMyAddress(id) {
    return await apiRequest(`/address/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

// =========================
// Small shared helpers
// =========================

function dispatchDataChanged() {
    window.dispatchEvent(new CustomEvent('luxe:data-changed'));
}

// Consultation modal (legacy - safe no-op if elements missing)
document.addEventListener('DOMContentLoaded', () => {
    initializeConsultationModal();
});

function initializeConsultationModal() {
    const modal = document.getElementById('consultationModal');
    const openBtn = document.getElementById('openConsultation');
    const closeBtn = document.querySelector('.close-modal-btn');
    const form = document.getElementById('luxeConsultForm');

    if (openBtn && modal) {
        openBtn.onclick = () => {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    if (form && modal) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const header = document.querySelector('.modal-header');
            if (header) {
                header.innerHTML = `
                    <h2 style="color: #b8860b;">Thank You</h2>
                    <p>Your request has been submitted.</p>
                `;
            }
            form.style.display = 'none';
            setTimeout(() => { modal.style.display = 'none'; }, 3000);
        };
    }
}

