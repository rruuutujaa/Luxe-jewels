/**
 * User Dashboard Logic (Session-based, live MongoDB data)
 * - No static data
 * - Instant UI updates after any action
 * - Sidebar switches sections without reload
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ensure navbar reflects session auth state
        if (typeof checkAuthStatus === 'function') await checkAuthStatus();
        if (typeof updateCartCount === 'function') await updateCartCount();
        if (typeof updateWishlistCount === 'function') await updateWishlistCount();

        await bootstrapDashboard();
        setupEventListeners();
        await switchTab('overview');
    } catch (e) {
        console.error('Dashboard init failed:', e);
    }
});

async function bootstrapDashboard() {
    // Require logged-in session for dashboard
    try {
        const me = await fetchMe();
        if (!me || !me.success) {
            window.location.href = 'login.html';
            return;
        }
        window.currentUser = me.user;
        updateProfileUI(me.user);
    } catch (e) {
        if (e && e.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        throw e;
    }
}

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await logout();
            } finally {
                window.location.href = 'index.html';
            }
        });
    }

    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSaveAddress();
        });
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleUpdateProfile();
        });
    }
}

// =========================
// Sidebar navigation
// =========================

window.switchTab = async function (tabId) {
    // Menu active state
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-menu a[onclick="switchTab('${tabId}')"]`);
    if (activeLink) activeLink.classList.add('active');

    // Content visibility
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(tabId);
    if (section) section.classList.add('active');

    // Load live data per tab
    if (tabId === 'overview') await loadOverviewData();
    if (tabId === 'orders') await loadOrdersData();
    if (tabId === 'wishlist') await loadWishlistData();
    if (tabId === 'cart') await loadCartData();
    if (tabId === 'addresses') await loadAddressData();
    if (tabId === 'profile') await loadProfileFormData();
};

// =========================
// Overview
// =========================

async function loadOverviewData() {
    const me = await fetchMe();
    if (!me || !me.success) return;
    window.currentUser = me.user;
    updateProfileUI(me.user);

    setText('welcomeName', me.user.name || 'Valued Customer');

    // Stats (orders/spent/wishlist/cart)
    const [orders, wishlist, cart] = await Promise.all([
        fetchMyOrders().catch(() => []),
        fetchWishlistItems().catch(() => []),
        fetchCartItems().catch(() => []),
    ]);

    const totalOrders = Array.isArray(orders) ? orders.length : 0;
    const totalSpent = Array.isArray(orders)
        ? orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
        : 0;
    const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
    const cartCount = Array.isArray(cart)
        ? cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        : 0;

    setText('statOrders', String(totalOrders));
    setText('statSpent', formatMoney(totalSpent));
    setText('statWishlist', String(wishlistCount));
    setText('statCart', String(cartCount));

    // Recent orders (latest 5)
    renderRecentOrders(Array.isArray(orders) ? orders : []);

    // Wishlist preview (latest 3)
    renderWishlistPreview(Array.isArray(wishlist) ? wishlist : []);

    // Cart preview (latest items + total)
    renderCartPreview(Array.isArray(cart) ? cart : []);

    // Default address preview + profile preview
    await renderOverviewAddressAndProfile();

    // Navbar counts
    if (typeof updateCartCount === 'function') await updateCartCount();
    if (typeof updateWishlistCount === 'function') await updateWishlistCount();
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;

    const sorted = orders.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recent = sorted.slice(0, 5);

    if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 30px;">No orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(order => `
        <tr>
            <td>#${shortId(order.id || order._id)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td><span class="status-badge status-${String(order.status || 'pending').toLowerCase()}">${order.status || 'PENDING'}</span></td>
            <td>${formatMoney(Number(order.total || 0))}</td>
            <td><a href="#" onclick="switchTab('orders')" class="btn-link">View</a></td>
        </tr>
    `).join('');
}

function renderWishlistPreview(items) {
    const container = document.getElementById('overviewWishlist');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Your wishlist is empty.</p>';
        return;
    }

    container.innerHTML = items.slice(0, 3).map(item => {
        const p = item.product || {};
        return `
            <div class="widget-item">
                <img src="${p.imageUrl || 'https://placehold.co/60x60?text=Jewel'}" class="widget-img" alt="${escapeHtml(p.name || '')}">
                <div class="widget-info">
                    <div class="widget-name">${escapeHtml(p.name || 'Product')}</div>
                    <div class="widget-price">${formatMoney(Number(p.price || 0))}</div>
                </div>
                <div class="widget-actions">
                    <button onclick="moveWishlistToCart('${p.id}', '${item.id}')" class="btn-outline" style="padding: 5px 10px;" title="Add to Cart">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button onclick="removeFromWishlist('${item.id}')" class="btn-outline" style="padding: 5px 10px; border-color: var(--danger); color: var(--danger);" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCartPreview(items) {
    const container = document.getElementById('overviewCart');
    const summary = document.getElementById('overviewCartSummary');
    const totalEl = document.getElementById('overviewCartTotal');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Your cart is empty.</p>';
        if (summary) summary.style.display = 'none';
        return;
    }

    let total = 0;
    container.innerHTML = items.slice(0, 4).map(item => {
        const p = item.product || {};
        const qty = Number(item.quantity || 0);
        const price = Number(p.price || 0);
        total += price * qty;
        return `
            <div class="widget-item">
                <img src="${p.imageUrl || 'https://placehold.co/60x60?text=Jewel'}" class="widget-img" alt="${escapeHtml(p.name || '')}">
                <div class="widget-info">
                    <div class="widget-name">${escapeHtml(p.name || 'Product')}</div>
                    <div class="widget-price">${formatMoney(price)} x ${qty}</div>
                </div>
                <div class="widget-actions">
                    <button onclick="deleteCartItem('${item.id}')" class="btn-outline" style="padding: 5px 10px; border-color: var(--danger); color: var(--danger);" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (summary) summary.style.display = 'block';
    if (totalEl) totalEl.textContent = formatMoney(total);
}

async function renderOverviewAddressAndProfile() {
    const profileContainer = document.getElementById('overviewProfile');
    const addressContainer = document.getElementById('overviewAddress');
    const user = window.currentUser;

    if (profileContainer && user) {
        profileContainer.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="width: 50px; height: 50px; background: var(--off-white); border: 1px solid var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gold-dark); font-weight: 600;">
                    ${(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--black);">${escapeHtml(user.name || 'User')}</div>
                    <div style="color: var(--gray); font-size: 0.9rem;">${escapeHtml(user.email || '')}</div>
                    <div style="color: var(--gray); font-size: 0.9rem;">${escapeHtml(user.phone || 'No phone added')}</div>
                </div>
            </div>
        `;
    }

    if (addressContainer) {
        const addresses = await fetchMyAddresses().catch(() => []);
        if (addresses.length) {
            const addr = addresses[0];
            addressContainer.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <span class="status-badge status-processing" style="font-size: 0.7rem;">${escapeHtml(addr.label || 'Address')}</span>
                </div>
                <div style="font-weight: 600; font-family: var(--font-heading); margin-bottom: 5px;">${escapeHtml(addr.name || '')}</div>
                <div style="color: var(--gray); font-size: 0.9rem; line-height: 1.5;">
                    ${escapeHtml(addr.line1 || '')}<br>
                    ${escapeHtml(addr.city || '')}, ${escapeHtml(addr.state || '')} - ${escapeHtml(addr.pincode || '')}
                </div>
            `;
        } else {
            addressContainer.innerHTML = `
                <p class="text-muted" style="margin-bottom: 15px;">No saved addresses.</p>
                <a href="#" onclick="openAddressModal()" class="btn-outline" style="font-size: 0.8rem;">+ Add Address</a>
            `;
        }
    }
}

// =========================
// Orders
// =========================

async function loadOrdersData() {
    const tbody = document.getElementById('ordersBody');
    const emptyState = document.getElementById('ordersEmpty');
    const tableContainer = document.querySelector('#orders .table-responsive');
    if (!tbody || !emptyState || !tableContainer) return;

    const orders = await fetchMyOrders().catch(() => []);

    if (!orders.length) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    const sorted = orders.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    tbody.innerHTML = sorted.map(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemNames = items.map(i => `${i.productName || 'Item'} (x${i.quantity || 1})`).join(', ');
        return `
            <tr>
                <td><strong>#${shortId(order.id || order._id)}</strong></td>
                <td>
                    <div style="font-size: 0.9rem; color: var(--charcoal); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(itemNames)}">
                        ${escapeHtml(itemNames || '—')}
                    </div>
                </td>
                <td>${formatDate(order.createdAt)}</td>
                <td><span class="status-badge status-${String(order.status || 'pending').toLowerCase()}">${order.status || 'PENDING'}</span></td>
                <td>${formatMoney(Number(order.total || 0))}</td>
                <td><button class="btn-outline" style="padding: 6px 10px;" onclick="viewOrder('${order.id || order._id}')">View</button></td>
            </tr>
        `;
    }).join('');
}

window.viewOrder = function () {
    // Minimal: no modal required for now
};

// =========================
// Wishlist
// =========================

async function loadWishlistData() {
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmpty');
    if (!grid || !emptyState) return;

    const items = await fetchWishlistItems().catch(() => []);
    if (!items.length) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    grid.style.display = 'grid';

    grid.innerHTML = items.map(item => {
        const p = item.product || {};
        return `
            <div class="stat-card" style="padding: 15px; position: relative;">
                <button onclick="removeFromWishlist('${item.id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem;">&times;</button>
                <img src="${p.imageUrl || 'https://placehold.co/300x220?text=Jewel'}" alt="${escapeHtml(p.name || '')}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">
                <h4 style="font-family: var(--font-heading); margin-bottom: 5px; font-size: 1rem;">${escapeHtml(p.name || 'Product')}</h4>
                <div style="color: var(--gold-dark); font-weight: 600; margin-bottom: 10px;">${formatMoney(Number(p.price || 0))}</div>
                <button onclick="moveWishlistToCart('${p.id}', '${item.id}')" class="btn-gold" style="width: 100%; font-size: 0.85rem;">Add to Cart</button>
            </div>
        `;
    }).join('');
}

window.removeFromWishlist = async function (id) {
    try {
        await removeWishlistItem(id);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([loadWishlistData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
    }
};

window.moveWishlistToCart = async function (productId, wishlistId) {
    try {
        await addToCart(productId, 1);
        await removeWishlistItem(wishlistId);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([loadWishlistData(), loadCartData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
    }
};

// =========================
// Cart
// =========================

async function loadCartData() {
    const tbody = document.getElementById('cartTableBody');
    const emptyState = document.getElementById('cartEmpty');
    const totalEl = document.getElementById('cartTotal');
    const tableWrap = document.querySelector('#cart .table-responsive');
    if (!tbody || !emptyState || !totalEl || !tableWrap) return;

    const items = await fetchCartItems().catch(() => []);
    if (!items.length) {
        tableWrap.style.display = 'none';
        emptyState.style.display = 'block';
        totalEl.textContent = formatMoney(0);
        return;
    }

    emptyState.style.display = 'none';
    tableWrap.style.display = 'block';

    let total = 0;
    tbody.innerHTML = items.map(item => {
        const p = item.product || {};
        const qty = Number(item.quantity || 0);
        const price = Number(p.price || 0);
        const lineTotal = price * qty;
        total += lineTotal;
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${p.imageUrl || 'https://placehold.co/60x60?text=Jewel'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <span>${escapeHtml(p.name || 'Product')}</span>
                    </div>
                </td>
                <td>${formatMoney(price)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button onclick="updateCartQty('${item.id}', ${qty - 1})" class="btn-outline" style="padding: 2px 8px;">−</button>
                        <span>${qty}</span>
                        <button onclick="updateCartQty('${item.id}', ${qty + 1})" class="btn-outline" style="padding: 2px 8px;">+</button>
                    </div>
                </td>
                <td>${formatMoney(lineTotal)}</td>
                <td>
                    <button onclick="deleteCartItem('${item.id}')" style="color: var(--danger); background: none; border: none; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    totalEl.textContent = formatMoney(total);
}

window.updateCartQty = async function (cartItemId, newQty) {
    if (newQty < 1) return;
    try {
        await updateCartItemQuantity(cartItemId, newQty);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([loadCartData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
    }
};

window.deleteCartItem = async function (cartItemId) {
    try {
        await removeCartItem(cartItemId);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([loadCartData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
    }
};

// =========================
// Addresses
// =========================

window.openAddressModal = function () {
    const modal = document.getElementById('addressModal');
    if (modal) modal.style.display = 'flex';
};

window.closeAddressModal = function () {
    const modal = document.getElementById('addressModal');
    if (modal) modal.style.display = 'none';
};

async function loadAddressData() {
    const list = document.getElementById('addressList');
    const empty = document.getElementById('addressEmpty');
    if (!list || !empty) return;

    const addresses = await fetchMyAddresses().catch(() => []);
    if (!addresses.length) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = addresses.map(addr => `
        <div class="address-card">
            <span class="address-type">${escapeHtml(addr.label || 'Address')}</span>
            <h4 style="margin-bottom: 10px; font-family: var(--font-heading);">${escapeHtml(addr.name || '')}</h4>
            <p style="color: var(--gray); font-size: 0.9rem; line-height: 1.6;">
                ${escapeHtml(addr.line1 || '')}<br>
                ${addr.line2 ? escapeHtml(addr.line2) + '<br>' : ''}
                ${escapeHtml(addr.city || '')}, ${escapeHtml(addr.state || '')} - ${escapeHtml(addr.pincode || '')}<br>
                Phone: ${escapeHtml(addr.phone || '')}
            </p>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="editAddress('${addr.id}')" class="btn-outline" style="font-size: 0.8rem;">Edit</button>
                <button onclick="deleteAddress('${addr.id}')" class="btn-outline" style="color: var(--danger); border-color: var(--danger); font-size: 0.8rem;">Delete</button>
            </div>
        </div>
    `).join('');
}

window.editAddress = async function (id) {
    const addresses = await fetchMyAddresses().catch(() => []);
    const addr = addresses.find(a => a && String(a.id) === String(id));
    if (!addr) return;

    setInput('addrLabel', addr.label);
    setInput('addrName', addr.name);
    setInput('addrPhone', addr.phone);
    setInput('addrLine1', addr.line1);
    setInput('addrLine2', addr.line2);
    setInput('addrCity', addr.city);
    setInput('addrState', addr.state);
    setInput('addrPin', addr.pincode);

    const form = document.getElementById('addressForm');
    if (form) form.setAttribute('data-edit-id', id);
    const title = document.querySelector('#addressModal h2');
    if (title) title.textContent = 'Edit Address';
    openAddressModal();
};

async function handleSaveAddress() {
    const form = document.getElementById('addressForm');
    const editId = form ? form.getAttribute('data-edit-id') : null;

    const address = {
        label: val('addrLabel'),
        name: val('addrName'),
        phone: val('addrPhone'),
        line1: val('addrLine1'),
        line2: val('addrLine2'),
        city: val('addrCity'),
        state: val('addrState'),
        pincode: val('addrPin'),
    };

    try {
        if (editId) {
            await updateMyAddress(editId, address);
        } else {
            await addMyAddress(address);
        }

        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();

        if (form) {
            form.removeAttribute('data-edit-id');
            form.reset();
        }
        const title = document.querySelector('#addressModal h2');
        if (title) title.textContent = 'Add Address';
        closeAddressModal();
        await Promise.all([loadAddressData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
        alert(e && e.message ? e.message : 'Failed to save address');
    }
}

window.deleteAddress = async function (id) {
    try {
        await deleteMyAddress(id);
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([loadAddressData(), loadOverviewData()]);
    } catch (e) {
        console.error(e);
    }
};

// =========================
// Profile
// =========================

async function loadProfileFormData() {
    const me = await fetchMe().catch(() => null);
    if (!me || !me.success) return;
    window.currentUser = me.user;
    setInput('profileNameInput', me.user.name);
    setInput('profileEmailInput', me.user.email);
    setInput('profilePhoneInput', me.user.phone);
}

async function handleUpdateProfile() {
    const newName = val('profileNameInput');
    const newPhone = val('profilePhoneInput');

    try {
        if (newPhone) {
            await setMyPhone(newPhone);
        }
    } catch (e) {
        // phone may be locked, show message but continue with name update
    }

    try {
        await updateMyProfile({ name: newName });
        if (typeof dispatchDataChanged === 'function') dispatchDataChanged();
        await Promise.all([bootstrapDashboard(), loadOverviewData(), loadProfileFormData()]);
        alert('Profile updated');
    } catch (e) {
        console.error(e);
        alert(e && e.message ? e.message : 'Failed to update profile');
    }
}

// =========================
// Helpers
// =========================

function updateProfileUI(user) {
    if (!user) return;
    setText('sidebarName', user.name || '');
    setText('sidebarEmail', user.email || '');
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    setText('sidebarAvatar', initial);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function formatMoney(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function shortId(id) {
    const s = String(id || '');
    if (!s) return '—';
    return s.slice(-6).toUpperCase();
}

function escapeHtml(str) {
    return String(str || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

