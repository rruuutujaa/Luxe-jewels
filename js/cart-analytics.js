// Lightweight Cart Analytics (current user scope)
// No new endpoints; uses existing fetchCartItems and fetchMe
// Renders KPI cards, charts, and an Active Carts table for the current user
;(function () {
  const state = { items: [], user: null, charts: {} };
  function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
  function toINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function getCtx(id) { const el = document.getElementById(id); return el ? el.getContext('2d') : null; }
  function destroyChart(id) { if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; } }
  async function load() {
    try {
      const [items, user] = await Promise.all([
        typeof fetchCartItems === 'function' ? fetchCartItems() : Promise.resolve([]),
        typeof fetchMe === 'function' ? fetchMe() : Promise.resolve({ success: false })
      ]);
      state.items = Array.isArray(items) ? items.filter(i => i && i.product) : [];
      state.user = user && user.success !== false ? (user.user || user) : null;
    } catch (e) {
      state.items = [];
      state.user = null;
    }
  }
  function renderKPIs() {
    const active = state.items.length > 0 ? 1 : 0;
    const usersWithCart = active; // current user scope
    const totalItems = sum(state.items.map(i => Number(i.quantity || 1)));
    const totalValue = sum(state.items.map(i => {
      const price = i.product && i.product.price ? Number(i.product.price) : 0;
      return Number(i.quantity || 1) * price;
    }));
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('kpiActiveCarts', String(active));
    setText('kpiUsersWithCart', String(usersWithCart));
    setText('kpiTotalCartItems', String(totalItems));
    setText('kpiTotalCartValue', toINR(Math.round(totalValue)));
  }
  function renderTopAddedProductsBar() {
    const id = 'chartTopAddedProductsBar';
    destroyChart(id);
    const ctx = getCtx(id);
    if (!ctx) return;
    const items = state.items.slice().sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0)).slice(0, 5);
    const labels = items.map(i => (i.product && i.product.name) ? i.product.name : 'Product');
    const data = items.map(i => Number(i.quantity || 0));
    state.charts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Qty', data, backgroundColor: labels.map(() => '#D4AF37') }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } } }
    });
  }
  function renderCartValueDistribution() {
    const id = 'chartCartValueDistribution';
    destroyChart(id);
    const ctx = getCtx(id);
    if (!ctx) return;
    const total = sum(state.items.map(i => Number(i.quantity || 1) * Number(i.product && i.product.price ? i.product.price : 0)));
    const buckets = [
      { label: '₹0–1k', min: 0, max: 1000 },
      { label: '₹1k–5k', min: 1000, max: 5000 },
      { label: '₹5k–10k', min: 5000, max: 10000 },
      { label: '₹10k+', min: 10000, max: Infinity }
    ];
    const labels = buckets.map(b => b.label);
    const values = buckets.map(b => (total >= b.min && total < b.max) ? 1 : 0);
    state.charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: ['#F4E4C1', '#D4AF37', '#B8962F', '#8A6F1A'] }] },
      options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false }
    });
  }
  function renderActiveCartsTable() {
    const tbody = document.getElementById('cartsActiveTbody');
    if (!tbody) return;
    const userName = state.user && (state.user.name || state.user.fullName) ? (state.user.name || state.user.fullName) : '-';
    const itemsCount = sum(state.items.map(i => Number(i.quantity || 1)));
    const totalValue = sum(state.items.map(i => Number(i.quantity || 1) * Number(i.product && i.product.price ? i.product.price : 0)));
    const top = state.items.slice().sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))[0];
    const topName = top && top.product && top.product.name ? top.product.name : '-';
    const lastUpdated = '-'; // CartItem lacks timestamps
    const action = `<button class="btn btn-primary btn-sm" onclick="window.location.href='cart.html'">View Cart</button>`;
    if (state.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No active carts</td></tr>';
      return;
    }
    tbody.innerHTML = `
      <tr>
        <td>${userName}</td>
        <td>${itemsCount}</td>
        <td>${toINR(Math.round(totalValue))}</td>
        <td>${topName}</td>
        <td>${lastUpdated}</td>
        <td>${action}</td>
      </tr>
    `;
  }
  async function init() {
    await load();
    renderKPIs();
    renderTopAddedProductsBar();
    renderCartValueDistribution();
    renderActiveCartsTable();
  }
  async function refresh() { await init(); }
  window.CartAnalytics = { init, refresh };
})();
