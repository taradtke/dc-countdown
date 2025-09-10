// Authentication Management
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.user = this.getStoredUser();
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if we're on the login page
        if (window.location.pathname === '/login.html') {
            this.initializeLoginForm();
        } else {
            // Check if user is authenticated for protected pages
            this.checkAuthentication();
            this.displayUserInfo();
        }

        // Add logout handler to any logout buttons
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });
    }

    displayUserInfo() {
        const userInfoEl = document.getElementById('user-info');
        if (userInfoEl && this.user) {
            userInfoEl.textContent = `${this.user.first_name} ${this.user.last_name} (${this.user.role})`;
        }
    }

    initializeLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e.target);
        });
    }

    async handleLogin(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorMsg = document.getElementById('error-message');
        
        // Clear previous errors
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
        
        // Show loading state
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                // Store tokens and user info
                this.setAuthData(data);
                
                // Redirect to main dashboard
                window.location.href = '/';
            } else {
                // Show error message
                errorMsg.textContent = data.error || 'Login failed. Please try again.';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMsg.textContent = 'Network error. Please check your connection and try again.';
            errorMsg.style.display = 'block';
        } finally {
            // Remove loading state
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    }

    setAuthData(data) {
        this.token = data.token;
        this.refreshToken = data.refreshToken;
        this.user = data.user;

        // Store in localStorage
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('user', JSON.stringify(this.user));

        // Set default authorization header for all future requests
        this.setAuthHeader();
    }

    setAuthHeader() {
        // Set default header for fetch
        window.defaultHeaders = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    getStoredUser() {
        const userStr = localStorage.getItem('user');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }

    async checkAuthentication() {
        // Skip auth check for public pages
        const publicPages = ['/login.html', '/health'];
        if (publicPages.some(page => window.location.pathname.includes(page))) {
            return;
        }

        if (!this.token) {
            // Redirect to login if no token
            this.redirectToLogin();
            return;
        }

        // Verify token is still valid
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                // Token is invalid, try to refresh
                const refreshed = await this.refreshAuthToken();
                if (!refreshed) {
                    this.redirectToLogin();
                }
            } else {
                // Set auth header for all requests
                this.setAuthHeader();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
        }
    }

    async refreshAuthToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                this.refreshToken = data.refreshToken;
                
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('refreshToken', this.refreshToken);
                
                this.setAuthHeader();
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    async logout() {
        try {
            // Call logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            
            // Redirect to login
            window.location.href = '/login.html';
        }
    }

    redirectToLogin() {
        // Save current URL to redirect back after login
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== '/login.html') {
            localStorage.setItem('redirectUrl', currentUrl);
        }
        window.location.href = '/login.html';
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    hasAnyRole(roles) {
        return this.user && roles.includes(this.user.role);
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Override fetch to include auth headers
const originalFetch = window.fetch;
window.fetch = function(...args) {
    // Add auth header if available
    if (authManager.getToken()) {
        // Ensure args[1] exists (options object)
        if (!args[1]) {
            args[1] = {};
        }
        
        // Ensure headers object exists
        if (!args[1].headers) {
            args[1].headers = {};
        }
        
        // Add authorization header without overriding existing headers
        args[1].headers['Authorization'] = `Bearer ${authManager.getToken()}`;
    }
    
    return originalFetch.apply(this, args);
};