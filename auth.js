/**
 * auth.js - Novo sistema de autenticação da Trekko
 * Substitui implementações anteriores e valida CADASTUR com backend.
 */
class TrekkoAuth {
    constructor() {
        this.localApi = 'http://localhost:5000/api/auth';
        this.productionApi = 'https://p9hwiqcldgkm.manus.space/api/auth';
        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        // When running via file:// or when the local API fails, fallback to production
        this.apiUrl = isLocal ? this.localApi : this.productionApi;
        this.authToken = null;
        this.injectStyles();
        this.init();
    }

    injectStyles() {
        if (!document.querySelector('link[href="new_auth.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'new_auth.css';
            document.head.appendChild(link);
        }
    }

    init() {
        this.setupEventListeners();
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('authToken');
        if (userData) {
            try {
                this.updateUIForLoggedUser(JSON.parse(userData));
                if (token) this.authToken = token;
            } catch {
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
            }
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-auth="login"]')) {
                e.preventDefault();
                this.showLoginModal();
            }
            if (e.target.matches('[data-auth="register"]')) {
                e.preventDefault();
                this.showRegisterModal();
            }
        });
    }

    showLoginModal() {
        const modal = this.createModal('login', 'Entrar no Trekko', this.getLoginForm());
        document.body.appendChild(modal);
        this.setupLoginHandlers(modal);
    }

    showRegisterModal() {
        const modal = this.createModal('register', 'Cadastrar no Trekko', this.getRegisterForm());
        document.body.appendChild(modal);
        this.setupRegisterHandlers(modal);
    }

    createModal(type, title, content) {
        const modal = document.createElement('div');
        modal.className = 'trekko-modal-overlay';
        modal.innerHTML = `
            <div class="trekko-modal">
                <div class="trekko-modal-header">
                    <h2>${title}</h2>
                    <button class="trekko-modal-close" data-close="true">&times;</button>
                </div>
                <div class="trekko-modal-body">
                    ${content}
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-close="true"]') || e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    getLoginForm() {
        return `
            <form id="trekko-login-form" class="trekko-form">
                <div class="trekko-form-group">
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" name="email" required>
                </div>
                <div class="trekko-form-group">
                    <label for="login-password">Senha</label>
                    <input type="password" id="login-password" name="password" required>
                </div>
                <div class="trekko-form-actions">
                    <button type="submit" class="trekko-btn-primary">Entrar</button>
                </div>
                <div class="trekko-form-footer">
                    <p>Não tem conta? <a href="#" data-auth="register">Cadastre-se</a></p>
                </div>
            </form>
        `;
    }

    getRegisterForm() {
        return `
            <form id="trekko-register-form" class="trekko-form">
                <div class="trekko-form-group">
                    <label for="register-name">Nome Completo</label>
                    <input type="text" id="register-name" name="full_name" required>
                </div>
                <div class="trekko-form-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" name="email" required>
                </div>
                <div class="trekko-form-group">
                    <label for="register-password">Senha</label>
                    <input type="password" id="register-password" name="password" required minlength="6">
                </div>
                <div class="trekko-form-group">
                    <label for="register-user-type">Tipo de Usuário</label>
                    <select id="register-user-type" name="user_type" required>
                        <option value="">Selecione...</option>
                        <option value="trekker">🥾 Trekker (Usuário)</option>
                        <option value="guia">🧭 Guia Profissional</option>
                    </select>
                </div>
                <div id="cadastur-section" class="trekko-form-group" style="display: none;">
                    <label for="register-cadastur">Número CADASTUR *</label>
                    <input type="text" id="register-cadastur" name="cadastur_number" placeholder="Digite seu número CADASTUR">
                    <div id="cadastur-validation" class="trekko-validation-message"></div>
                </div>
                <div class="trekko-form-actions">
                    <button type="submit" class="trekko-btn-primary">Cadastrar</button>
                </div>
                <div class="trekko-form-footer">
                    <p>Já tem conta? <a href="#" data-auth="login">Faça login</a></p>
                </div>
            </form>
        `;
    }

    setupLoginHandlers(modal) {
        const form = modal.querySelector('#trekko-login-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(form, modal);
        });
    }

    setupRegisterHandlers(modal) {
        const form = modal.querySelector('#trekko-register-form');
        const userTypeSelect = modal.querySelector('#register-user-type');
        const cadasturSection = modal.querySelector('#cadastur-section');
        const cadasturInput = modal.querySelector('#register-cadastur');

        userTypeSelect.addEventListener('change', () => {
            if (userTypeSelect.value === 'guia') {
                cadasturSection.style.display = 'block';
                cadasturInput.required = true;
            } else {
                cadasturSection.style.display = 'none';
                cadasturInput.required = false;
                cadasturInput.value = '';
                this.clearValidation();
            }
        });

        cadasturInput.addEventListener('input', () => {
            this.validateCadastur(cadasturInput.value);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(form, modal);
        });
    }

    async handleLogin(form, modal) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            this.showLoading(form);

            let response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result = {};
            try {
                result = await response.json();
            } catch {
                /* Ignora erro de JSON */
            }

            // Fallback para API de produção se a API local falhar
            if (!response.ok && this.apiUrl === this.localApi) {
                response = await fetch(`${this.productionApi}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                try {
                    result = await response.json();
                } catch {
                    result = {};
                }
                this.apiUrl = this.productionApi;
            }

            if (!response.ok) {
                const message = result.message || result.error || 'Erro ao processar requisição.';
                this.showError(message);
                return;
            }

            if (result.success) {
                this.showSuccess('Login realizado com sucesso!');
                if (result.access_token) {
                    this.authToken = result.access_token;
                    localStorage.setItem('authToken', this.authToken);
                }
                localStorage.setItem('userData', JSON.stringify(result.user));
                modal.remove();
                this.updateUIForLoggedUser(result.user);
            } else {
                const message = result.message || result.error || 'Erro ao processar requisição.';
                this.showError(message);
            }
        } catch (error) {
            this.handleFetchError(error);
        } finally {
            this.hideLoading(form);
        }
    }

    async handleRegister(form, modal) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (data.user_type === 'guia') {
            const isValid = await this.validateCadasturAPI(data.cadastur_number);
            if (!isValid) {
                return;
            }
        }

        try {
            this.showLoading(form);

            let response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result = {};
            try {
                result = await response.json();
            } catch {
                /* Ignora erro de JSON */
            }

            // Fallback para API de produção se a API local falhar
            if (!response.ok && this.apiUrl === this.localApi) {
                response = await fetch(`${this.productionApi}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                try {
                    result = await response.json();
                } catch {
                    result = {};
                }
                this.apiUrl = this.productionApi;
            }

            if (!response.ok) {
                const message = result.message || result.error || 'Erro ao processar requisição.';
                this.showError(message);
                return;
            }

            if (result.success) {
                this.showSuccess('Cadastro realizado com sucesso!');
                if (result.access_token) {
                    this.authToken = result.access_token;
                    localStorage.setItem('authToken', this.authToken);
                }
                localStorage.setItem('userData', JSON.stringify(result.user));
                modal.remove();
                this.updateUIForLoggedUser(result.user);
            } else {
                const message = result.message || result.error || 'Erro ao processar requisição.';
                this.showError(message);
            }
        } catch (error) {
            this.handleFetchError(error);
        } finally {
            this.hideLoading(form);
        }
    }

    validateCadastur(cadasturNumber) {
        const validationDiv = document.getElementById('cadastur-validation');
        if (!validationDiv) return;

        if (!cadasturNumber) {
            validationDiv.innerHTML = '';
            return;
        }

        const clean = cadasturNumber.replace(/\D/g, '');
        if (!clean) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ CADASTUR deve conter apenas números</span>';
            return false;
        }

        validationDiv.innerHTML = '<span class="trekko-validation-success">✅ Formato válido</span>';
        return true;
    }

    async validateCadasturAPI(cadasturNumber) {
        try {
            let response = await fetch(`${this.apiUrl}/validate-cadastur`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cadastur_number: cadasturNumber })
            });

            if (!response.ok && this.apiUrl === this.localApi) {
                response = await fetch(`${this.productionApi}/validate-cadastur`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cadastur_number: cadasturNumber })
                });
                this.apiUrl = this.productionApi;
            }

            const result = await response.json();
            const validationDiv = document.getElementById('cadastur-validation');

            if (result.valid) {
                validationDiv.innerHTML = '<span class="trekko-validation-success">✅ CADASTUR válido</span>';
                return true;
            } else {
                validationDiv.innerHTML = `<span class="trekko-validation-error">❌ ${result.message}</span>`;
                return false;
            }
        } catch (error) {
            const validationDiv = document.getElementById('cadastur-validation');
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Erro ao validar CADASTUR</span>';
            this.handleFetchError(error);
            return false;
        }
    }

    clearValidation() {
        const validationDiv = document.getElementById('cadastur-validation');
        if (validationDiv) {
            validationDiv.innerHTML = '';
        }
    }

    showLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Carregando...';
    }

    hideLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = form.id.includes('login') ? 'Entrar' : 'Cadastrar';
    }

    handleFetchError(error) {
        console.error('Erro na comunicação com a API:', error);
        const message = error instanceof TypeError
            ? 'Erro de conexão (possível CORS). Tente novamente.'
            : 'Erro de conexão. Tente novamente.';
        this.showError(message);
    }

    sanitizeError(message) {
        if (!message) return 'Erro ao processar requisição.';
        if (message.toLowerCase().includes('unable to open database file')) {
            return 'Erro de servidor: banco de dados indisponível. Tente novamente mais tarde.';
        }
        return message;
    }

    showError(message) {
        this.showNotification(this.sanitizeError(message), 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `trekko-notification trekko-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    updateUIForLoggedUser(user) {
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <div class="user-menu">
                    <span>Olá, ${user.full_name || user.name || user.email}</span>
                    <button onclick="trekkoAuth.logout()" class="trekko-btn-secondary">Sair</button>
                </div>
            `;
        }
    }

    logout() {
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        this.authToken = null;
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.trekkoAuth = new TrekkoAuth();
});

