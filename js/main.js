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


function checkAuthStatus() {
    try {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        const loginLink = document.getElementById("loginLink");
        const registerLink = document.getElementById("registerLink");
        const logoutItem = document.getElementById("logoutItem");
        const dashboardItem = document.getElementById("dashboardItem");
        const dashboardLink = document.getElementById("dashboardLink");

        if (!token) {
            // logged OUT view
            // Show parent LI if possible, or just the link
            if (loginLink) {
                loginLink.style.display = "inline-block";
                if(loginLink.parentElement && loginLink.parentElement.tagName === 'LI') loginLink.parentElement.style.display = 'inline-block';
            }
            if (registerLink) {
                registerLink.style.display = "inline-block";
                if(registerLink.parentElement && registerLink.parentElement.tagName === 'LI') registerLink.parentElement.style.display = 'inline-block';
            }
            if (logoutItem) logoutItem.style.display = "none";
            if (dashboardItem) dashboardItem.style.display = "none";
            return;
        }

        // logged IN view
        if (loginLink) {
            loginLink.style.display = "none";
            // Hide the bullet point too
            if(loginLink.parentElement && loginLink.parentElement.tagName === 'LI') loginLink.parentElement.style.display = 'none';
        }
        if (registerLink) {
            registerLink.style.display = "none";
             if(registerLink.parentElement && registerLink.parentElement.tagName === 'LI') registerLink.parentElement.style.display = 'none';
        }
        if (logoutItem) logoutItem.style.display = "inline-block";
        if (dashboardItem) dashboardItem.style.display = "inline-block";

        // role routing
        if (dashboardLink) {
            dashboardLink.href =
                role && role.toUpperCase() === "ADMIN"
                ? "admin-dashboard.html"
                : "user-dashboard.html";
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
    const token = localStorage.getItem('token');
    const badge = document.getElementById("cartBadge"); // Matches existing ID in main.js
    const badge2 = document.getElementById("cartCount"); // Matches ID used in api.js

    if (!token) {
        if (badge) badge.style.display = "none";
        if (badge2) badge2.textContent = "0";
        return;
    }

    try {
        // Ensure fetchCartItems is available (from api.js)
        if (typeof fetchCartItems !== 'function') return;

        const cartItems = await fetchCartItems();
        let count = 0;
        if (Array.isArray(cartItems)) {
            count = cartItems.reduce((sum, item) => {
                // Filter out null products to match cart display logic
                if (!item.product) return sum;
                return sum + (item.quantity || 1);
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

    } catch (e) {
        console.error("Failed to update cart count", e);
    }
}




/**
 * Update wishlist count badge in navigation
 * Fetches wishlist items and displays the total count
 */
async function updateWishlistCount() {
    const token = localStorage.getItem('token');
    const wishlistCountElement = document.getElementById('wishlistCount');
    const wishlistBadgeElement = document.getElementById('wishlistBadge'); // Handle user-dashboard ID
    
    if (!wishlistCountElement && !wishlistBadgeElement) return;

    if (!token) {
        if (wishlistCountElement) wishlistCountElement.textContent = '0';
        if (wishlistBadgeElement) wishlistBadgeElement.textContent = '0';
        return;
    }

    try {
        const wishlistItems = await fetchWishlistItems();
        const count = wishlistItems.length || '0';
        
        if (wishlistCountElement) wishlistCountElement.textContent = count;
        if (wishlistBadgeElement) wishlistBadgeElement.textContent = count;
    } catch (error) {
        if (wishlistCountElement) wishlistCountElement.textContent = '0';
        if (wishlistBadgeElement) wishlistBadgeElement.textContent = '0';
    }
}

/**
 * Add product to cart
 * Checks authentication first, then adds product to cart
 * @param {string} productId - Product ID to add
 */
async function addToCartHandler(productId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Please login to add items to cart.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await addToCart(productId, 1);
        if (response.success) {
            updateCartCount();
            window.location.href = 'cart.html';
        } else {
            alert(response.message || 'Failed to add product to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart. Please try again.');
    }
}

/**
 * Toggle wishlist (add/remove product)
 * Adds product if not in wishlist, removes if already in wishlist
 * @param {string} productId - Product ID to toggle
 */
async function toggleWishlist(productId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Please login to add items to wishlist.');
        window.location.href = 'login.html';
        return;
    }

    try {
        // First, check if item is already in wishlist
        const wishlistItems = await fetchWishlistItems();
        const existingItem = wishlistItems.find(item => {
            const pid = (item && item.product && item.product.id) ? item.product.id : item.productId;
            return String(pid) === String(productId);
        });
        
        if (existingItem) {
            // Remove from wishlist
            await removeWishlistItem(existingItem.id);
            updateWishlistCount();
        } else {
            // Add to wishlist
            const response = await addToWishlist(productId);
            if (response.success) {
                updateWishlistCount();
            } else {
                alert(response.message || 'Failed to add to wishlist');
            }
        }
    } catch (error) {
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
            if (typeof logout === 'function') {
                logout();
            } else {
                console.error('Logout function not found');
                // Fallback
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('role');
                window.location.href = 'index.html';
            }
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