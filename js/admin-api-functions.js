/**
 * admin-dashboard.js
 * Comprehensive logic for Luxe Jewels Admin Dashboard
 */

// --- Global Utilities & Prototype Extensions ---
if (!Date.prototype.toLocaleLongDate) {
    Date.prototype.toLocaleLongDate = function () {
        if (isNaN(this.getTime())) return 'N/A';
        return this.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
}

// --- Global Functions (Exposed to Window) ---


function showMessage(msg, type) {
    const div = document.getElementById('adminMessage');
    if (div) {
        div.textContent = msg;
        div.className = `message ${type}`;
        div.style.display = 'block';
        setTimeout(() => div.style.display = 'none', 3000);
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// --- Initialization Logic ---

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Auth Check
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'ADMIN') {
        window.location.href = 'login.html';
        return;
    }

    const welcomeEl = document.getElementById('adminWelcome');
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${user.name || 'Admin'}`;
    }

    // 2. Initialize Components
    if (window.AdminAnalytics && typeof window.AdminAnalytics.init === 'function') {
        window.AdminAnalytics.init();
    }

    loadDashboardStats();
    loadRecentOrders();
    loadRecentUsers();
    initializeStockOnce();
    loadProducts();
    loadAnalytics();
    setupProductModal();
    setupRemoveProductModal();
    setupProductSorting();
    setupProductFilters();

    // 3. Global Event Listeners
    const logoutBtn = document.getElementById('logoutLink');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshDashboard);

    // 4. Component Setup

    // 5. Auto-refresh loop
    setInterval(() => {
        loadDashboardStats();
        loadRecentOrders();
        loadRecentUsers();
        loadProducts();
    }, 30000);

    console.log("ADMIN DASHBOARD INITIALIZED");
});

// --- Modal Helper functions ---
// --- Modal Helper functions ---
function setupModalClosers() {
    // Universal background click to close - controlled individually in setup functions
}

// --- Feature Implementation Functions ---

async function refreshDashboard() {
    const btn = document.getElementById('btnRefresh');
    if (btn) btn.classList.add('rotating');

    try {
        await Promise.all([
            loadDashboardStats(),
            loadRecentOrders(),
            loadRecentUsers(),
            loadProducts(),
            loadAnalytics()
        ]);
        if (window.AdminAnalytics && typeof window.AdminAnalytics.refreshCharts === 'function') {
            await window.AdminAnalytics.refreshCharts();
        }
        showMessage('Dashboard updated successfully', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Failed to refresh dashboard', 'error');
    } finally {
        if (btn) btn.classList.remove('rotating');
    }
}

async function loadDashboardStats() {
    try {
        const analytics = await fetchAdminAnalytics();
        if (analytics.success) {
            if (document.getElementById('statUsers')) document.getElementById('statUsers').textContent = analytics.totalUsers ?? 0;
            if (document.getElementById('statProducts')) document.getElementById('statProducts').textContent = analytics.totalProducts ?? 0;
            if (document.getElementById('statOrders')) document.getElementById('statOrders').textContent = analytics.totalOrders ?? 0;
            const rev = analytics.totalRevenue ?? 0;
            if (document.getElementById('statRevenue')) document.getElementById('statRevenue').textContent = '₹' + Number(rev).toLocaleString('en-IN');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentOrders() {
    const tbody = document.getElementById('ordersTbody');
    if (!tbody) return;
    try {
        const data = await fetchAdminOrders();
        if (data.success && Array.isArray(data.orders)) {
            const paidOnly = data.orders.filter(o => String(o.paymentStatus || '').toUpperCase() === 'PAID');
            const recentOrders = paidOnly.slice(0, 5);
            tbody.innerHTML = recentOrders.map(order => {
                const displayId = String(order.id || order._id || '');
                return `
                <tr>
                    <td>#${displayId.slice(-6).toUpperCase()}</td>
                    <td>${order.userName || 'Unknown'}</td>
                    <td>₹${(order.total || 0).toLocaleString('en-IN')}</td>
                    <td>${order.paymentStatus || 'PAID'}</td>
                    <td><span class="status-badge status-${(order.status || 'PAID').toLowerCase()}">${order.status || 'PAID'}</span></td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
            `}).join('');
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6">Failed to load orders</td></tr>';
    }
}

async function loadRecentUsers() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    try {
        const data = await fetchAdminUsers();
        if (data.success && data.users) {
            const recentUsers = data.users.slice(0, 5);
            tbody.innerHTML = recentUsers.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (e) { }
}

async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    try {
        const data = await fetchAdminProducts();
        const list = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
        if (list.length) {
            window.adminProducts = list;
            renderProductTable(list);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No products found. Add some!</td></tr>';
        }
    } catch (e) {
        console.error("Error loading products:", e);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: red;">Failed to load products.</td></tr>';
    }
}

function setupProductFilters() {
    const searchEl = document.getElementById('productSearch');
    const catEl = document.getElementById('productCategoryFilter');
    if (!searchEl || !catEl) return;

    const apply = () => {
        const q = searchEl.value.toLowerCase();
        const cat = catEl.value.toLowerCase();
        const filtered = (window.adminProducts || []).filter(p => {
            const okQ = !q || (String(p.name || '').toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q));
            const okC = !cat || String(p.category || '').toLowerCase().includes(cat);
            return okQ && okC;
        });
        renderProductTable(filtered);
    };
    searchEl.addEventListener('input', apply);
    catEl.addEventListener('input', apply);
}

function setupProductSorting() {
    const btnSort = document.getElementById('btnSortProduct');
    const dropdown = document.getElementById('sortDropdown');
    const options = document.querySelectorAll('.sort-option');

    if (btnSort && dropdown) {
        btnSort.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        window.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            const sortType = e.target.dataset.sort;
            sortProducts(sortType);
            dropdown.style.display = 'none';
        });
    });
}

function sortProducts(type) {
    if (!window.adminProducts || window.adminProducts.length === 0) return;

    let sorted = [...window.adminProducts];
    switch (type) {
        case 'price':
            sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'category':
            sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
        case 'name':
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'stock':
            sorted.sort((a, b) => (a.stock || 0) - (b.stock || 0));
            break;
    }

    // Re-render table with sorted data
    // We can reuse the filter logic or just manually update tbody if filters are empty
    // To be safe and respect filters, we should probably update the "source" for filters or just re-render
    // For simplicity, let's update window.adminProducts to sorted order (which might confuse if we re-fetch), 
    // but better: just call a render function.
    // However, loadProducts fetches from API. We want to sort client-side.
    // Let's manually render the sorted array.

    // Update window.adminProducts reference to keep sort order for filters? 
    // Actually, filters use window.adminProducts. If we sort that array, filters will use sorted order.
    // But filters creates a NEW array.
    // Let's simple re-render the table with the sorted array

    // Sort window.adminProducts in place so filters respect it properly
    window.adminProducts = sorted;
    renderProductTable(sorted);
}

function renderProductTable(list) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (list.length) {
        tbody.innerHTML = list.map(product => {
            const pid = String(product.id || product._id || '');
            return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 1rem;">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/50'}" alt="${product.name}" 
                    style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                </td>
                <td style="padding: 1rem; font-weight: 500; color: var(--lux-navy);">${product.name || '-'}</td>
                <td style="padding: 1rem; color: var(--text-secondary);">${product.category || '-'}</td>
                <td style="padding: 1rem; font-weight: 600; color: var(--lux-gold);">₹${(product.price || 0).toLocaleString('en-IN')}</td>
                <td style="padding: 1rem;">
                    <span style="background: ${product.stock < 10 ? '#fff0f0' : '#f0fff4'}; color: ${product.stock < 10 ? '#e63946' : '#2a9d8f'}; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">
                        ${product.stock}
                    </span>
                </td>
                <td style="padding: 1rem;">${product.isActive ? '<span style="color: #2a9d8f;">● Active</span>' : '<span style="color: #e63946;">● Inactive</span>'}</td>
                <td style="padding: 1rem; text-align: right;">
                    <button class="btn btn-sm btn-edit" onclick="editProduct('${pid}')" style="margin-right: 0.5rem; background: #f0f4ff; color: #4361ee; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;">Edit</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProduct('${pid}')" style="background: #fff0f0; color: #e63946; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;">Delete</button>
                </td>
            </tr>
        `}).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No products match.</td></tr>';
    }
}

