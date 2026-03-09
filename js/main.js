/**
 * MAIN.JS - Main JavaScript Functions
 * Common functions used across all pages
 * Handles authentication, navigation, and utility functions
 */

/**
 * Check authentication status and update navigation
 * Hides/shows login/register links based on user authentication
 */
// function checkAuthStatus() {
//     const token = localStorage.getItem('token');
//     const loginLink = document.getElementById('loginLink');
//     const registerLink = document.getElementById('registerLink');
//     const logoutItem = document.getElementById('logoutItem');
//     const logoutLink = document.getElementById('logoutLink');

//     if (token) {
//         // User is logged in
//         if (loginLink) loginLink.style.display = 'none';
//         if (registerLink) registerLink.style.display = 'none';
//         if (logoutItem) logoutItem.style.display = 'block';
        
//         // Add logout event listener
//         if (logoutLink) {
//             logoutLink.addEventListener('click', function(e) {
//                 e.preventDefault();
//                 logout();
//             });
//         }
//     } else {
//         // User is not logged in
//         if (loginLink) loginLink.style.display = 'block';
//         if (registerLink) registerLink.style.display = 'block';
//         if (logoutItem) logoutItem.style.display = 'none';
//     }
// }


async function checkAuthStatus() {
    try {
        const loginLink = document.getElementById("loginLink");
        const registerLink = document.getElementById("registerLink");
        const logoutItem = document.getElementById("logoutItem");
        const dashboardItem = document.getElementById("dashboardItem");
        const dashboardLink = document.getElementById("dashboardLink");

        let user = null;
        try {
            const me = await fetchAuthMe();
            user = me && me.authenticated ? me.user : null;
        } catch (_) {
            user = null;
        }

        if (!user) {
            if (loginLink) {
                loginLink.style.display = "inline-block";
                if (loginLink.parentElement && loginLink.parentElement.tagName === "LI") loginLink.parentElement.style.display = "inline-block";
            }
            if (registerLink) {
                registerLink.style.display = "inline-block";
                if (registerLink.parentElement && registerLink.parentElement.tagName === "LI") registerLink.parentElement.style.display = "inline-block";
            }
            if (logoutItem) logoutItem.style.display = "none";
            if (dashboardItem) dashboardItem.style.display = "none";
            return;
        }

        if (loginLink) {
            loginLink.style.display = "none";
            if (loginLink.parentElement && loginLink.parentElement.tagName === "LI") loginLink.parentElement.style.display = "none";
        }
        if (registerLink) {
            registerLink.style.display = "none";
            if (registerLink.parentElement && registerLink.parentElement.tagName === "LI") registerLink.parentElement.style.display = "none";
        }
        if (logoutItem) logoutItem.style.display = "inline-block";
        if (dashboardItem) dashboardItem.style.display = "inline-block";

        if (dashboardLink) {
            const role = String(user.role || "").toUpperCase();
            if (role === "ADMIN") {
                dashboardLink.href = "admin-dashboard.html";
                dashboardLink.textContent = "Dashboard";
            } else if (role === "VENDOR") {
                dashboardLink.href = "vendor-dashboard.html";
                dashboardLink.textContent = "Vendor Dashboard";
            } else {
                dashboardLink.href = "user-dashboard.html";
                dashboardLink.textContent = "My Account";
            }
        }
    } catch (error) {
        console.error("Error in checkAuthStatus:", error);
    }
}




/**
 * Update cart count badge in navigation
 * Fetches cart items and displays the total count
 */
async function updateCartCount() {
    const badge = document.getElementById("cartBadge"); // Matches existing ID in main.js
    const badge2 = document.getElementById("cartCount"); // Matches ID used in api.js
    const navCart = document.getElementById("navCartCount");

    try {
        if (typeof fetchCartItems !== 'function') return;

        const cartItems = await fetchCartItems();
        let count = 0;
        if (Array.isArray(cartItems)) {
            count = cartItems.reduce((sum, item) => {
                const qty = item && item.quantity ? Number(item.quantity) : 0;
                return sum + (Number.isFinite(qty) ? qty : 0);
            }, 0);
        }

        if (badge) {
            if (count > 0) {
                badge.textContent = `(${count})`;
                badge.style.display = "inline";
            } else {
                badge.textContent = "";
                badge.style.display = "none";
            }
        }
        if (badge2) {
            badge2.textContent = String(count);
        }
        if (navCart) {
            navCart.textContent = String(count);
        }

    } catch (e) {
        if (badge) badge.style.display = "none";
        if (badge2) badge2.textContent = "0";
        if (navCart) navCart.textContent = "0";
    }
}




