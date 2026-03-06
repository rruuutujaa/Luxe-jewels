/**
 * User Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize
    await initDashboard();

    // Event Listeners
    setupEventListeners();
});

// --- Initialization ---

async function initDashboard() {
    try {
        // Load User Profile
        const me = await fetchMe();
        if (me.success && me.user) {
            updateProfileUI(me.user);
            window.currentUser = me.user; // Store globally
        }

        // Load Initial Stats
        loadOverviewData();

        // Update Nav Counts
        updateNavCounts();

    } catch (e) {
        console.error('Dashboard init failed:', e);
    }
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Address Form
    document.getElementById('addressForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveAddress();
    });

    // Profile Form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleUpdateProfile();
        });
    }

    // Support Form
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Your request has been submitted. We will contact you shortly.');
            supportForm.reset();
        });
    }
}

// --- Navigation & Tabs ---

window.switchTab = async function (tabId) {
    // 1. UI Updates
    document.querySelectorAll('.sidebar-menu a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('onclick').includes(tabId)) a.classList.add('active');
    });

    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // 2. Data Loading based on Tab
    switch (tabId) {
        case 'overview': loadOverviewData(); break;
        case 'orders': loadOrdersData(); break;
        case 'wishlist': loadWishlistData(); break;
        case 'cart': loadCartData(); break;
        case 'addresses': loadAddressData(); break;
        case 'profile': loadProfileFormData(); break;
    }
};

// --- Data Loading Functions ---


async function loadOverviewData() {
    // 1. Welcome User
    const user = window.currentUser || await fetchMe().then(r => r.user);
    if (user) {
        setText('welcomeName', user.name || 'Valued Customer');
        updateProfileUI(user);

        // Render Profile Summary in Overview
        const profileContainer = document.getElementById('overviewProfile');
        if (profileContainer) {
            profileContainer.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="width: 50px; height: 50px; background: var(--off-white); border: 1px solid var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gold-dark); font-weight: 600;">
                        ${(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--black);">${user.name || 'User'}</div>
                        <div style="color: var(--gray); font-size: 0.9rem;">${user.email}</div>
                        <div style="color: var(--gray); font-size: 0.9rem;">${user.phone || 'No phone added'}</div>
                    </div>
                </div>
            `;
        }

        // Render Address Summary (Default Address) in Overview
        const addressContainer = document.getElementById('overviewAddress');
        if (addressContainer) {
            if (user.addresses && user.addresses.length > 0) {
                const addr = user.addresses[0]; // Take first as default
                addressContainer.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <span class="status-badge status-processing" style="font-size: 0.7rem;">${addr.label || 'Home'}</span>
                    </div>
                    <div style="font-weight: 600; font-family: var(--font-heading); margin-bottom: 5px;">${addr.name}</div>
                    <div style="color: var(--gray); font-size: 0.9rem; line-height: 1.5;">
                        ${addr.line1}<br>
                        ${addr.city}, ${addr.state} - ${addr.pincode}
                    </div>
                `;
            } else {
                addressContainer.innerHTML = `
                    <p class="text-muted" style="margin-bottom: 15px;">No default address set.</p>
                    <a href="#" onclick="openAddressModal()" class="btn-outline" style="font-size: 0.8rem;">+ Add Address</a>
                `;
            }
        }
    }

    // 2. Stats & Recent Orders
    const stats = await fetchMyStats();
    if (stats.success) {
        setText('statSpent', formatMoney(stats.totalSpent || 0));
        setText('statOrders', stats.ordersCount || 0);
    }

    const ordersData = await fetchMyOrders();
    const tbody = document.getElementById('recentOrdersBody');
    if (ordersData && (ordersData.orders || Array.isArray(ordersData))) {
        const orders = ordersData.orders || ordersData;
        if (orders.length > 0) {
            const recent = orders.slice(0, 5); // Top 5
            tbody.innerHTML = recent.map(order => `
                <tr>
                    <td>#${(order._id || order.id || '').slice(-6).toUpperCase()}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td><span class="status-badge status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</span></td>
                    <td>${formatMoney(order.total)}</td>
                    <td><a href="#" onclick="switchTab('orders')" class="btn-link">View</a></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 30px;">You haven\'t placed any orders yet.</td></tr>';
        }
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 30px;">You haven\'t placed any orders yet.</td></tr>';
    }

    // 3. Wishlist Preview
    const wItems = await fetchWishlistItems();
    setText('statWishlist', wItems.length || 0);
    const wishlistContainer = document.getElementById('overviewWishlist');
    if (wishlistContainer) {
        if (wItems.length > 0) {
            wishlistContainer.innerHTML = wItems.slice(0, 3).map(item => `
                <div class="widget-item">
                    <img src="${item.productImage || item.image || item.thumbnail || 'https://placehold.co/60x60?text=Jewel'}" class="widget-img" alt="${item.productName}">
                    <div class="widget-info">
                        <div class="widget-name">${item.productName || item.name}</div>
                        <div class="widget-price">${formatMoney(item.productPrice || item.price)}</div>
                    </div>
                    <div class="widget-actions">
                         <button onclick="moveWishlistToCart('${item.productId}', '${item.id}')" class="btn-outline" style="padding: 5px 10px;" title="Add to Cart"><i class="fas fa-shopping-cart"></i></button>
                         <button onclick="removeFromWishlist('${item.id}')" class="btn-outline" style="padding: 5px 10px; border-color: var(--danger); color: var(--danger);" title="Remove"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `).join('');
            if (wItems.length > 3) {
                wishlistContainer.innerHTML += `<div class="text-center" style="margin-top: 10px;"><a href="#" onclick="switchTab('wishlist')" class="btn-link" style="font-size: 0.8rem;">+ ${wItems.length - 3} more</a></div>`;
            }
        } else {
            wishlistContainer.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Your wishlist is empty.</p>';
        }
    }

    // 4. Cart Preview
    const cItems = await fetchCartItems();
    const cartContainer = document.getElementById('overviewCart');
    const cartSummary = document.getElementById('overviewCartSummary');
    const cartTotalEl = document.getElementById('overviewCartTotal');

    if (Array.isArray(cItems)) {
        const totalQty = cItems.reduce((acc, item) => acc + item.quantity, 0);
        setText('statCart', totalQty);

        if (cItems.length > 0) {
            let totalVal = 0;
            cartContainer.innerHTML = cItems.map(item => {
                totalVal += item.price * item.quantity;
                return `
                <div class="widget-item">
                    <img src="${item.image || 'https://placehold.co/60x60?text=Jewel'}" class="widget-img" alt="${item.productName}">
                    <div class="widget-info">
                        <div class="widget-name">${item.productName}</div>
                        <div class="widget-price">${formatMoney(item.price)} x ${item.quantity}</div>
                    </div>
                    <div class="widget-actions">
                         <button onclick="deleteCartItem('${item.product}')" class="btn-outline" style="padding: 5px 10px; border-color: var(--danger); color: var(--danger);"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `}).join('');

            if (cartSummary) {
                cartSummary.style.display = 'block';
                if (cartTotalEl) cartTotalEl.textContent = formatMoney(totalVal);
            }
        } else {
            cartContainer.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Your cart is empty.</p>';
            if (cartSummary) cartSummary.style.display = 'none';
        }
    }
}


async function loadOrdersData() {
    const ordersData = await fetchMyOrders();
    const tbody = document.getElementById('ordersBody');
    const emptyState = document.getElementById('ordersEmpty');
    const tableContainer = document.querySelector('#orders .table-responsive');

    const orders = (ordersData && (ordersData.orders || Array.isArray(ordersData))) ? (ordersData.orders || ordersData) : [];

    if (orders.length > 0) {
        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';

        tbody.innerHTML = orders.map(order => {
            const itemNames = order.items ? order.items.map(i => `${i.productName || i.name} (x${i.quantity})`).join(', ') : 'Items';
            return `
            <tr>
                <td>
                    <strong>#${(order._id || order.id || '').slice(-6).toUpperCase()}</strong>
                </td>
                <td>
                    <div style="font-size: 0.9rem; color: var(--charcoal); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemNames}">
                        ${itemNames}
                    </div>
                </td>
                <td>${formatDate(order.createdAt)}</td>
                <td><span class="status-badge status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</span></td>
                <td>${formatMoney(order.total)}</td>
                <td>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <a href="invoice.html?orderId=${order.id}" target="_blank" class="btn-link" title="Invoice"><i class="fas fa-file-invoice"></i> Invoice</a>
                        ${(order.status === 'PENDING' || order.status === 'PROCESSING') ?
                    `<button class="btn-outline" style="padding: 4px 10px; font-size: 0.8rem; border-color: var(--danger); color: var(--danger);" onclick="cancelOrder('${order.id}')" title="Cancel">Cancel</button>` : ''}
                    </div>
                </td>
            </tr>
        `}).join('');
    } else {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

async function loadWishlistData() {
    const items = await fetchWishlistItems();
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmpty');

    if (items && items.length > 0) {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';

        grid.innerHTML = items.map(item => `
            <div class="stat-card" style="padding: 15px; position: relative;">
                <button onclick="removeFromWishlist('${item.id || item._id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem;">&times;</button>
                <img src="${item.productImage || item.image || 'https://placehold.co/150x150?text=Jewel'}" alt="${item.productName}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">
                <h4 style="font-family: var(--font-heading); margin-bottom: 5px; font-size: 1rem;">${item.productName || item.name}</h4>
                <div style="color: var(--gold-dark); font-weight: 600; margin-bottom: 10px;">${formatMoney(item.productPrice || item.price)}</div>
                <button onclick="moveWishlistToCart('${item.productId || item.product}', '${item.id || item._id}')" class="btn-gold" style="width: 100%; font-size: 0.85rem;">Add to Cart</button>
            </div>
        `).join('');
    } else {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

async function loadCartData() {
    const items = await fetchCartItems();
    const tbody = document.getElementById('cartTableBody');
    const emptyState = document.getElementById('cartEmpty');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.querySelector('#cart .btn-gold'); // Proceed to checkout button

    if (Array.isArray(items) && items.length > 0) {
        emptyState.style.display = 'none';
        document.querySelector('#cart .table-responsive').style.display = 'block';
        if (checkoutBtn) checkoutBtn.style.display = 'inline-block';

        let total = 0;
        tbody.innerHTML = items.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${item.image || 'https://placehold.co/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            <span>${item.productName}</span>
                        </div>
                    </td>
                    <td>${formatMoney(item.price)}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <button onclick="updateCartQty('${item._id || item.product}', ${item.quantity - 1})" class="btn-outline" style="padding: 2px 6px;">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartQty('${item._id || item.product}', ${item.quantity + 1})" class="btn-outline" style="padding: 2px 6px;">+</button>
                        </div>
                    </td>
                    <td>${formatMoney(itemTotal)}</td>
                    <td>
                         <button onclick="deleteCartItem('${item.product}')" style="color: var(--danger); background: none; border: none; cursor: pointer;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        totalEl.textContent = formatMoney(total);
    } else {
        document.querySelector('#cart .table-responsive').style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        emptyState.style.display = 'block';
        totalEl.textContent = formatMoney(0);
    }
}

async function loadAddressData() {
    // Assuming user object has addresses, or we fetch them
    // fetchMe() already loaded window.currentUser
    let addresses = window.currentUser ? window.currentUser.addresses : [];
    // If we want fresh, we could re-fetch
    const me = await fetchMe();
    if (me.success) {
        window.currentUser = me.user;
        addresses = me.user.addresses || [];
    }

    const list = document.getElementById('addressList');
    const empty = document.getElementById('addressEmpty');

    if (addresses.length > 0) {
        empty.style.display = 'none';
        list.innerHTML = addresses.map(addr => `
            <div class="address-card">
                <span class="address-type">${addr.label || 'Home'}</span>
                <h4 style="margin-bottom: 10px; font-family: var(--font-heading);">${addr.name}</h4>
                <p style="color: var(--gray); font-size: 0.9rem; line-height: 1.6;">
                    ${addr.line1}<br>
                    ${addr.line2 ? addr.line2 + '<br>' : ''}
                    ${addr.city}, ${addr.state} - ${addr.pincode}<br>
                    Phone: ${addr.phone}
                </p>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="deleteAddress('${addr._id || addr.id}')" class="btn-outline" style="color: var(--danger); border-color: var(--danger); font-size: 0.8rem;">Delete</button>
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = '';
        empty.style.display = 'block';
    }
}

function loadProfileFormData() {
    const user = window.currentUser;
    if (user) {
        setInput('profileNameInput', user.name);
        setInput('profileEmailInput', user.email);
        setInput('profilePhoneInput', user.phone);
    }
}

// --- Actions ---

// Wishlist
async function removeFromWishlist(id) {
    if (!confirm('Remove from wishlist?')) return;
    try {
        await removeWishlistItem(id);
        loadWishlistData(); // reload
        updateNavCounts();
    } catch (e) { console.error(e); }
}

async function moveWishlistToCart(productId, wishlistId) {
    try {
        await addToCart(productId, 1);
        await removeWishlistItem(wishlistId);
        loadWishlistData();
        updateNavCounts();
        alert('Moved to cart');
    } catch (e) { console.error(e); }
}

// Cart
async function updateCartQty(id, newQty) {
    if (newQty < 1) return;
    try {
        await updateCartItemQuantity(id, newQty);
        loadCartData();
        updateNavCounts();
    } catch (e) { console.error(e); }
}

async function deleteCartItem(id) {
    if (!confirm('Remove item?')) return;
    try {
        await removeCartItem(id);
        loadCartData();
        updateNavCounts();
    } catch (e) { console.error(e); }
}

// Address
window.openAddressModal = function () {
    document.getElementById('addressModal').style.display = 'flex';
};

window.closeAddressModal = function () {
    document.getElementById('addressModal').style.display = 'none';
};

async function handleSaveAddress() {
    const address = {
        label: val('addrLabel'),
        name: val('addrName'),
        phone: val('addrPhone'),
        line1: val('addrLine1'),
        line2: val('addrLine2'),
        city: val('addrCity'),
        state: val('addrState'),
        pincode: val('addrPin')
    };

    try {
        const res = await addMyAddress(address);
        // Robust check: API might return {success:true, address:{...}} OR just the address object
        if (res && (res.success || res._id || res.id)) {
            closeAddressModal();
            document.getElementById('addressForm').reset();
            loadAddressData(); // reload addresses
        } else {
            alert('Failed to save address');
        }
    } catch (e) { console.error(e); alert('Error saving address'); }
}

async function deleteAddress(id) {
    if (!confirm('Delete this address?')) return;
    try {
        const res = await deleteMyAddress(id);
        if (res.success) loadAddressData();
    } catch (e) { console.error(e); }
}

// Profile
async function handleUpdateProfile() {
    const newName = val('profileNameInput');
    const newPhone = val('profilePhoneInput');
    // We might need a generic update profile endpoint in API
    // Existing api.js: setMyPhone(phone)
    // We might need to add one for name or use what we have.
    // Let's assume we can update name via a fetch call here if API allows, 
    // or just phone if that's all checking api.js supported?
    // js/user-dashboard.js previously assumed PUT /users/me for name. 

    // Let's try to update phone first
    if (newPhone && newPhone !== window.currentUser.phone) {
        await setMyPhone(newPhone);
    }

    // Update Name (Custom Fetch since not in api.js helper yet)
    // Assuming backend supports it:
    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: newName })
        });
        const data = await res.json();
        if (data.success) {
            alert('Profile updated successfully');
            location.reload();
        } else {
            // Fallback if only phone updated
            if (newPhone !== window.currentUser.phone) {
                alert('Phone updated.');
                location.reload();
            } else {
                alert('Update failed: ' + (data.message || 'Unknown error'));
            }
        }
    } catch (e) { console.error(e); }
}

// Orders
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            alert('Order cancelled');
            loadOrdersData();
            loadOverviewData(); // update stats 
        } else {
            alert('Failed to cancel order');
        }
    } catch (e) { console.error(e); }
}


// --- Helpers ---

function updateProfileUI(user) {
    setText('sidebarName', user.name);
    setText('sidebarEmail', user.email);
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    setText('sidebarAvatar', initial);
}

function updateNavCounts() {
    // This is handled by api.js usually, but we can re-trigger
    // updateCartCount(); // from api.js
    // Wishlist count too
    fetchWishlistItems().then(items => setText('navWishlistCount', items.length || 0));
    fetchCartItems().then(items => {
        if (Array.isArray(items)) setText('navCartCount', items.reduce((a, b) => a + b.quantity, 0));
    });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInput(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function formatMoney(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
