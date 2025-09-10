// User Management JavaScript
const API_URL = '/api';
let users = [];
let currentEditingUserId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    if (!authManager.hasRole('admin')) {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/';
        return;
    }

    loadUsers();
});

// Load all users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        users = await response.json();
        displayUsers();
        updateStatistics();
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users', 'error');
    }
}

// Display users in table
function displayUsers() {
    const tbody = document.getElementById('users-tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr class="user-row" data-user-id="${user.id}">
            <td>
                <strong>${user.first_name} ${user.last_name}</strong>
                ${user.id === authManager.getUser().id ? '<span class="badge">(You)</span>' : ''}
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>
            </td>
            <td>
                ${user.is_engineer ? '<span class="status-active">✓ Yes</span>' : '<span class="status-inactive">No</span>'}
            </td>
            <td>
                <span class="user-status ${user.is_active ? 'status-active' : 'status-inactive'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${formatDate(user.last_login)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="user-actions">
                    <button class="btn btn-sm" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn btn-sm" onclick="resetPassword(${user.id})">Reset Password</button>
                    ${user.id !== authManager.getUser().id ? 
                        `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>` : 
                        ''
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStatistics() {
    document.getElementById('total-users').textContent = users.length;
    document.getElementById('active-users').textContent = users.filter(u => u.is_active).length;
    document.getElementById('total-engineers').textContent = users.filter(u => u.is_engineer).length;
    document.getElementById('total-admins').textContent = users.filter(u => u.role === 'admin').length;
}

// Show add user dialog
function showAddUserDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.minWidth = '600px';
    
    dialog.innerHTML = `
        <h3>Add New User</h3>
        <form id="add-user-form" class="user-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="first_name">First Name *</label>
                    <input type="text" id="first_name" name="first_name" required>
                </div>
                <div class="form-group">
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="last_name" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="email">Email Address *</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="role">Role *</label>
                    <select id="role" name="role" required>
                        <option value="user">User</option>
                        <option value="engineer">Engineer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-checkbox">
                        <input type="checkbox" id="is_engineer" name="is_engineer">
                        <label for="is_engineer">Is Engineer (can be assigned tasks)</label>
                    </div>
                </div>
            </div>
            
            <div class="form-checkbox">
                <input type="checkbox" id="send_invite" name="send_invite" ${authManager.getUser().email_enabled ? 'checked' : ''}>
                <label for="send_invite">Send invitation email with temporary password</label>
            </div>
            
            <div class="confirm-dialog-buttons">
                <button type="button" class="btn btn-secondary" onclick="closeDialog()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create User</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Auto-check engineer checkbox when engineer role is selected
    document.getElementById('role').addEventListener('change', (e) => {
        if (e.target.value === 'engineer') {
            document.getElementById('is_engineer').checked = true;
        }
    });
    
    // Handle form submission
    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createUser(e.target);
    });
}

// Create user
async function createUser(form) {
    const formData = new FormData(form);
    const userData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        role: formData.get('role'),
        is_engineer: formData.get('is_engineer') === 'on',
        send_invite: formData.get('send_invite') === 'on'
    };

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (response.ok) {
            closeDialog();
            
            if (data.tempPassword) {
                showPasswordDialog(userData.email, data.tempPassword);
            } else {
                showAlert('User created successfully. Invitation email sent.', 'success');
            }
            
            loadUsers();
        } else {
            showAlert(data.error || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showAlert('Failed to create user', 'error');
    }
}

// Edit user
async function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    currentEditingUserId = userId;
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.minWidth = '600px';
    
    dialog.innerHTML = `
        <h3>Edit User</h3>
        <form id="edit-user-form" class="user-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="edit_first_name">First Name *</label>
                    <input type="text" id="edit_first_name" name="first_name" value="${user.first_name}" required>
                </div>
                <div class="form-group">
                    <label for="edit_last_name">Last Name *</label>
                    <input type="text" id="edit_last_name" name="last_name" value="${user.last_name}" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="edit_email">Email Address *</label>
                <input type="email" id="edit_email" name="email" value="${user.email}" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="edit_role">Role *</label>
                    <select id="edit_role" name="role" required>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="engineer" ${user.role === 'engineer' ? 'selected' : ''}>Engineer</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-checkbox">
                        <input type="checkbox" id="edit_is_engineer" name="is_engineer" ${user.is_engineer ? 'checked' : ''}>
                        <label for="edit_is_engineer">Is Engineer</label>
                    </div>
                </div>
            </div>
            
            <div class="form-checkbox">
                <input type="checkbox" id="edit_is_active" name="is_active" ${user.is_active ? 'checked' : ''}>
                <label for="edit_is_active">Account is active</label>
            </div>
            
            <div class="confirm-dialog-buttons">
                <button type="button" class="btn btn-secondary" onclick="closeDialog()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Handle form submission
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUser(e.target);
    });
}

// Update user
async function updateUser(form) {
    const formData = new FormData(form);
    const userData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        role: formData.get('role'),
        is_engineer: formData.get('is_engineer') === 'on',
        is_active: formData.get('is_active') === 'on'
    };

    try {
        const response = await fetch(`${API_URL}/users/${currentEditingUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            closeDialog();
            showAlert('User updated successfully', 'success');
            loadUsers();
        } else {
            const data = await response.json();
            showAlert(data.error || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showAlert('Failed to update user', 'error');
    }
}

// Reset password
async function resetPassword(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Reset password for ${user.first_name} ${user.last_name}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ send_email: false })
        });

        const data = await response.json();
        
        if (response.ok) {
            if (data.tempPassword) {
                showPasswordDialog(user.email, data.tempPassword);
            } else {
                showAlert('Password reset email sent', 'success');
            }
        } else {
            showAlert(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showAlert('Failed to reset password', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            const data = await response.json();
            showAlert(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user', 'error');
    }
}

// Show password dialog
function showPasswordDialog(email, password) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
        <h3>Temporary Password</h3>
        <p>Please share these credentials with the user:</p>
        <div class="password-display">
            <strong>Email:</strong> ${email}<br>
            <strong>Password:</strong> ${password}
        </div>
        <p style="margin-top: var(--spacing-md); color: var(--tsr-gray-600);">
            The user will be prompted to change this password on first login.
        </p>
        <div class="confirm-dialog-buttons">
            <button class="btn btn-primary" onclick="closeDialog()">Close</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

// Close dialog
function closeDialog() {
    document.querySelector('.confirm-dialog-overlay')?.remove();
    document.querySelector('.confirm-dialog')?.remove();
    currentEditingUserId = null;
}

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? 'var(--tsr-success)' : 'var(--tsr-error)'};
        color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Make functions available globally
window.showAddUserDialog = showAddUserDialog;
window.editUser = editUser;
window.resetPassword = resetPassword;
window.deleteUser = deleteUser;
window.closeDialog = closeDialog;