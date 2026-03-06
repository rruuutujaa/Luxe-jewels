document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        alert('No Order ID provided');
        window.close();
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch orders and find the specific one
        // Note: Ideally we should have a specific endpoint for fetching a single order by ID
        // For now, we'll fetch all my orders and filter client-side
        const data = await fetchMyOrders();
        
        if (data.success && data.orders) {
            const order = data.orders.find(o => o.id === orderId);
            if (order) {
                renderInvoice(order);
            } else {
                alert('Order not found');
            }
        } else {
            alert('Failed to load order details');
        }

    } catch (error) {
        console.error('Error fetching invoice:', error);
        alert('An error occurred while loading the invoice');
    }
});

function renderInvoice(order) {
    document.getElementById('invoiceId').textContent = 'INV-' + order.id.substring(order.id.length - 6).toUpperCase();
    document.getElementById('invoiceDate').textContent = new Date(order.createdAt).toLocaleDateString();
    document.getElementById('orderId').textContent = order.id;

    // Customer details
    // Note: Since the order object might not have full customer details embedded depending on the backend,
    // we might need to rely on what's available or fetch the user profile.
    // For now, let's assume the user viewing this is the owner.
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('customerName').textContent = user.name || 'Valued Customer';
    document.getElementById('customerEmail').textContent = user.email || '';
    
    // Address - if stored in order, use it. Otherwise placeholder.
    // The current Order model might not store the snapshot of the address.
    document.getElementById('customerAddress').textContent = order.shippingAddress ? 
        `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}` : 
        'Address on file';

    const tbody = document.getElementById('invoiceItems');
    tbody.innerHTML = '';

    let subtotal = 0;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
}
