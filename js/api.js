/**
 * API.js - API Communication Module
 * This file handles all API calls to the backend using Fetch API
 * Base URL for backend API endpoints
 */

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Get authorization headers with JWT token
 * Retrieves the token from localStorage and returns headers object
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

/**
 * Authentication APIs
 */

/**
 * Register a new user
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Response object with success status and message
 */
async function register(name, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Login user and get JWT token
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Response object with token and user info
 */
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        // Store token in localStorage if login successful
        if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.user && data.user.role) {
                localStorage.setItem('role', String(data.user.role));
            } else {
                localStorage.removeItem('role');
            }
        }
        
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Logout user - clears token from localStorage
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

/**
 * Product APIs
 */

/**
 * Fetch all products from backend
 * @returns {Promise<Array>} Array of product objects
 */
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        return data.products || data || [];
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}

/**
 * Fetch single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
async function fetchProductById(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }

        const data = await response.json();
        return data.product || data;
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
}
/**
 * Cart APIs
 */

/**
 * Fetch cart items for logged-in user
 */
async function fetchCartItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.status === 401 || data.success === false) {
            localStorage.removeItem('token'); 
            window.location.href = 'login.html';
            return [];
        }

        return data.items || []; 
    } catch (error) {
        console.error('Error fetching cart items:', error);
        throw error;
    }
}

/**
 * Add product to cart
 */
async function addToCart(productId, quantity = 1) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                productId: String(productId), 
                quantity: parseInt(quantity) 
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
    }
}

/**
 * Update cart item quantity
 */
/**
 * Update cart item quantity
 */
async function updateCartItemQuantity(cartItemId, quantity) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/update/${cartItemId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        throw error;
    }
}
// NOTE: Stripe payment flow is implemented below (guarded initialization).

// Add this function to api.js
async function clearUserCart() {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/clear`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return await response.json();
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
}

/**
 * Remove item from cart
 */
async function removeCartItem(cartItemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/remove/${cartItemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error removing cart item:', error);
        throw error;
    }
}

/**
 * Create Order
 */
async function createOrder(shippingAddress) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ shippingAddress })
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

/**
 * Process Payment with Stripe
 * @param {string} orderId - Order ID
 * @param {string} stripeToken - Stripe Token ID
 * @returns {Promise<Object>} Response object
 */
async function processPayment(orderId, stripeToken) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/payment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                orderId: orderId,
                stripeToken: stripeToken
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

/**
 * Update cart count in navbar
 */
async function updateCartCount() {
    const token = localStorage.getItem('token');
    const cartCountElement = document.getElementById('cartCount');
    if (!cartCountElement) return;

    if (!token) {
        cartCountElement.textContent = '0';
        return;
    }

    try {
        const cartItems = await fetchCartItems();
        if (Array.isArray(cartItems)) {
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            cartCountElement.textContent = totalItems;
        }
    } catch (error) {
        console.error("Cart update failed:", error);
        cartCountElement.textContent = '0';
    }
}
/**
 * Wishlist APIs
 */

/**
 * Fetch wishlist items for logged-in user
 * @returns {Promise<Array>} Array of wishlist item objects
 */
async function fetchWishlistItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            throw new Error('Failed to fetch wishlist items');
        }

        const data = await response.json();
        return data.items || data || [];
    } catch (error) {
        console.error('Error fetching wishlist items:', error);
        throw error;
    }
}

/**
 * Add product to wishlist
 * @param {string} productId - Product ID to add
 * @returns {Promise<Object>} Response object
 */
async function addToWishlist(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/add`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ productId })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        throw error;
    }
}

/**
 * Remove item from wishlist
 * @param {string} wishlistItemId - Wishlist item ID to remove
 * @returns {Promise<Object>} Response object
 */
async function removeWishlistItem(wishlistItemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/remove/${wishlistItemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error removing wishlist item:', error);
        throw error;
    }
}


// Helpers
function isWishlisted(productId) {
    return false; 
}

function viewProductDetails(id) {
    window.location.href = `product-details.html?id=${id}`;
}

/**
 * User Dashboard APIs
 */

async function fetchMe() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            logout(); // Use the logout function
            return { success: false };
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching profile:', error);
        return { success: false, message: error.message };
    }
}

async function fetchMyStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/stats`, {
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            logout();
            return { success: false };
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { success: false };
    }
}

async function fetchMyOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/my`, {
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            logout();
            return { success: false };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false };
    }
}

/**
 * Admin APIs
 */
async function fetchAdminStats() {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, { headers: getAuthHeaders() });
    return await response.json();
}
async function fetchAdminAnalytics() {
    const response = await fetch(`${API_BASE_URL}/admin/analytics`, { headers: getAuthHeaders() });
    return await response.json();
}
async function fetchAdminOrders() {
    const response = await fetch(`${API_BASE_URL}/admin/orders`, { headers: getAuthHeaders() });
    return await response.json();
}
async function fetchAdminUsers() {
    const response = await fetch(`${API_BASE_URL}/admin/users`, { headers: getAuthHeaders() });
    return await response.json();
}
async function fetchLowStock() {
    const response = await fetch(`${API_BASE_URL}/admin/low-stock`, { headers: getAuthHeaders() });
    return await response.json();
}
async function updateAdminOrderStatus(orderId, status) {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
    });
    return await response.json();
}

// Admin Product Management
async function fetchAdminProducts() {
    const response = await fetch(`${API_BASE_URL}/admin/products`, { headers: getAuthHeaders() });
    return await response.json();
}
async function adminCreateProduct(product) {
    const response = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product)
    });
    return await response.json();
}
async function adminUpdateProduct(id, updates) {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
    });
    return await response.json();
}
async function adminDeleteProduct(id) {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return await response.json();
}
async function adminInitStock() {
    const response = await fetch(`${API_BASE_URL}/admin/products/init-stock`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return await response.json();
}

// User profile: phone set-once and addresses
async function setMyPhone(phone) {
    const response = await fetch(`${API_BASE_URL}/users/me/phone`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone })
    });
    return await response.json();
}
async function addMyAddress(address) {
    const response = await fetch(`${API_BASE_URL}/users/me/addresses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(address)
    });
    return await response.json();
}
async function deleteMyAddress(id) {
    const response = await fetch(`${API_BASE_URL}/users/me/addresses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return await response.json();
}

/**
 * UI & Initialization
 */

// 1. One single listener for the whole page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Modal (Moved outside to run once)
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

    if (form) {
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
            setTimeout(() => { if(modal) modal.style.display = 'none'; }, 3000);
        };
    }
}