async function loadAnalytics() {
    try {
        const data = await fetchAdminAnalytics();
        if (data && data.topProductsByRevenue && data.topProductsByRevenue.length > 0) {
            const top = data.topProductsByRevenue[0];
            // Log it or show it silently
            console.log('Top revenue product:', top);
        }
    } catch (e) { }
}

let currentEditingProductId = null;

function setupProductModal() {
    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');
    const btnAdd = document.getElementById('btnAddProduct');
    const btnClose = document.getElementById('closeAddProductModal');
    const btnCancel = document.getElementById('cancelAddProduct');

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            currentEditingProductId = null;
            form.reset();
            document.querySelector('#addProductModal .modal-header h2').textContent = '✨ Add New Product';
            modal.style.display = 'block';
        });
    }

    if (btnClose) btnClose.onclick = () => modal.style.display = 'none';
    if (btnCancel) btnCancel.onclick = () => modal.style.display = 'none';

    window.onclick = function (event) {
        if (event.target === modal) modal.style.display = 'none';
    };

    if (form) form.addEventListener('submit', handleProductFormSubmit);
}

function setupRemoveProductModal() {
    const modal = document.getElementById('removeProductModal');
    const btnRemove = document.getElementById('btnRemoveProduct');
    const btnClose = document.getElementById('closeRemoveProductModal');
    const btnCancel = document.getElementById('cancelRemoveProduct');
    const btnConfirm = document.getElementById('confirmRemoveProduct');

    if (btnRemove) {
        btnRemove.addEventListener('click', async () => {
            await renderRemoveProductList();
            modal.style.display = 'block';
        });
    }

    const closeModal = () => modal.style.display = 'none';

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;
    if (btnConfirm) btnConfirm.onclick = handleBulkDelete;

    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
}

