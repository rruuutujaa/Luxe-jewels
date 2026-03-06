// Admin Analytics module: charts, sidebar, filters
(function () {
  const charts = {};

  async function safeFetchJson(url) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders() });
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async function getCoreData() {
    const [analytics, orders, users] = await Promise.all([
      fetchAdminAnalytics(),
      fetchAdminOrders(),
      fetchAdminUsers()
    ]);
    return { analytics, orders, users };
  }

  async function getMonthlyOrders() {
    return await safeFetchJson(`${API_BASE_URL}/admin/analytics/monthly-orders`);
  }

  async function getTopProducts(limit = 5) {
    return await safeFetchJson(`${API_BASE_URL}/admin/analytics/top-products?limit=${limit}`);
  }

  async function getRevenue() {
    return await safeFetchJson(`${API_BASE_URL}/admin/revenue`);
  }

  async function getProducts() {
    try {
      const res = await fetchAdminProducts();
      return res;
    } catch (e) {
      return { success: false, message: e.message, products: [] };
    }
  }

  function ensureChart(id, type, config) {
    const ctxEl = document.getElementById(id);
    if (!ctxEl) return null;
    if (charts[id]) {
      charts[id].data = config.data;
      charts[id].options = config.options || charts[id].options;
      charts[id].update();
      return charts[id];
    }
    const ctx = ctxEl.getContext('2d');
    const opts = config.options || {};
    opts.maintainAspectRatio = false;
    opts.responsive = true;
    // Luxury theme colors
    opts.plugins = Object.assign({ 
      legend: { 
        labels: { 
          color: '#0e2a4f',
          font: { family: "'Montserrat', sans-serif" }
        } 
      }, 
      tooltip: { 
        enabled: true,
        backgroundColor: 'rgba(14, 42, 79, 0.95)',
        titleColor: '#D4AF37',
        bodyColor: '#ffffff',
        borderColor: '#D4AF37',
        borderWidth: 1
      } 
    }, opts.plugins || {});
    opts.scales = opts.scales || {};
    if (opts.scales.x) { 
      opts.scales.x.ticks = Object.assign({ color: '#8a8680' }, opts.scales.x.ticks || {}); 
      opts.scales.x.grid = Object.assign({ color: 'rgba(0,0,0,0.05)' }, opts.scales.x.grid || {}); 
    }
    if (opts.scales.y) { 
      opts.scales.y.ticks = Object.assign({ color: '#8a8680' }, opts.scales.y.ticks || {}); 
      opts.scales.y.grid = Object.assign({ color: 'rgba(0,0,0,0.05)' }, opts.scales.y.grid || {}); 
    }
    charts[id] = new Chart(ctx, { type, data: config.data, options: opts });
    return charts[id];
  }

  function getPalette(n) {
    // Luxury gold and warm palette
    const base = [
        '#D4AF37', // Gold
        '#b8962e', // Dark Gold
        '#8a6f1a', // Bronze
        '#f4e4c1', // Light Gold
        '#fff7e6', // Cream
        '#c4b08a', // Taupe
        '#a37e2c', // Antique Gold
        '#7a5a1c'  // Dark Bronze
    ];
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(base[i % base.length]);
    }
    return out;
  }

  function getChartColors(n) {
    // Returns array of luxury colors for charts
    const colors = [
      '#D4AF37', // Gold
      '#0e2a4f', // Navy
      '#b8962e', // Dark Gold  
      '#8a6f1a', // Bronze
      '#f4e4c1', // Light Gold
      '#059669', // Emerald
      '#dc2626', // Ruby
      '#2563eb'  // Royal Blue
    ];
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(colors[i % colors.length]);
    }
    return out;
  }

  function renderOrderStatusPie(orders) {
    const paid = (orders || []).filter(o => String(o.paymentStatus || '').toUpperCase() === 'PAID').length;
    ensureChart('chartOrderStatusPie', 'pie', {
      data: {
        labels: ['PAID'],
        datasets: [{ data: [paid], backgroundColor: ['#21c997'] }]
      },
      options: { plugins: { legend: { display: false } } }
    });
  }

  function renderMonthlyOrdersBar(items) {
    const labels = [];
    const data = [];
    (items || []).forEach(m => {
      const label = `${String(m.month).padStart(2, '0')}/${m.year}`;
      labels.push(label);
      data.push(Number(m.ordersCount || 0));
    });
    ensureChart('chartMonthlyOrdersBar', 'bar', {
      data: {
        labels,
        datasets: [{ label: 'Orders', data, backgroundColor: 'linear-gradient(180deg, rgba(124,92,255,.8), rgba(61,216,255,.6))' }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  function renderRevenueLine(revenue) {
    const map = revenue && revenue.revenuePerDay ? revenue.revenuePerDay : {};
    const labels = Object.keys(map).sort();
    const data = labels.map(k => Number(map[k] || 0));
    ensureChart('chartRevenueLine', 'line', {
      data: {
        labels,
        datasets: [{ label: 'Revenue (₹)', data, borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.15)', tension: 0.35, fill: true }]
      },
      options: { plugins: { legend: { display: true, labels: { color: '#0e2a4f' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#8a8680' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#8a8680' }, grid: { display: false } } } }
    });
  }

  function renderCustomerGrowthLine(usersData) {
    const users = (usersData && usersData.success) ? (usersData.users || []) : [];
    const map = {};
    users.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    const labels = Object.keys(map).sort();
    const data = labels.map(k => map[k]);
    ensureChart('chartCustomerGrowthLine', 'line', {
      data: {
        labels,
        datasets: [{ label: 'New Customers', data, borderColor: '#0e2a4f', backgroundColor: 'rgba(14, 42, 79, 0.1)', tension: 0.35, fill: true }]
      },
      options: { plugins: { legend: { display: true, labels: { color: '#0e2a4f' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#8a8680' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#8a8680' }, grid: { display: false } } } }
    });
  }

  function renderCategoryPerformanceBar(ordersData, productsData) {
    const orders = (ordersData && ordersData.success) ? (ordersData.orders || []) : [];
    const products = (productsData && productsData.success) ? (productsData.products || []) : [];
    const catByPid = {};
    products.forEach(p => { catByPid[String(p.id || p._id || '')] = p.category || 'Unknown'; });
    const totals = {};
    orders.forEach(o => {
      if (String(o.paymentStatus || '').toUpperCase() !== 'PAID') return;
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        const pid = String((it.productId || it.product_id || '') || '');
        const cat = catByPid[pid] || 'Unknown';
        const qty = Number(it.quantity || it.qty || 0);
        totals[cat] = (totals[cat] || 0) + qty;
      });
    });
    const labels = Object.keys(totals);
    const data = labels.map(k => totals[k]);
    ensureChart('chartCategoryPerformanceBar', 'bar', {
      data: { labels, datasets: [{ label: 'Units Sold', data, backgroundColor: getChartColors(labels.length) }] },
      options: { 
        plugins: { legend: { display: false } },
        scales: { 
          y: { beginAtZero: true, ticks: { color: '#8a8680' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: { color: '#8a8680' }, grid: { display: false } }
        }
      }
    });
  }

  function renderWishlistCartOrdersDoughnut(analytics) {
    const orders = Number(analytics.totalOrders || 0);
    const wishlist = Number(analytics.totalWishlist || 0);
    const carts = Number(analytics.totalActiveCarts || 0);
    ensureChart('chartWishlistCartOrdersDoughnut', 'doughnut', {
      data: {
        labels: ['Wishlist', 'Carts', 'Orders'],
        datasets: [{ data: [wishlist || 0, carts || 0, orders], backgroundColor: ['#D4AF37', '#0e2a4f', '#059669'] }]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: '#0e2a4f', padding: 15 } } }
      }
    });
    const wEl = document.getElementById('statWishlist');
    const cEl = document.getElementById('statActiveCarts');
    if (wEl) wEl.textContent = (wishlist || 0);
    if (cEl) cEl.textContent = (carts || 0);
  }

  function renderTopSellingProductsBar(items) {
    const labels = (items || []).map(i => i.productName || i.productId || 'Unknown');
    const data = (items || []).map(i => Number(i.totalQty || 0));
    ensureChart('chartTopSellingProductsBar', 'bar', {
      data: { labels, datasets: [{ label: 'Units Sold', data, backgroundColor: getPalette(labels.length) }] },
      options: { 
        indexAxis: 'y', 
        plugins: { legend: { display: false } },
        scales: { 
          x: { beginAtZero: true, ticks: { color: '#8a8680' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { ticks: { color: '#8a8680' }, grid: { display: false } }
        }
      }
    });
  }

  function renderTopCustomersChart(orders) {
    const counts = {};
    (orders || []).forEach(o => {
      const name = o.userName || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    ensureChart('chartTopCustomersUsers', 'bar', {
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Orders', data: sorted.map(([, c]) => c), backgroundColor: '#D4AF37' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
    ensureChart('chartTopCustomersOrders', 'bar', {
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Orders', data: sorted.map(([, c]) => c), backgroundColor: '#21c997' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  function renderUsersVsOrdersBar(analytics) {
    const labels = ['Users', 'Orders'];
    const data = [Number(analytics.totalUsers || 0), Number(analytics.totalOrders || 0)];
    ensureChart('chartUsersVsOrders', 'bar', {
      data: { labels, datasets: [{ label: 'Count', data, backgroundColor: ['#3498db', '#D4AF37'] }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  function applyOrderFilters(orders) {
    const start = document.getElementById('orderStartDate')?.value || '';
    const end = document.getElementById('orderEndDate')?.value || '';
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return (orders || []).filter(o => {
      const okStatus = String(o.paymentStatus || '').toUpperCase() === 'PAID';
      const created = o.createdAt ? new Date(o.createdAt) : null;
      const okStart = !startDate || (created && created >= startDate);
      const okEnd = !endDate || (created && created <= endDate);
      return okStatus && okStart && okEnd;
    });
  }

  function renderOrdersTable(filteredOrders, targetId) {
    const tbody = targetId ? document.getElementById(targetId) : (document.getElementById('ordersTbody') || document.getElementById('ordersPageTbody'));
    if (!tbody) return;
    if (!filteredOrders || filteredOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No orders match filters</td></tr>';
      return;
    }
    tbody.innerHTML = filteredOrders.map(order => `
      <tr>
        <td>#${String(order.id || '').slice(-6).toUpperCase()}</td>
        <td>${order.userName || 'Unknown'}</td>
        <td>₹${Number(order.total || 0).toLocaleString('en-IN')}</td>
        <td>${order.paymentStatus || 'PAID'}</td>
        <td><span class="status-badge status-${(order.status || 'PAID').toLowerCase()}">${order.status || 'PAID'}</span></td>
        <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</td>
      </tr>
    `).join('');
  }

  function setupSidebar() {
    const links = document.querySelectorAll('.nav-link[data-target]');
    const sections = ['overview', 'orders', 'users', 'products', 'wishlist', 'cart'];
    const showSection = (id) => {
      sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = s === id ? '' : 'none';
      });
      links.forEach(l => l.classList.toggle('active', l.getAttribute('data-target') === id));
    };
    links.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showSection(l.getAttribute('data-target')); }));
    showSection('overview');
  }

  function updateMetrics(analytics) {
    const revEl = document.getElementById('statRevenue');
    const ordEl = document.getElementById('statOrders');
    const usrEl = document.getElementById('statUsers');
    const prodEl = document.getElementById('statProducts');
    if (revEl) {
      const rev = analytics && analytics.totalRevenue ? analytics.totalRevenue : 0;
      revEl.textContent = '₹' + Number(rev || 0).toLocaleString('en-IN');
    }
    if (ordEl) ordEl.textContent = String((analytics && analytics.totalOrders) || 0);
    if (usrEl) usrEl.textContent = String((analytics && analytics.totalUsers) || 0);
    if (prodEl) prodEl.textContent = String((analytics && analytics.totalProducts) || 0);
  }

  async function init() {
    setupSidebar();
    document.getElementById('orderFilterApply')?.addEventListener('click', async () => {
      const ordersData = await fetchAdminOrders();
      const filtered = ordersData && ordersData.success ? applyOrderFilters(ordersData.orders || []) : [];
      renderOrdersTable(filtered, 'ordersPageTbody');
      renderOrderStatusPie(filtered);
      renderTopCustomersChart(filtered);
    });
    await refreshCharts();
    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => refreshCharts());
    }
    setInterval(() => { refreshCharts(); }, 30000);
    const usersData = await fetchAdminUsers();
    const admins = (usersData && usersData.success ? usersData.users || [] : []).filter(u => String(u.role || '').toUpperCase() === 'ADMIN');
    const totalAdminsEl = document.getElementById('statAdminsTotal');
    if (totalAdminsEl) totalAdminsEl.textContent = admins.length;
    const loginsTbody = document.getElementById('adminLoginsTbody');
    if (loginsTbody) {
      loginsTbody.innerHTML = admins.slice(0, 5).map(a => `
        <tr><td>${a.name || '-'}</td><td>${a.email || '-'}</td><td>-</td></tr>
      `).join('');
    }
    const wTotal = document.getElementById('statWishlistTotal');
    const wTop = document.getElementById('statTopWishProduct');
    const wCatCanvas = document.getElementById('chartWishlistByCategory');
    if (wTotal) wTotal.textContent = '0';
    if (wTop) wTop.textContent = '-';
    if (wCatCanvas) {
      ensureChart('chartWishlistByCategory', 'pie', { data: { labels: [], datasets: [{ data: [] }] } });
    }
    const cActive = document.getElementById('statActiveCartsTotal');
    const cAbandoned = document.getElementById('statAbandonedCarts');
    const cRanges = document.getElementById('chartCartValueRanges');
    if (cActive) cActive.textContent = '0';
    if (cAbandoned) cAbandoned.textContent = '0';
    if (cRanges) ensureChart('chartCartValueRanges', 'bar', { data: { labels: [], datasets: [{ data: [] }] } });
  }

  async function refreshCharts() {
    const [{ analytics, orders, users }, monthly, topProducts, revenue, products] = await Promise.all([
      getCoreData(),
      getMonthlyOrders(),
      getTopProducts(5),
      getRevenue(),
      getProducts()
    ]);
    if (orders && orders.success) {
      const paidOrders = applyOrderFilters(orders.orders || []);
      renderOrderStatusPie(paidOrders);
      renderTopCustomersChart(paidOrders);
      renderOrdersTable(paidOrders, 'ordersTbody');
    }
    if (monthly && monthly.success) {
      renderMonthlyOrdersBar(monthly.items || []);
    }
    if (revenue && revenue.success) {
      renderRevenueLine(revenue);
    }
    if (analytics && analytics.success) {
      renderUsersVsOrdersBar(analytics);
      renderWishlistCartOrdersDoughnut(analytics);
      updateMetrics(analytics);
    }
    if (topProducts && topProducts.success) {
      renderTopSellingProductsBar(topProducts.items || []);
    }
    renderCustomerGrowthLine(users);
    renderCategoryPerformanceBar(orders, products);
    renderOrdersPage(orders, monthly, revenue, users, products);
    renderUsersPage(users, orders);
    renderReturningDonutApex(users, orders);
    renderRepeatGaugeApex(users, orders);
    renderCategoryRevenueTreemapApex(orders, products);
    renderProductsPage(products, orders, analytics);
    await renderWishlistSection(analytics, users, orders, products);
    renderCartSection(orders);
  }

  function renderOrdersPage(ordersResp, monthlyResp, revenueResp, usersResp, productsResp) {
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const paidOrders = orders.filter(o => String(o.paymentStatus || '').toUpperCase() === 'PAID');
    const totalOrdersEl = document.getElementById('ordersTotal');
    const monthOrdersEl = document.getElementById('ordersThisMonth');
    const todayOrdersEl = document.getElementById('ordersToday');
    const aovEl = document.getElementById('ordersAOV');
    const revenueEl = document.getElementById('ordersRevenue');
    if (totalOrdersEl) totalOrdersEl.textContent = String(orders.length);
    if (monthOrdersEl) {
      const now = new Date();
      const monthCount = orders.filter(o => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      monthOrdersEl.textContent = String(monthCount);
    }
    if (todayOrdersEl) {
      const now = new Date();
      const todayCount = orders.filter(o => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        return d && d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      todayOrdersEl.textContent = String(todayCount);
    }
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const aov = paidOrders.length ? (totalRevenue / paidOrders.length) : 0;
    if (aovEl) aovEl.textContent = '₹' + Math.round(aov).toLocaleString('en-IN');
    if (revenueEl) revenueEl.textContent = '₹' + Math.round(totalRevenue).toLocaleString('en-IN');
    renderOrdersTable(orders, 'ordersPageTbody');
    const monthlyItems = (monthlyResp && monthlyResp.success) ? (monthlyResp.items || []) : [];
    renderRevOrdersAreaApex(monthlyResp);
    const paidPerMonth = {};
    orders.forEach(o => {
      if (String(o.paymentStatus || '').toUpperCase() !== 'PAID') return;
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      paidPerMonth[key] = paidPerMonth[key] || { total: 0, count: 0 };
      paidPerMonth[key].total += Number(o.total || 0);
      paidPerMonth[key].count += 1;
    });
    const aovLabels = Object.keys(paidPerMonth).sort();
    const aovData = aovLabels.map(k => {
      const v = paidPerMonth[k];
      return v.count ? Math.round(v.total / v.count) : 0;
    });
    ensureChart('chartAOVTrendLine', 'line', {
      data: { labels: aovLabels, datasets: [{ label: 'Average Order Value (₹)', data: aovData, borderColor: '#b76e79', backgroundColor: 'rgba(183,110,121,0.15)', tension: 0.35, fill: true }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
    const counts = {};
    orders.forEach(o => { const uid = String(o.userId || ''); if (!uid) return; counts[uid] = (counts[uid] || 0) + 1; });
    const usersList = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const nameById = {}; usersList.forEach(u => { nameById[String(u.id || '')] = u.name || 'Unknown'; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    ensureChart('chartTopCustomersOrdersPage', 'bar', {
      data: { labels: top.map(([id]) => nameById[id] || id), datasets: [{ label: 'Orders', data: top.map(([, c]) => c), backgroundColor: '#f5e7c6' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
    const returning = Object.values(counts).filter(c => c > 1).length;
    const firstTime = Object.values(counts).filter(c => c === 1).length;
    ensureChart('chartFirstVsReturningDonut', 'doughnut', {
      data: { labels: ['First-time', 'Returning'], datasets: [{ data: [firstTime, returning], backgroundColor: ['#fff7e6', '#b76e79'] }] }
    });
    const products = (productsResp && productsResp.success) ? (productsResp.products || []) : [];
    const priceByPid = {}; products.forEach(p => { priceByPid[String(p.id || '')] = Number(p.price || 0); });
    const qtyByPid = {}; const revByPid = {};
    orders.forEach(o => {
      if (String(o.paymentStatus || '').toUpperCase() !== 'PAID') return;
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        const pid = String(it.productId || '');
        const qty = Number(it.quantity || 0);
        qtyByPid[pid] = (qtyByPid[pid] || 0) + qty;
        revByPid[pid] = (revByPid[pid] || 0) + qty * (priceByPid[pid] || 0);
      });
    });
    const topOrdered = Object.entries(qtyByPid).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const leastOrdered = Object.entries(qtyByPid).sort((a, b) => a[1] - b[1]).slice(0, 5);
    const topRevenue = Object.entries(revByPid).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const nameByPid = {}; products.forEach(p => { nameByPid[String(p.id || '')] = p.name || p.id; });
    ensureChart('chartTopOrderedProductsBar', 'bar', {
      data: { labels: topOrdered.map(([pid]) => nameByPid[pid] || pid), datasets: [{ label: 'Units', data: topOrdered.map(([, q]) => q), backgroundColor: '#b76e79' }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
    ensureChart('chartLeastOrderedProductsBar', 'bar', {
      data: { labels: leastOrdered.map(([pid]) => nameByPid[pid] || pid), datasets: [{ label: 'Units', data: leastOrdered.map(([, q]) => q), backgroundColor: '#f5e7c6' }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
    ensureChart('chartTopRevenueProductsBar', 'bar', {
      data: { labels: topRevenue.map(([pid]) => nameByPid[pid] || pid), datasets: [{ label: 'Revenue (₹)', data: topRevenue.map(([, r]) => Math.round(r)), backgroundColor: '#8e3d49' }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
  }

  function renderCartSection(ordersResp) {
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const active = orders.filter(o => String(o.paymentStatus || '').toUpperCase() !== 'PAID').length;
    const abandoned = orders.filter(o => {
      const paid = String(o.paymentStatus || '').toUpperCase() === 'PAID';
      if (paid) return false;
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (!d) return false;
      const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return days > 7;
    }).length;
    const activeEl = document.getElementById('kpiActiveCarts');
    const abandonedEl = document.getElementById('kpiAbandonedCarts');
    if (activeEl) activeEl.textContent = String(active);
    if (abandonedEl) abandonedEl.textContent = String(abandoned);
    const bins = [
      { label: '<₹1k', test: v => v < 1000 },
      { label: '₹1k-₹5k', test: v => v >= 1000 && v < 5000 },
      { label: '₹5k-₹10k', test: v => v >= 5000 && v < 10000 },
      { label: '₹10k-₹25k', test: v => v >= 10000 && v < 25000 },
      { label: '₹25k+', test: v => v >= 25000 }
    ];
    const candidate = orders.filter(o => String(o.paymentStatus || '').toUpperCase() !== 'PAID');
    const source = candidate.length ? candidate : orders;
    const counts = bins.map(b => source.filter(o => b.test(Number(o.total || 0))).length);
    ensureChart('chartCartValueRanges', 'bar', {
      data: { labels: bins.map(b => b.label), datasets: [{ label: 'Carts/Orders', data: counts, backgroundColor: getPalette(bins.length) }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }
  async function renderWishlistSection(analytics, usersResp, ordersResp, productsResp) {
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const products = (productsResp && productsResp.success) ? (productsResp.products || []) : [];
    let wishlistItems = [];
    let myCartItems = [];
    let myOrders = [];
    try {
      wishlistItems = await fetchWishlistItems();
    } catch (e) {
      wishlistItems = [];
    }
    try {
      if (typeof fetchCartItems === 'function') {
        myCartItems = await fetchCartItems();
      }
    } catch (e) {
      myCartItems = [];
    }
    try {
      if (typeof fetchMyOrders === 'function') {
        const resp = await fetchMyOrders();
        myOrders = (resp && resp.success) ? (resp.orders || []) : [];
      }
    } catch (e) {
      myOrders = [];
    }
    const kpiTotalEl = document.getElementById('kpiWishlistTotal');
    const kpiTopEl = document.getElementById('kpiMostWishProduct');
    const kpiAvgEl = document.getElementById('kpiWishlistAvgPerUser');
    const kpiConvEl = document.getElementById('kpiWishlistConversion');
    if (kpiTotalEl) kpiTotalEl.textContent = String(wishlistItems.length || 0);
    if (kpiTopEl) {
      const topName = wishlistItems[0]?.product?.name || '-';
      kpiTopEl.textContent = topName;
    }
    if (kpiAvgEl) {
      // Global average per user requires admin-wide wishlist data (not available).
      // Show N/A to avoid misleading numbers.
      kpiAvgEl.textContent = 'N/A';
    }
    if (kpiConvEl) {
      const w = Number(wishlistItems.length || 0);
      const c = Number(Array.isArray(myCartItems) ? myCartItems.length : 0);
      const purchased = Number((myOrders || []).filter(o => String(o.paymentStatus || '').toUpperCase() === 'PAID').length);
      const conv = w > 0 ? Math.round(((c || 0) / w) * 100) : 0;
      kpiConvEl.textContent = `${conv}%`;
    }
    const catCounts = {};
    wishlistItems.forEach(w => {
      const cat = w.product?.category || 'Unknown';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const catLabels = Object.keys(catCounts);
    const catData = catLabels.map(k => catCounts[k]);
    ensureChart('chartWishlistByCategory', 'pie', {
      data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: getPalette(catLabels.length) }] },
      options: { plugins: { legend: { display: true } } }
    });
    const pidCounts = {};
    wishlistItems.forEach(w => {
      const pid = String(w.productId || w.product?.id || '');
      if (!pid) return;
      pidCounts[pid] = (pidCounts[pid] || 0) + 1;
    });
    const topWish = Object.entries(pidCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const nameByPid = {};
    products.forEach(p => { nameByPid[String(p.id || '')] = p.name || p.id; });
    ensureChart('chartTopWishlistedProducts', 'bar', {
      data: { labels: topWish.map(([pid]) => nameByPid[pid] || pid), datasets: [{ label: 'Wishlists', data: topWish.map(([, c]) => c), backgroundColor: '#D4AF37' }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
    const w = Number(wishlistItems.length || 0);
    const c = Number(Array.isArray(myCartItems) ? myCartItems.length : 0);
    const o = Number((myOrders || []).filter(ord => String(ord.paymentStatus || '').toUpperCase() === 'PAID').length);
    ensureChart('chartWishlistFunnel', 'bar', {
      data: { labels: ['Wishlist', 'Cart', 'Purchased'], datasets: [{ label: 'Count', data: [w, c, o], backgroundColor: ['#F4E4C1', '#D4AF37', '#21c997'] }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
    const ordersByUser = {};
    const spentByUser = {};
    orders.forEach(o => {
      const uid = String(o.userId || '');
      if (!uid) return;
      ordersByUser[uid] = (ordersByUser[uid] || 0) + 1;
      if (String(o.paymentStatus || '').toUpperCase() === 'PAID') {
        spentByUser[uid] = (spentByUser[uid] || 0) + Number(o.total || 0);
      }
    });
    const tbodyUsers = document.getElementById('wishlistTopUsersTbody');
    if (tbodyUsers) {
      const rows = users.map(u => {
        const uid = String(u.id || '');
        const ordersCount = ordersByUser[uid] || 0;
        const spent = Math.round(spentByUser[uid] || 0);
        return { name: u.name || '-', email: u.email || '-', wishlist: '-', orders: ordersCount, spent };
      }).sort((a, b) => b.orders - a.orders).slice(0, 10);
      tbodyUsers.innerHTML = rows.map(r => `<tr><td>${r.name}</td><td>${r.email}</td><td>${r.wishlist}</td><td>${r.orders}</td><td>₹${r.spent.toLocaleString('en-IN')}</td></tr>`).join('') || '<tr><td colspan="5">No data</td></tr>';
    }
    const lowStockResp = await fetchLowStock().catch(() => ({}));
    const lowStockProducts = (lowStockResp && lowStockResp.success) ? (lowStockResp.products || []) : [];
    const alertBody = document.getElementById('wishlistLowStockAlertTbody');
    if (alertBody) {
      alertBody.innerHTML = lowStockProducts.map(p => `
        <tr>
          <td>${p.name || '-'}</td>
          <td>-</td>
          <td>${p.stock ?? 0}</td>
        </tr>
      `).join('') || '<tr><td colspan="3">No low stock products</td></tr>';
    }
  }

  function renderRevOrdersAreaApex(monthlyResp) {
    if (!window.ApexCharts) return;
    const items = (monthlyResp && monthlyResp.success) ? (monthlyResp.items || []) : [];
    const labels = items.map(m => `${String(m.month).padStart(2, '0')}/${m.year}`);
    const revenueData = items.map(m => Number(m.paidTotal || 0));
    const ordersData = items.map(m => Number(m.ordersCount || 0));
    const el = document.querySelector('#apexRevOrdersArea');
    if (!el) return;
    el.innerHTML = '';
    const options = {
      chart: { type: 'area', background: 'transparent', foreColor: '#f0f0f0' },
      series: [
        { name: 'Revenue (₹)', data: revenueData },
        { name: 'Orders', data: ordersData }
      ],
      xaxis: { categories: labels, labels: { rotate: -45 } },
      colors: ['#D4AF37', '#00d9ff'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.25, opacityTo: 0.05 } },
      tooltip: { shared: true }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderProductsPage(productsResp, ordersResp, analyticsResp) {
    const products = (productsResp && productsResp.success) ? (productsResp.products || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const analytics = (analyticsResp && analyticsResp.success) ? analyticsResp : null;
    const totalEl = document.getElementById('prodTotal');
    const activeEl = document.getElementById('prodActive');
    const lowEl = document.getElementById('prodLowStock');
    const catEl = document.getElementById('prodCategories');
    if (totalEl) totalEl.textContent = String(products.length);
    const activeCount = products.filter(p => p.isActive !== false && p.isActive !== 0).length;
    if (activeEl) activeEl.textContent = String(activeCount);
    const lowCount = products.filter(p => Number(p.stock || 0) <= 10).length;
    if (lowEl) lowEl.textContent = String(lowCount);
    const cats = Array.from(new Set(products.map(p => p.category || 'Unknown')));
    if (catEl) catEl.textContent = String(cats.length);
    const catCounts = {};
    products.forEach(p => { const c = p.category || 'Unknown'; catCounts[c] = (catCounts[c] || 0) + 1; });
    const catLabels = Object.keys(catCounts);
    const catData = catLabels.map(k => catCounts[k]);
    ensureChart('chartProductCategoryDonut', 'doughnut', {
      data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: getPalette(catLabels.length) }] },
      options: { plugins: { legend: { display: true } } }
    });
    const bins = [
      { label: '0', test: v => v === 0 },
      { label: '1-10', test: v => v >= 1 && v <= 10 },
      { label: '11-50', test: v => v >= 11 && v <= 50 },
      { label: '51-100', test: v => v >= 51 && v <= 100 },
      { label: '100+', test: v => v > 100 }
    ];
    const stockCounts = bins.map(b => products.filter(p => b.test(Number(p.stock || 0))).length);
    ensureChart('chartStockDistributionBar', 'bar', {
      data: { labels: bins.map(b => b.label), datasets: [{ label: 'Products', data: stockCounts, backgroundColor: '#D4AF37' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
    const priceBins = [
      { label: '<₹1k', test: v => v < 1000 },
      { label: '₹1k-₹5k', test: v => v >= 1000 && v < 5000 },
      { label: '₹5k-₹10k', test: v => v >= 5000 && v < 10000 },
      { label: '₹10k-₹25k', test: v => v >= 10000 && v < 25000 },
      { label: '₹25k+', test: v => v >= 25000 }
    ];
    const priceCounts = priceBins.map(b => products.filter(p => b.test(Number(p.price || 0))).length);
    ensureChart('chartPriceHistogram', 'bar', {
      data: { labels: priceBins.map(b => b.label), datasets: [{ label: 'Products', data: priceCounts, backgroundColor: '#8a6f1a' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
    let topRevRows = [];
    if (analytics && Array.isArray(analytics.topProductsByRevenue)) {
      topRevRows = analytics.topProductsByRevenue.slice(0, 10).map(item => ({ name: item.key, revenue: Number(item.value || 0) }));
    } else {
      const revByPid = {};
      const priceByPid = {};
      products.forEach(p => { priceByPid[String(p.id || p._id || '')] = Number(p.price || 0); });
      orders.forEach(o => {
        if (String(o.paymentStatus || '').toUpperCase() !== 'PAID') return;
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach(it => {
          const pid = String(it.productId || it.product_id || '');
          const qty = Number(it.quantity || it.qty || 0);
          revByPid[pid] = (revByPid[pid] || 0) + qty * (priceByPid[pid] || 0);
        });
      });
      const nameByPid = {}; products.forEach(p => { nameByPid[String(p.id || p._id || '')] = p.name || p.id; });
      topRevRows = Object.entries(revByPid).map(([pid, rev]) => ({ name: nameByPid[pid] || pid, revenue: Math.round(rev) }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }
    ensureChart('chartTopRevenueProductsProducts', 'bar', {
      data: { labels: topRevRows.map(r => r.name), datasets: [{ label: 'Revenue (₹)', data: topRevRows.map(r => r.revenue), backgroundColor: '#D4AF37' }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });
  }

  function renderUsersPage(usersResp, ordersResp) {
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const counts = {};
    const spent = {};
    orders.forEach(o => {
      const uid = String(o.userId || '');
      if (!uid) return;
      counts[uid] = (counts[uid] || 0) + 1;
      if (String(o.paymentStatus || '').toUpperCase() === 'PAID') {
        spent[uid] = (spent[uid] || 0) + Number(o.total || 0);
      }
    });
    const withOrders = Object.keys(counts).length;
    const usersWithOrdersEl = document.getElementById('usersWithOrders');
    const usersNoOrdersEl = document.getElementById('usersNoOrders');
    if (usersWithOrdersEl) usersWithOrdersEl.textContent = String(withOrders);
    if (usersNoOrdersEl) usersNoOrdersEl.textContent = String(Math.max(0, users.length - withOrders));
    renderUserGrowthMonthApex(usersResp);
    renderDailySignups(usersResp, 7);
    renderDailySignups(usersResp, 30);
    renderUsersWithVsWithoutOrders(usersResp, ordersResp);
    const recent = [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);
    const topSpend = Object.entries(spent).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([uid, val]) => {
      const u = users.find(x => String(x.id || '') === uid);
      return { name: u ? u.name : uid, email: u ? u.email : '-', value: Math.round(val) };
    });
    renderTopSpendingUsersApex(topSpend);
    const mostVisiting = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([uid, cnt]) => {
      const u = users.find(x => String(x.id || '') === uid);
      return { name: u ? u.name : uid, email: u ? u.email : '-', cnt };
    });
    renderMostVisitingUsersApex(mostVisiting);
    const last7 = users.filter(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      if (!d) return false;
      const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).slice(0, 20);
    renderNewUsersAreaApex(last7);
    const dirTbody = document.getElementById('usersDirectoryTbody');
    const applyDirectory = () => {
      const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
      const start = document.getElementById('userJoinedStart')?.value || '';
      const end = document.getElementById('userJoinedEnd')?.value || '';
      const startD = start ? new Date(start) : null;
      const endD = end ? new Date(end) : null;
      const rows = users.filter(u => {
        const okQ = !q || (String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q) || String(u.phone || '').toLowerCase().includes(q));
        const d = u.createdAt ? new Date(u.createdAt) : null;
        const okStart = !startD || (d && d >= startD);
        const okEnd = !endD || (d && d <= endD);
        return okQ && okStart && okEnd;
      }).slice(0, 100).map(u => {
        const uid = String(u.id || '');
        const orderCount = counts[uid] || 0;
        const totalSpent = Math.round(spent[uid] || 0);
        const tags = [];
        if (totalSpent >= 100000) tags.push('VIP');
        if (orderCount >= 3) tags.push('Frequent');
        const d = u.createdAt ? new Date(u.createdAt) : null;
        if (d && (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7) tags.push('New');
        const lastOrder = orders.filter(o => String(o.userId || '') === uid).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
        const inactive = !lastOrder || ((Date.now() - new Date(lastOrder.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24) > 90);
        if (inactive) tags.push('At-Risk');
        if (orderCount <= 1 && d && ((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) > 90)) tags.push('Low Purchase');
        return `
          <tr>
            <td>${u.name || '-'}</td>
            <td>${u.email || '-'}</td>
            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
            <td>${orderCount}</td>
            <td>${'₹' + Number(totalSpent).toLocaleString('en-IN')}</td>
            <td>${tags.join(', ')}</td>
          </tr>
        `;
      }).join('');
      if (dirTbody) dirTbody.innerHTML = rows;
      const atRiskEl = document.getElementById('atRiskUsers');
      if (atRiskEl) {
        const countAtRisk = users.filter(u => {
          const uid = String(u.id || '');
          const lastOrder = orders.filter(o => String(o.userId || '') === uid).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
          return !lastOrder || ((Date.now() - new Date(lastOrder.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24) > 90);
        }).length;
        atRiskEl.textContent = String(countAtRisk);
      }
      const new7El = document.getElementById('newUsers7d');
      if (new7El) {
        const countNew7 = users.filter(u => {
          const d = u.createdAt ? new Date(u.createdAt) : null;
          return d && ((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7);
        }).length;
        new7El.textContent = String(countNew7);
      }
    };
    document.getElementById('userFilterApply')?.addEventListener('click', applyDirectory);
    applyDirectory();
  }

  function renderUserGrowthMonth(usersResp) {
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const map = {};
    users.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    const labels = Object.keys(map).sort();
    ensureChart('chartUserGrowthMonth', 'bar', { data: { labels, datasets: [{ label: 'Users', data: labels.map(k => map[k]), backgroundColor: '#b76e79' }] }, options: { scales: { y: { beginAtZero: true } } } });
  }

  function renderUserGrowthMonthApex(usersResp) {
    if (!window.ApexCharts) return;
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const map = {};
    users.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    const labels = Object.keys(map).sort();
    const series = labels.map(k => map[k]);
    const el = document.querySelector('#chartUserGrowthMonth') || document.querySelector('#apexUserGrowthMonth');
    if (!el) return;
    el.innerHTML = '';
    const options = {
      chart: { type: 'area', background: 'transparent', foreColor: '#f0f0f0' },
      series: [{ name: 'Users', data: series }],
      xaxis: { categories: labels },
      colors: ['#D4AF37'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.25, opacityTo: 0.05 } }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderTopSpendingUsersApex(rows) {
    if (!window.ApexCharts) return;
    const el = document.querySelector('#apexTopSpendingUsersBar');
    if (!el) return;
    const labels = rows.map(r => r.name);
    const data = rows.map(r => r.value);
    const options = {
      chart: { type: 'bar', background: 'transparent', foreColor: '#f0f0f0' },
      series: [{ name: 'Spent (₹)', data }],
      xaxis: { categories: labels },
      colors: ['#D4AF37'],
      plotOptions: { bar: { horizontal: true } },
      dataLabels: { enabled: false }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderMostVisitingUsersApex(rows) {
    if (!window.ApexCharts) return;
    const el = document.querySelector('#apexMostVisitingUsersBar');
    if (!el) return;
    const labels = rows.map(r => r.name);
    const data = rows.map(r => r.cnt);
    const options = {
      chart: { type: 'bar', background: 'transparent', foreColor: '#f0f0f0' },
      series: [{ name: 'Orders (proxy visits)', data }],
      xaxis: { categories: labels },
      colors: ['#00d9ff'],
      plotOptions: { bar: { horizontal: true } },
      dataLabels: { enabled: false }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderNewUsersAreaApex(last7) {
    if (!window.ApexCharts) return;
    const el = document.querySelector('#apexNewUsersArea');
    if (!el) return;
    const labels = last7.map(u => (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'));
    const data = last7.map(() => 1);
    const options = {
      chart: { type: 'area', background: 'transparent', foreColor: '#f0f0f0' },
      series: [{ name: 'New Users', data }],
      xaxis: { categories: labels },
      colors: ['#D4AF37'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.25, opacityTo: 0.05 } }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderDailySignups(usersResp, days) {
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
    }
    users.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (map[key] != null) map[key]++;
    });
    const labels = Object.keys(map);
    const data = labels.map(k => map[k]);
    const id = days === 7 ? 'chartDailySignups7' : 'chartDailySignups30';
    ensureChart(id, 'line', { data: { labels, datasets: [{ label: 'Signups', data, borderColor: '#8e3d49', backgroundColor: 'rgba(142,61,73,0.15)', tension: 0.35, fill: true }] }, options: { scales: { y: { beginAtZero: true } } } });
  }

  function renderUsersWithVsWithoutOrders(usersResp, ordersResp) {
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const withOrdersSet = new Set(orders.map(o => String(o.userId || '')));
    const withCount = Array.from(withOrdersSet).filter(id => !!id).length;
    const withoutCount = Math.max(0, users.length - withCount);
    ensureChart('chartUsersWithVsWithoutOrders', 'doughnut', { data: { labels: ['With Orders', 'No Orders'], datasets: [{ data: [withCount, withoutCount], backgroundColor: ['#b76e79', '#fff7e6'] }] } });
  }

  function renderReturningDonutApex(usersResp, ordersResp) {
    if (!window.ApexCharts) return;
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const countsByUser = {};
    orders.forEach(o => { const uid = String(o.userId || ''); if (!uid) return; countsByUser[uid] = (countsByUser[uid] || 0) + 1; });
    const returning = Object.values(countsByUser).filter(c => c > 1).length;
    const firstTime = Object.values(countsByUser).filter(c => c === 1).length;
    const totalWithOrders = Object.keys(countsByUser).length || 1;
    const repeatRate = Math.round((returning / totalWithOrders) * 100);
    const el = document.querySelector('#apexReturningDonut');
    if (!el) return;
    const options = {
      chart: { type: 'donut', background: 'transparent', foreColor: '#f0f0f0' },
      series: [firstTime, returning],
      labels: ['First-time', 'Returning'],
      colors: ['#333333', '#D4AF37'],
      dataLabels: { enabled: true },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { show: true, color: '#bdbdbd' },
              value: { show: true, formatter: () => `${repeatRate}%`, color: '#D4AF37', fontSize: '20px' }
            }
          }
        }
      }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderRepeatGaugeApex(usersResp, ordersResp) {
    if (!window.ApexCharts) return;
    const users = (usersResp && usersResp.success) ? (usersResp.users || []) : [];
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const countsByUser = {};
    orders.forEach(o => { const uid = String(o.userId || ''); if (!uid) return; countsByUser[uid] = (countsByUser[uid] || 0) + 1; });
    const returning = Object.values(countsByUser).filter(c => c > 1).length;
    const totalWithOrders = Object.keys(countsByUser).length || 1;
    const repeatRate = Math.round((returning / totalWithOrders) * 100);
    const el = document.querySelector('#apexRepeatGauge');
    if (!el) return;
    const options = {
      chart: { type: 'radialBar', background: 'transparent', foreColor: '#f0f0f0' },
      series: [repeatRate],
      colors: ['#D4AF37'],
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          dataLabels: { name: { show: true, color: '#bdbdbd' }, value: { show: true, color: '#D4AF37', fontSize: '20px' } }
        }
      },
      labels: ['Repeat Rate']
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }

  function renderCategoryRevenueTreemapApex(ordersResp, productsResp) {
    if (!window.ApexCharts) return;
    const orders = (ordersResp && ordersResp.success) ? (ordersResp.orders || []) : [];
    const products = (productsResp && productsResp.success) ? (productsResp.products || []) : [];
    const catByPid = {};
    const priceByPid = {};
    products.forEach(p => {
      const pid = String(p.id || p._id || '');
      catByPid[pid] = p.category || 'Unknown';
      priceByPid[pid] = Number(p.price || 0);
    });
    const revenueByCat = {};
    orders.forEach(o => {
      if (String(o.paymentStatus || '').toUpperCase() !== 'PAID') return;
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        const pid = String(it.productId || it.product_id || '');
        const cat = catByPid[pid] || 'Unknown';
        const qty = Number(it.quantity || it.qty || 0);
        const rev = qty * (priceByPid[pid] || 0);
        revenueByCat[cat] = (revenueByCat[cat] || 0) + rev;
      });
    });
    const data = Object.entries(revenueByCat).map(([name, value]) => ({ x: name, y: Math.round(value) }));
    const el = document.querySelector('#apexCategoryRevenueTreemap');
    if (!el) return;
    const options = {
      chart: { type: 'treemap', background: 'transparent', foreColor: '#f0f0f0' },
      series: [{ data }],
      legend: { show: false },
      colors: ['#D4AF37', '#b8962f', '#8a6f1a', '#6b5513'],
      dataLabels: { enabled: true, formatter: (val) => '₹' + Number(val).toLocaleString('en-IN') }
    };
    const chart = new ApexCharts(el, options);
    chart.render();
  }
  window.viewUser = function (id) { window.location.href = `admin-users.html?id=${encodeURIComponent(id)}`; };
  window.viewUserOrders = function (id) { window.location.href = `admin-orders.html?user=${encodeURIComponent(id)}`; };

  window.AdminAnalytics = { init, refreshCharts };
})();
