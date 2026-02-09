// Authentication Functions
class Auth {
    constructor() {
        this.baseURL = 'http://localhost:3000/api/auth';
        this.tokenKey = 'aura_ai_token';
        this.userKey = 'aura_ai_user';
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
    }

    // Check authentication status
    checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        const user = localStorage.getItem(this.userKey);
        
        if (token && user) {
            // Validate token with backend
            this.validateToken(token).then(isValid => {
                if (isValid) {
                    this.showMainApp();
                } else {
                    this.showLogin();
                    this.showToast('Session expired', 'Please login again', 'warning');
                }
            }).catch(() => {
                this.showLogin();
            });
        } else {
            this.showLogin();
        }
    }

    // Validate token with backend
    async validateToken(token) {
        try {
            const response = await fetch(`${this.baseURL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Show login page
    showLogin() {
        window.location.href = 'login.html';
    }

    // Show main app
    showMainApp() {
        const user = JSON.parse(localStorage.getItem(this.userKey));
        if (user) {
            document.getElementById('username').textContent = user.username;
            document.getElementById('userEmail').textContent = user.email;
        }
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'flex';
        }, 300);
    }

    // Register user
    async register(username, email, password) {
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.saveAuthData(data.token, data.user);
                this.showMainApp();
                this.showToast('Success', 'Registration successful!', 'success');
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showToast('Error', error.message || 'Registration failed', 'error');
            return false;
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.saveAuthData(data.token, data.user);
                this.showMainApp();
                this.showToast('Success', 'Login successful!', 'success');
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showToast('Error', error.message || 'Login failed', 'error');
            return false;
        }
    }

    // Logout user
    async logout() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            await fetch(`${this.baseURL}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
            this.showLogin();
            this.showToast('Success', 'Logged out successfully', 'success');
        }
    }

    // Save authentication data
    saveAuthData(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // Get current token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get current user
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    // Show toast notification
    showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Setup event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }
}

// Initialize auth
const auth = new Auth();

// Export for use in other files
window.Auth = auth;

// Login page specific code
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const showRegisterBtn = document.getElementById('showRegister');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                const loginBtn = document.getElementById('loginBtn');
                const originalText = loginBtn.innerHTML;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                loginBtn.disabled = true;
                
                const success = await auth.login(email, password);
                
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                
                if (!success) {
                    document.getElementById('password').value = '';
                }
            });
        }
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                window.location.href = 'register.html';
            });
        }
    });
}

// Register page specific code
if (window.location.pathname.includes('register.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const registerForm = document.getElementById('registerForm');
        const showLoginBtn = document.getElementById('showLogin');
        
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                // Validation
                if (password !== confirmPassword) {
                    auth.showToast('Error', 'Passwords do not match', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    auth.showToast('Error', 'Password must be at least 6 characters', 'error');
                    return;
                }
                
                const registerBtn = document.getElementById('registerBtn');
                const originalText = registerBtn.innerHTML;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
                registerBtn.disabled = true;
                
                const success = await auth.register(username, email, password);
                
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
                
                if (!success) {
                    document.getElementById('password').value = '';
                    document.getElementById('confirmPassword').value = '';
                }
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
    });
}
