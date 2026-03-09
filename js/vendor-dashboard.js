/**
 * Vendor Dashboard (Supplier Panel)
 * Fetch API with session cookies:
 * - credentials: 'include' is already handled by js/api.js via apiRequest()
 */

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    await updateCartCount();
    await updateWishlistCount();

    // Vendor-only gate
    try {
        const profile = await vendorFetchProfile();
        hydrateVendorSummary(profile);
        bindVendorProfileForm(profile);
        await vendorLoadOverview();
    } catch (e) {
        if (e && e.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        console.error(e);
    }

    const logoutBtn = document.getElementById('vendorLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try { await logout(); } finally { window.location.href = 'index.html'; }
        });
    }
});

window.vendorSwitch = async function (sectionId) {
    document.querySelectorAll('.vendor-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.vendor-menu a[onclick="vendorSwitch('${sectionId}')"]`);
    if (activeLink) activeLink.classList.add('active');

    document.querySelectorAll('.vd-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    if (sectionId === 'vd-overview') await vendorLoadOverview();
    if (sectionId === 'vd-products') await vendorLoadProducts();
    if (sectionId === 'vd-inventory') await vendorLoadInventory();
    if (sectionId === 'vd-orders') await vendorLoadOrders();
    if (sectionId === 'vd-sales') await vendorLoadSales();
    if (sectionId === 'vd-coupons') await vendorLoadCoupons();
    if (sectionId === 'vd-reviews') await vendorLoadReviews();
    if (sectionId === 'vd-notifications') await vendorLoadNotifications();
    if (sectionId === 'vd-profile') await vendorLoadProfile();
    if (sectionId === 'vd-support') await vendorLoadSupport();
};

// -----------------------
// Vendor API wrappers
// -----------------------

async function vendorFetchProfile() {
    return await apiRequest('/vendor/profile');
}
async function vendorUpdateProfile(payload) {
    return await apiRequest('/vendor/profile', { method: 'PUT', body: payload });
}
async function vendorFetchProducts() {
    return await apiRequest('/vendor/products');
}
async function vendorCreateProduct(payload) {
    return await apiRequest('/vendor/products', { method: 'POST', body: payload });
}
async function vendorUpdateProduct(id, payload) {
    return await apiRequest(`/vendor/products/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}
async function vendorDeleteProduct(id) {
    return await apiRequest(`/vendor/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
async function vendorDuplicateProduct(id) {
    return await apiRequest(`/vendor/products/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
}
async function vendorSetProductStatus(id, isActive) {
    return await apiRequest(`/vendor/products/${encodeURIComponent(id)}/status`, { method: 'PUT', body: { isActive } });
}
async function vendorFetchInventory() {
    return await apiRequest('/vendor/inventory');
}
async function vendorUpdateStock(productId, stock, note) {
    return await apiRequest(`/vendor/inventory/${encodeURIComponent(productId)}`, { method: 'PUT', body: { stock, note } });
}
async function vendorFetchOrders() {
    return await apiRequest('/vendor/orders');
}
async function vendorUpdateOrderItemStatus(orderId, productId, status) {
    return await apiRequest(`/vendor/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(productId)}/status`, { method: 'PUT', body: { status } });
}
async function vendorFetchSales() {
    return await apiRequest('/vendor/sales');
}

async function vendorFetchCoupons() {
    return await apiRequest('/vendor/coupons');
}
async function vendorCreateCoupon(payload) {
    return await apiRequest('/vendor/coupons', { method: 'POST', body: payload });
}
async function vendorUpdateCoupon(id, payload) {
    return await apiRequest(`/vendor/coupons/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}
async function vendorDeleteCoupon(id) {
    return await apiRequest(`/vendor/coupons/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function vendorFetchNotifications() {
    return await apiRequest('/vendor/notifications');
}
async function vendorMarkNotificationRead(id) {
    return await apiRequest(`/vendor/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
}

async function vendorFetchTickets() {
    return await apiRequest('/vendor/support/tickets');
}
async function vendorCreateTicket(subject, message) {
    return await apiRequest('/vendor/support/tickets', { method: 'POST', body: { subject, message } });
}

async function vendorFetchReviews() {
    return await apiRequest('/vendor/reviews');
}
async function vendorReplyReview(id, message) {
    return await apiRequest(`/vendor/reviews/${encodeURIComponent(id)}/reply`, { method: 'POST', body: { message } });
}
async function vendorReportReview(id) {
    return await apiRequest(`/vendor/reviews/${encodeURIComponent(id)}/report`, { method: 'PUT' });
}

// -----------------------
// Overview
// -----------------------

async function vendorLoadOverview() {
    const sales = await vendorFetchSales();

    setText('statTotalProducts', String(sales.totalProducts ?? 0));
    setText('statTotalOrders', String(sales.totalOrders ?? 0));
    setText('statTotalRevenue', formatMoneyINR(sales.totalRevenue ?? 0));
    setText('statPendingOrders', String(sales.pendingOrders ?? 0));
    setText('statLowStock', String(sales.lowStockAlerts ?? 0));
    setText('statTopSelling', sales.topSellingProduct ? sales.topSellingProduct.name : '—');

    renderTopProductsList(sales.topProducts || []);
    drawBarChart('revenueChart', (sales.monthlyRevenue || []).map(x => x.month), (sales.monthlyRevenue || []).map(x => Number(x.revenue || 0)));
}

function renderTopProductsList(items) {
    const el = document.getElementById('topProductsList');
    if (!el) return;
    if (!items.length) {
        el.innerHTML = `<div class="vd-empty">No sales yet.</div>`;
        return;
    }
    el.innerHTML = items.map(p => `
        <div class="vd-list-item">
            <div>
                <strong>${escapeHtml(p.name || 'Product')}</strong><br>
                <span>Qty: ${Number(p.qty || 0)}</span>
            </div>
            <div style="text-align:right">
                <strong>${formatMoneyINR(p.revenue || 0)}</strong><br>
                <span>Revenue</span>
            </div>
        </div>
    `).join('');
}

// -----------------------
// Products
// -----------------------

async function vendorLoadProducts() {
    const tbody = document.getElementById('productsTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="vd-td-center">Loading...</td></tr>`;

    const products = await vendorFetchProducts();
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="vd-td-center">No products yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${(p.imageUrl || (p.images && p.images[0]) || 'https://placehold.co/60x60?text=Jewel')}"
                         style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid rgba(212,175,55,0.18);">
                    <div>
                        <div style="font-family:'Playfair Display',serif;">${escapeHtml(p.name || '')}</div>
                        <div style="font-size:12px;color:#6f6b66">${escapeHtml(p.category || '')}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(p.sku || '—')}</td>
            <td>${formatMoneyINR(p.price || 0)}</td>
            <td>${Number(p.stock || 0)}</td>
            <td>${p.isActive ? '<span class="vd-pill on">Enabled</span>' : '<span class="vd-pill off">Disabled</span>'}</td>
            <td>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorEditProduct('${p.id}')">Edit</button>
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorToggleProduct('${p.id}', ${p.isActive ? 'false' : 'true'})">${p.isActive ? 'Disable' : 'Enable'}</button>
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorDuplicate('${p.id}')">Duplicate</button>
                    <button class="vd-btn vd-btn-outline" type="button" style="border-color:rgba(176,74,63,0.35);color:#8d3a31" onclick="vendorRemoveProduct('${p.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.vendorEditProduct = async function (id) {
    const products = await vendorFetchProducts();
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    setText('productFormTitle', 'Edit Product');
    setValue('productId', p.id);
    setValue('pName', p.name);
    setValue('pSku', p.sku);
    setValue('pCategory', p.category);
    setValue('pSubCategory', p.subCategory);
    setValue('pPrice', p.price);
    setValue('pDiscountPrice', p.discountPrice);
    setValue('pMetalType', p.metalType);
    setValue('pPurity', p.purity);
    setValue('pWeight', p.weight);
    setValue('pSize', p.size);
    setValue('pDiamondDetails', p.diamondDetails);
    setValue('pMakingCharges', p.makingCharges);
    setValue('pStock', p.stock);
    setValue('pDescription', p.description);
    setValue('pImages', (p.images || []).join(', '));
    setValue('pVideoUrl', p.videoUrl);
    setValue('pTags', (p.tags || []).join(', '));
    setValue('pFeatured', String(!!p.featured));
    setValue('pIsActive', String(!!p.isActive));
    await vendorSwitch('vd-add');
};

window.vendorToggleProduct = async function (id, isActive) {
    await vendorSetProductStatus(id, !!isActive);
    dispatchDataChanged();
    await vendorLoadProducts();
    await vendorLoadInventory();
    await vendorLoadOverview();
};

window.vendorDuplicate = async function (id) {
    await vendorDuplicateProduct(id);
    dispatchDataChanged();
    await vendorLoadProducts();
    await vendorLoadOverview();
};

window.vendorRemoveProduct = async function (id) {
    if (!confirm('Delete this product?')) return;
    await vendorDeleteProduct(id);
    dispatchDataChanged();
    await vendorLoadProducts();
    await vendorLoadInventory();
    await vendorLoadOverview();
};

// Product form
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('productFormMsg');
        setMsg(msg, 'Saving...', false);

        const payload = readProductForm();
        const id = (document.getElementById('productId') || {}).value || '';

        try {
            if (id) await vendorUpdateProduct(id, payload);
            else await vendorCreateProduct(payload);

            dispatchDataChanged();
            setMsg(msg, 'Saved. Product is live in the shop.', true);
            vendorResetProductForm();
            await vendorLoadProducts();
            await vendorLoadInventory();
            await vendorLoadOverview();
            await vendorSwitch('vd-products');
        } catch (err) {
            setMsg(msg, err && err.message ? err.message : 'Failed to save', false);
        }
    });
}

window.vendorResetProductForm = function () {
    setText('productFormTitle', 'Add Product');
    setValue('productId', '');
    ['pName','pSku','pCategory','pSubCategory','pPrice','pDiscountPrice','pMetalType','pPurity','pWeight','pSize','pDiamondDetails','pMakingCharges','pStock','pDescription','pImages','pVideoUrl','pTags']
        .forEach(id => setValue(id, ''));
    setValue('pFeatured', 'false');
    setValue('pIsActive', 'true');
    const msg = document.getElementById('productFormMsg');
    if (msg) msg.textContent = '';
};

function readProductForm() {
    const images = splitCsv(getValue('pImages'));
    const tags = splitCsv(getValue('pTags'));
    return {
        name: getValue('pName'),
        sku: getValue('pSku'),
        category: getValue('pCategory'),
        subCategory: getValue('pSubCategory'),
        price: numberOrNull(getValue('pPrice')),
        discountPrice: numberOrNull(getValue('pDiscountPrice')),
        metalType: getValue('pMetalType'),
        purity: getValue('pPurity'),
        weight: numberOrNull(getValue('pWeight')),
        size: getValue('pSize'),
        diamondDetails: getValue('pDiamondDetails'),
        makingCharges: numberOrNull(getValue('pMakingCharges')),
        stock: parseInt(getValue('pStock') || '0', 10),
        description: getValue('pDescription'),
        images,
        videoUrl: getValue('pVideoUrl'),
        tags,
        featured: getValue('pFeatured') === 'true',
        isActive: getValue('pIsActive') === 'true',
        imageUrl: images[0] || ''
    };
}

// -----------------------
// Inventory
// -----------------------

async function vendorLoadInventory() {
    const tbody = document.getElementById('inventoryTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">Loading...</td></tr>`;

    const rows = await vendorFetchInventory();
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">No products yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.name || '')}</td>
            <td>${escapeHtml(r.sku || '—')}</td>
            <td><strong>${Number(r.stock || 0)}</strong></td>
            <td>${r.lowStock ? '<span class="vd-pill low">Low</span>' : '<span class="vd-pill on">OK</span>'}</td>
            <td>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input id="stk-${r.id}" type="number" min="0" value="${Number(r.stock || 0)}" style="width:120px;padding:10px 12px;border:1px solid rgba(180,150,100,0.25);border-radius:12px;background:#faf8f3;">
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorSaveStock('${r.id}')">Update</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.vendorSaveStock = async function (productId) {
    const input = document.getElementById(`stk-${productId}`);
    const stock = input ? Number(input.value || 0) : 0;
    await vendorUpdateStock(productId, stock, 'Vendor stock update');
    dispatchDataChanged();
    await vendorLoadInventory();
    await vendorLoadOverview();
};

// -----------------------
// Orders
// -----------------------

async function vendorLoadOrders() {
    const tbody = document.getElementById('ordersTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" class="vd-td-center">Loading...</td></tr>`;

    const rows = await vendorFetchOrders();
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="vd-td-center">No orders yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>#${shortId(r.orderId)}</td>
            <td>${escapeHtml(r.productName || '')}</td>
            <td>${escapeHtml(r.customerName || '')}</td>
            <td>${Number(r.quantity || 0)}</td>
            <td>${formatMoneyINR(r.totalPrice || 0)}</td>
            <td>${formatDate(r.orderDate)}</td>
            <td><span class="vd-pill on">${escapeHtml(r.status || 'NEW')}</span></td>
            <td>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <select id="os-${r.orderId}-${r.productId}" style="padding:10px 12px;border:1px solid rgba(180,150,100,0.25);border-radius:12px;background:#faf8f3;">
                        ${['NEW','PROCESSING','SHIPPED','COMPLETED','CANCELLED'].map(s => `<option value="${s}" ${String(r.status||'NEW').toUpperCase()===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorSetOrderStatus('${r.orderId}','${r.productId}')">Save</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.vendorSetOrderStatus = async function (orderId, productId) {
    const sel = document.getElementById(`os-${orderId}-${productId}`);
    const status = sel ? sel.value : 'NEW';
    await vendorUpdateOrderItemStatus(orderId, productId, status);
    dispatchDataChanged();
    await vendorLoadOrders();
    await vendorLoadOverview();
};

// -----------------------
// Sales section charts
// -----------------------

async function vendorLoadSales() {
    const sales = await vendorFetchSales();
    drawBarChart('salesRevenueChart', (sales.monthlyRevenue || []).map(x => x.month), (sales.monthlyRevenue || []).map(x => Number(x.revenue || 0)));
    drawBarChart('salesTopChart', (sales.topProducts || []).map(x => x.name), (sales.topProducts || []).map(x => Number(x.revenue || 0)));
}

// -----------------------
// Coupons
// -----------------------

async function vendorLoadCoupons() {
    const tbody = document.getElementById('couponsTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">Loading...</td></tr>`;

    const coupons = await vendorFetchCoupons();
    if (!coupons.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">No coupons yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = coupons.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.code || '')}</strong></td>
            <td>${escapeHtml((c.type || '').toUpperCase())}</td>
            <td>${String((c.type || '').toUpperCase()) === 'PERCENT' ? `${Number(c.value || 0)}%` : formatMoneyINR(c.value || 0)}</td>
            <td>${c.active ? '<span class="vd-pill on">Yes</span>' : '<span class="vd-pill off">No</span>'}</td>
            <td>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="vd-btn vd-btn-outline" type="button" onclick="vendorEditCoupon('${c.id}')">Edit</button>
                    <button class="vd-btn vd-btn-outline" type="button" style="border-color:rgba(176,74,63,0.35);color:#8d3a31" onclick="vendorRemoveCoupon('${c.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.vendorEditCoupon = async function (id) {
    const coupons = await vendorFetchCoupons();
    const c = coupons.find(x => String(x.id) === String(id));
    if (!c) return;
    setText('couponFormTitle', 'Edit Coupon');
    setValue('couponId', c.id);
    setValue('cCode', c.code || '');
    setValue('cType', (c.type || 'PERCENT').toUpperCase());
    setValue('cValue', c.value || '');
    setValue('cCategory', c.category || '');
    setValue('cProductId', c.productId || '');
    setValue('cActive', String(!!c.active));
};

window.vendorRemoveCoupon = async function (id) {
    if (!confirm('Delete this coupon?')) return;
    await vendorDeleteCoupon(id);
    await vendorLoadCoupons();
    vendorResetCouponForm();
};

window.vendorResetCouponForm = function () {
    setText('couponFormTitle', 'Create Coupon');
    setValue('couponId', '');
    setValue('cCode', '');
    setValue('cType', 'PERCENT');
    setValue('cValue', '');
    setValue('cCategory', '');
    setValue('cProductId', '');
    setValue('cActive', 'true');
    const msg = document.getElementById('couponMsg');
    if (msg) msg.textContent = '';
};

const couponForm = document.getElementById('couponForm');
if (couponForm) {
    couponForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('couponMsg');
        setMsg(msg, 'Saving...', false);

        const id = getValue('couponId');
        const payload = {
            code: getValue('cCode').toUpperCase(),
            type: getValue('cType'),
            value: numberOrNull(getValue('cValue')),
            category: getValue('cCategory') || null,
            productId: getValue('cProductId') || null,
            active: getValue('cActive') === 'true',
        };

        try {
            if (id) await vendorUpdateCoupon(id, payload);
            else await vendorCreateCoupon(payload);
            setMsg(msg, 'Saved. Coupon is available at checkout.', true);
            await vendorLoadCoupons();
            vendorResetCouponForm();
        } catch (err) {
            setMsg(msg, err && err.message ? err.message : 'Failed to save', false);
        }
    });
}

// -----------------------
// Reviews
// -----------------------

async function vendorLoadReviews() {
    const tbody = document.getElementById('reviewsTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">Loading...</td></tr>`;

    const reviews = await vendorFetchReviews();
    if (!reviews.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">No reviews yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = reviews.map(r => `
        <tr>
            <td>${escapeHtml(r.productId || '')}</td>
            <td>${'★'.repeat(Math.max(0, Math.min(5, Number(r.rating || 0))))}</td>
            <td>${escapeHtml(r.comment || '')}</td>
            <td>
                ${r.vendorReply && r.vendorReply.message
                    ? `<div><strong>Replied</strong><br><span style="color:#6f6b66;font-size:12px;">${escapeHtml(r.vendorReply.message)}</span></div>`
                    : `<div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <input id="rv-${r.id}" placeholder="Write a reply..." style="padding:10px 12px;border:1px solid rgba(180,150,100,0.25);border-radius:12px;background:#faf8f3;min-width:220px;">
                        <button class="vd-btn vd-btn-outline" type="button" onclick="vendorSendReply('${r.id}')">Send</button>
                      </div>`
                }
            </td>
            <td>
                ${r.reported ? '<span class="vd-pill off">Reported</span>' : `<button class="vd-btn vd-btn-outline" type="button" onclick="vendorReport('${r.id}')">Report</button>`}
            </td>
        </tr>
    `).join('');
}

window.vendorSendReply = async function (reviewId) {
    const input = document.getElementById(`rv-${reviewId}`);
    const msg = input ? String(input.value || '').trim() : '';
    if (!msg) return;
    await vendorReplyReview(reviewId, msg);
    await vendorLoadReviews();
};

window.vendorReport = async function (reviewId) {
    if (!confirm('Report this review as fake/inappropriate?')) return;
    await vendorReportReview(reviewId);
    await vendorLoadReviews();
};

// -----------------------
// Notifications
// -----------------------

async function vendorLoadNotifications() {
    const unreadEl = document.getElementById('notifUnread');
    const tbody = document.getElementById('notifTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">Loading...</td></tr>`;

    const resp = await vendorFetchNotifications();
    if (unreadEl) unreadEl.textContent = String(resp.unread ?? 0);
    const items = resp.items || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="vd-td-center">No notifications.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(n => `
        <tr>
            <td>${escapeHtml(n.type || '')}</td>
            <td><strong>${escapeHtml(n.title || '')}</strong>${n.read ? '' : ' <span class="vd-pill on">NEW</span>'}</td>
            <td>${escapeHtml(n.message || '')}</td>
            <td>${formatDate(n.createdAt)}</td>
            <td>
                ${n.read ? '<span style="color:#6f6b66">Read</span>' : `<button class="vd-btn vd-btn-outline" type="button" onclick="vendorReadNotif('${n.id}')">Mark read</button>`}
            </td>
        </tr>
    `).join('');
}

window.vendorReadNotif = async function (id) {
    await vendorMarkNotificationRead(id);
    await vendorLoadNotifications();
};

// -----------------------
// Support tickets
// -----------------------

async function vendorLoadSupport() {
    await vendorLoadTickets();
    bindSupportForm();
}

async function vendorLoadTickets() {
    const tbody = document.getElementById('ticketsTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="vd-td-center">Loading...</td></tr>`;
    const tickets = await vendorFetchTickets();
    if (!tickets.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="vd-td-center">No tickets yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = tickets.map(t => `
        <tr>
            <td>#${shortId(t.id)}</td>
            <td>${escapeHtml(t.subject || '')}</td>
            <td><span class="vd-pill on">${escapeHtml(t.status || 'OPEN')}</span></td>
            <td>${formatDate(t.createdAt)}</td>
        </tr>
    `).join('');
}

function bindSupportForm() {
    const form = document.getElementById('supportForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('supportMsg');
        setMsg(msg, 'Submitting...', false);
        try {
            await vendorCreateTicket(getValue('stSubject'), getValue('stMessage'));
            setValue('stSubject', '');
            setValue('stMessage', '');
            setMsg(msg, 'Ticket submitted.', true);
            await vendorLoadTickets();
        } catch (err) {
            setMsg(msg, err && err.message ? err.message : 'Failed to submit', false);
        }
    });
}

// -----------------------
// Profile section
// -----------------------

async function vendorLoadProfile() {
    const profile = await vendorFetchProfile();
    bindVendorProfileForm(profile);
}

function bindVendorProfileForm(profile) {
    setValue('vpVendorName', profile.vendorName || '');
    setValue('vpCompanyName', profile.companyName || '');
    setValue('vpEmail', profile.email || '');
    setValue('vpPhone', profile.phone || '');
    setValue('vpBusinessAddress', profile.businessAddress || '');
    setValue('vpBankDetails', profile.bankDetails || '');

    const form = document.getElementById('vendorProfileForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('vendorProfileMsg');
        try {
            const saved = await vendorUpdateProfile({
                vendorName: getValue('vpVendorName'),
                companyName: getValue('vpCompanyName'),
                phone: getValue('vpPhone'),
                businessAddress: getValue('vpBusinessAddress'),
                bankDetails: getValue('vpBankDetails'),
            });
            hydrateVendorSummary(saved);
            setMsg(msg, 'Saved.', true);
        } catch (err) {
            setMsg(msg, err && err.message ? err.message : 'Failed to save', false);
        }
    });
}

function hydrateVendorSummary(profile) {
    setText('vendorName', profile.vendorName || 'Vendor');
    setText('vendorCompany', profile.companyName || 'Supplier');
    const initial = (profile.vendorName || 'V').trim().charAt(0).toUpperCase();
    setText('vendorAvatar', initial);
}

// -----------------------
// Mini chart (no libraries)
// -----------------------

function drawBarChart(canvasId, labels, values) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padding = 28;
    const maxVal = Math.max(1, ...values.map(v => Number(v || 0)));
    const n = Math.max(1, values.length);
    const gap = 10;
    const barW = Math.max(10, (w - padding * 2 - gap * (n - 1)) / n);

    // axes
    ctx.strokeStyle = 'rgba(180,150,100,0.25)';
    ctx.beginPath();
    ctx.moveTo(padding, 8);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - 8, h - padding);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
        const val = Number(values[i] || 0);
        const barH = Math.round((h - padding - 18) * (val / maxVal));
        const x = padding + i * (barW + gap);
        const y = (h - padding) - barH;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, 'rgba(230,195,90,0.95)');
        grad.addColorStop(1, 'rgba(180,150,100,0.95)');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);

        // labels (truncate)
        const label = String(labels[i] || '').slice(0, 6);
        ctx.fillStyle = 'rgba(111,107,102,0.9)';
        ctx.font = '11px Montserrat';
        ctx.fillText(label, x, h - 10);
    }
}

// -----------------------
// Helpers
// -----------------------

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}
function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}
function splitCsv(s) {
    return String(s || '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
}
function numberOrNull(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
function formatMoneyINR(amount) {
    const n = Number(amount || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function shortId(id) {
    const s = String(id || '');
    return s ? s.slice(-6).toUpperCase() : '—';
}
function escapeHtml(str) {
    return String(str || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
function setMsg(el, text, ok) {
    if (!el) return;
    el.className = 'vd-msg ' + (ok ? 'ok' : 'err');
    el.textContent = text;
}

