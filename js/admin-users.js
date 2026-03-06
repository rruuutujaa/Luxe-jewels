document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    attachLogout();
    checkAdminAuth();
    loadUsers();

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }

    const openBtn = document.getElementById('btnOpenCreateUser');
    const modal = document.getElementById('createUserModal');
    const closeBtn = document.getElementById('closeCreateUserModal');
    const form = document.getElementById('createUserForm');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            const password = document.getElementById('userPassword').value.trim();
            const role = document.getElementById('userRole').value;

            if (!name || !email || !password) {
                showMessage('All fields are required', 'error');
                return;
            }

            try {
                const resp = await fetch(`${API_BASE_URL}/admin/users`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await resp.json();
                if (!data.success) {
                    showMessage(data.message || 'Failed to create user', 'error');
                    return;
                }
                showMessage('User created successfully', 'success');
                modal.classList.remove('active');
                form.reset();
                await loadUsers();
            } catch (e) {
                console.error(e);
                showMessage('Error creating user', 'error');
            }
        });
    }
});

function checkAdminAuth() {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!token || String(user.role || '').toUpperCase() !== 'ADMIN') {
            window.location.href = 'login.html';
            return;
        }
        const welcomeEl = document.getElementById('adminWelcome');
        if (welcomeEl) {
            welcomeEl.textContent = `Manage admins and customers, ${user.name || 'Admin'}`;
        }
    } catch (_) {}
}

function attachLogout() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
}

function handleLogout(e) {
    if (e && e.preventDefault) e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

async function loadUsers() {
    const tbody = document.getElementById('usersTbody');
    try {
        const data = await fetchAdminUsers();
        if (data.success && Array.isArray(data.users)) {
            tbody.innerHTML = data.users.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4">Failed to load users</td></tr>';
    }
}

function showMessage(msg, type) {
    const div = document.getElementById('adminMessage');
    if (!div) return;
    div.textContent = msg;
    div.className = `message ${type}`;
    div.style.display = 'block';
    setTimeout(() => {
        div.style.display = 'none';
    }, 3000);
}