async function renderRemoveProductList() {
    const container = document.getElementById('removeProductList');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading products...</div>';

    try {
        const data = await fetchAdminProducts();
        const list = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);

        if (list.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No products to remove.</div>';
            return;
        }

        container.innerHTML = list.map(product => `
            <div class="product-remove-item" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #fff; border: 1px solid #eee; border-radius: 12px; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/50'}" alt="${product.name}" 
                        style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h4 style="margin: 0; color: var(--lux-navy); font-size: 1rem;">${product.name}</h4>
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">Stock: ${product.stock}</span>
                    </div>
                </div>
                <div style="margin-right: 0.5rem;">
                    <label class="checkbox-container" style="cursor: pointer;">
                        <input type="checkbox" class="remove-check" value="${product.id || product._id}" style="width: 20px; height: 20px; accent-color: #ff4d4d;">
                    </label>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error("Error fetching products:", e);
        container.innerHTML = '<div style="color: red; text-align: center;">Failed to load products.</div>';
    }
}

async function handleBulkDelete() {
    const checkboxes = document.querySelectorAll('.remove-check:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.value);

    if (idsToDelete.length === 0) {
        showMessage('Please select at least one product to remove', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} products?`)) return;

    const btn = document.getElementById('confirmRemoveProduct');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Deleting...';
    btn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    // Execute deletions in sequence to avoid overwhelming the server
    for (const id of idsToDelete) {
        try {
            const res = await adminDeleteProduct(id);
            if (res.success) successCount++;
            else failCount++;
        } catch (e) {
            failCount++;
        }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;

    if (successCount > 0) {
        showMessage(`Successfully removed ${successCount} products.`, 'success');
        document.getElementById('removeProductModal').style.display = 'none';
        loadProducts(); // Refresh main table
    }

    if (failCount > 0) {
        setTimeout(() => showMessage(`Failed to remove ${failCount} products.`, 'error'), 2000);
    }
}

function editProduct(id) {
    const modal = document.getElementById('addProductModal');
    const product = (window.adminProducts || []).find(p => String(p.id || p._id || '') === String(id));
    if (!product) return;
    currentEditingProductId = id;
    fillProductForm(product);
    if (modal) modal.style.display = 'block';
}

function fillProductForm(product) {
    const title = document.querySelector('#addProductModal .modal-header h2');
    if (title) title.textContent = product ? '✏️ Edit Product' : '✨ Add New Product';

    document.getElementById('productName').value = product?.name || '';
    document.getElementById('productCategory').value = product?.category || '';
    document.getElementById('productPrice').value = product?.price || '';
    document.getElementById('productStock').value = product?.stock ?? 50;
    document.getElementById('productDescription').value = product?.description || '';
    document.getElementById('productImage').value = product?.imageUrl || product?.image || '';
    document.getElementById('productActive').checked = product ? (product.isActive !== false) : true;
}

async function handleProductFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value, 10);
    const description = document.getElementById('productDescription').value.trim();
    const imageUrl = document.getElementById('productImage').value.trim();
    const isActive = document.getElementById('productActive').checked;

    // Validation
    if (!name || !category || isNaN(price) || isNaN(stock) || !imageUrl) {
        showMessage('Please fill all required fields correctly', 'error');
        return;
    }

    const payload = {
        name,
        category,
        price,
        stock,
        description,
        imageUrl,
        isActive
    };

    try {
        let res;
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="loading-spinner">⏳</span> Saving...';
        btnSubmit.disabled = true;

        if (currentEditingProductId) {
            res = await adminUpdateProduct(currentEditingProductId, payload);
        } else {
            res = await adminCreateProduct(payload);
        }

        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (res.success) {
            showMessage(currentEditingProductId ? 'Updated!' : 'Created!', 'success');
            document.getElementById('addProductModal').style.display = 'none';
            loadProducts();
        } else {
            showMessage(res.message || 'Error', 'error');
        }
    } catch (e) { showMessage('Request failed', 'error'); }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        const res = await adminDeleteProduct(id);
        if (res.success) {
            showMessage('Deleted', 'success');
            loadProducts();
        }
    } catch (e) { }
}

function initializeStockOnce() {
    const key = 'stockInitialized';
    if (!localStorage.getItem(key)) {
        adminInitStock().then(res => {
            if (res && res.success) localStorage.setItem(key, 'true');
        }).catch(() => { });
    }
}

// Global Expose
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.refreshDashboard = refreshDashboard;
window.showMessage = showMessage;