/**
 * Update wishlist count badge in navigation
 * Fetches wishlist items and displays the total count
 */
async function updateWishlistCount() {
    const wishlistCountElement = document.getElementById('wishlistCount');
    const wishlistBadgeElement = document.getElementById('wishlistBadge'); // Handle user-dashboard ID
    const navWishlist = document.getElementById('navWishlistCount');
    
    if (!wishlistCountElement && !wishlistBadgeElement && !navWishlist) return;

    try {
        const wishlistItems = await fetchWishlistItems();
        const count = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
        
        if (wishlistCountElement) wishlistCountElement.textContent = String(count);
        if (wishlistBadgeElement) wishlistBadgeElement.textContent = String(count);
        if (navWishlist) navWishlist.textContent = String(count);
    } catch (error) {
        if (wishlistCountElement) wishlistCountElement.textContent = '0';
        if (wishlistBadgeElement) wishlistBadgeElement.textContent = '0';
        if (navWishlist) navWishlist.textContent = '0';
    }
}

/**
 * Add product to cart
 * Checks authentication first, then adds product to cart
 * @param {string} productId - Product ID to add
 */
async function addToCartHandler(productId) {
    try {
        await addToCart(productId, 1);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await updateCartCount();
        showToast('Added to cart', 'success');
    } catch (error) {
        if (error && error.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        console.error('Error adding to cart:', error);
        showToast('Failed to add product to cart', 'error');
    }
}

/**
 * Toggle wishlist (add/remove product)
 * Adds product if not in wishlist, removes if already in wishlist
 * @param {string} productId - Product ID to toggle
 */
async function toggleWishlist(productId) {
    try {
        // First, check if item is already in wishlist
        const wishlistItems = await fetchWishlistItems();
        const existingItem = wishlistItems.find(item => {
            const pid = (item && item.product && item.product.id) ? item.product.id : item.productId;
            return String(pid) === String(productId);
        });
        
        if (existingItem) {
            // Remove from wishlist
            await removeWishlistItem(existingItem.id || existingItem._id);
            if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
            await updateWishlistCount();
        } else {
            // Add to wishlist
            await addToWishlist(productId);
            if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
            await updateWishlistCount();
        }
    } catch (error) {
        if (error && error.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        console.error('Error toggling wishlist:', error);
        alert('Failed to update wishlist. Please try again.');
    }
}

/**
 * Mobile menu toggle
 * Handles hamburger menu for responsive navigation
 */
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
});

/**
 * Format price to display with currency symbol
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
    return `₹${price.toFixed(2)}`;
}

/**
 * Show toast notification (simple alert alternative)
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, error, info)
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add CSS animations for toast
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}


document.addEventListener("DOMContentLoaded", () => {
    checkAuthStatus();
    updateCartCount();
    
    if (typeof updateWishlistCount === 'function') {
        updateWishlistCount();
    }

    // Attach logout listener
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            (async () => {
                try {
                    if (typeof logout === 'function') {
                        await logout();
                    }
                } finally {
                    window.location.href = 'index.html';
                }
            })();
        });
    }

    const modal = document.getElementById('consultationModal');
    const openBtn = document.getElementById('openConsultation');
    const closeBtn = document.querySelector('.close-modal-btn');

    if (openBtn) {
        openBtn.onclick = () => {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Lock scroll
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Unlock scroll
        };
    }

    // Handle form success
    const form = document.getElementById('luxeConsultForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const header = document.querySelector('.modal-header');
            if (header) {
                header.innerHTML = `
                    <h2 style="color: #b8860b;">Thank You</h2>
                    <p>Your request has been submitted to our specialists.</p>
                `;
            }
            form.style.display = 'none';
            setTimeout(() => { modal.style.display = 'none'; }, 3000);
        };
    }
});

// Live UI updates across pages when cart/wishlist changes
window.addEventListener('luxe:data-changed', () => {
    updateCartCount();
    updateWishlistCount();
});
