/**
 * auth.js - Sistema de autenticação com persistência real para a Trekko.
 *
 * Responsabilidades:
 *  - Gerenciar autenticação via backend (/api/auth).
 *  - Controlar exibição dos botões de login/cadastro e menu do usuário.
 *  - Validar CADASTUR antes do cadastro de guias.
 *  - Disponibilizar estado de sessão para outras partes da aplicação.
 */
class TrekkoAuth {
    constructor() {
        this.apiBase = '/api';
        this.authApi = `${this.apiBase}/auth`;
        this.csrfToken = null;
        this.currentUser = null;
        this.roles = [];
        this.permissions = [];
        this.listeners = new Set();
        this.dropdownHandler = this.handleDocumentClick.bind(this);
        this.readyPromise = this.bootstrap();
    }

    async bootstrap() {
        this.injectStyles();
        this.setupEventListeners();
        await this.fetchSession().catch((error) => {
            console.error('Erro ao carregar sessão inicial:', error);
        });
        window.addEventListener('focus', () => {
            void this.fetchSession().catch(() => undefined);
        });
    }

    injectStyles() {
        if (!document.querySelector('link[href="new_auth.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'new_auth.css';
            document.head.appendChild(link);
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            if (target.closest('[data-auth="login"]') || target.id === 'loginBtn') {
                event.preventDefault();
                this.showLoginModal();
                return;
            }

            if (target.closest('[data-auth="register"]') || target.id === 'registerBtn') {
                event.preventDefault();
                this.showRegisterModal();
            }
        });
    }

    handleDocumentClick(event) {
        const dropdown = document.getElementById('userDropdown');
        const menu = document.getElementById('userMenu');
        if (!dropdown || !menu) return;

        const target = event.target instanceof Node ? event.target : null;
        if (target && menu.contains(target)) {
            return;
        }
        dropdown.classList.add('hidden');
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
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.matches('[data-close="true"]') || target === modal) {
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
                    <input type="email" id="login-email" name="email" required autocomplete="email">
                </div>
                <div class="trekko-form-group">
                    <label for="login-password">Senha</label>
                    <input type="password" id="login-password" name="password" required autocomplete="current-password">
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
                    <input type="text" id="register-name" name="name" required autocomplete="name">
                </div>
                <div class="trekko-form-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" name="email" required autocomplete="email">
                </div>
                <div class="trekko-form-group">
                    <label for="register-password">Senha</label>
                    <input type="password" id="register-password" name="password" required minlength="8" autocomplete="new-password">
                    <p class="trekko-helper-text">A senha deve conter pelo menos 8 caracteres.</p>
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
                    <input type="text" id="register-cadastur" name="cadastur_number" placeholder="Digite seu número CADASTUR" autocomplete="off">
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

    showLoginModal() {
        const modal = this.createModal('login', 'Entrar no Trekko', this.getLoginForm());
        document.body.appendChild(modal);
        const form = modal.querySelector('#trekko-login-form');
        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleLogin(form, modal);
        });
    }

    showRegisterModal() {
        const modal = this.createModal('register', 'Cadastrar no Trekko', this.getRegisterForm());
        document.body.appendChild(modal);
        const form = modal.querySelector('#trekko-register-form');
        const userTypeSelect = modal.querySelector('#register-user-type');
        const cadasturSection = modal.querySelector('#cadastur-section');
        const cadasturInput = modal.querySelector('#register-cadastur');
        const nameInput = modal.querySelector('#register-name');

        userTypeSelect?.addEventListener('change', () => {
            if (userTypeSelect.value === 'guia') {
                cadasturSection.style.display = 'block';
                if (cadasturInput) cadasturInput.required = true;
            } else {
                cadasturSection.style.display = 'none';
                if (cadasturInput) {
                    cadasturInput.required = false;
                    cadasturInput.value = '';
                }
                this.clearValidation();
            }
        });

        cadasturInput?.addEventListener('input', () => {
            const digits = cadasturInput.value.replace(/\D/g, '');
            cadasturInput.value = digits;
            if (userTypeSelect?.value === 'guia' && digits.length === 11) {
                void this.validateCadastur(nameInput?.value ?? '', digits);
            } else if (userTypeSelect?.value === 'guia') {
                this.showValidationMessage('Informe os 11 dígitos do CADASTUR para validar.', 'warning');
            } else {
                this.clearValidation();
            }
        });

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleRegister(form, modal);
        });
    }

    async ensureCsrfToken() {
        if (this.csrfToken) {
            return this.csrfToken;
        }
        try {
            const response = await fetch(`${this.authApi}/csrf`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`Falha ao obter token CSRF: ${response.status}`);
            }
            const payload = await response.json();
            if (payload?.csrfToken) {
                this.csrfToken = payload.csrfToken;
            }
        } catch (error) {
            console.error('Erro ao garantir token CSRF:', error);
        }
        return this.csrfToken;
    }

    async handleLogin(form, modal) {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData);

        await this.ensureCsrfToken();
        this.showLoading(form);

        try {
            const response = await fetch(`${this.authApi}/login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': this.csrfToken ?? '',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                const message = result?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.';
                this.showError(message);
                return;
            }

            if (result?.csrfToken) {
                this.csrfToken = result.csrfToken;
            }

            await this.fetchSession();
            this.showSuccess('Login realizado com sucesso!');
            modal.remove();
        } catch (error) {
            console.error('Erro ao realizar login:', error);
            this.showError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
        } finally {
            this.hideLoading(form, 'Entrar');
        }
    }

    async handleRegister(form, modal) {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData);

        if ((payload.user_type === 'guia' || payload.user_type === 'guide') && payload.cadastur_number) {
            const isValid = await this.validateCadastur(payload.name ?? '', payload.cadastur_number);
            if (!isValid) {
                return;
            }
        }

        await this.ensureCsrfToken();
        this.showLoading(form);

        try {
            const response = await fetch(`${this.authApi}/register`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': this.csrfToken ?? '',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                const message = result?.message || 'Não foi possível completar o cadastro. Verifique os dados informados.';
                this.showError(message);
                return;
            }

            if (result?.csrfToken) {
                this.csrfToken = result.csrfToken;
            }

            await this.fetchSession();
            this.showSuccess('Cadastro realizado com sucesso!');
            modal.remove();
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            this.showError('Erro de conexão. Tente novamente em instantes.');
        } finally {
            this.hideLoading(form, 'Cadastrar');
        }
    }

    async validateCadastur(rawName, rawNumber) {
        const name = (rawName ?? '').trim();
        const number = (rawNumber ?? '').replace(/\D/g, '');
        const validationDiv = document.getElementById('cadastur-validation');

        if (!validationDiv) {
            return false;
        }

        if (!name || number.length !== 11) {
            this.showValidationMessage('Informe seu nome completo e o número CADASTUR com 11 dígitos.', 'warning');
            return false;
        }

        await this.ensureCsrfToken();

        try {
            validationDiv.innerHTML = '<span class="trekko-validation-warning">⏳ Validando CADASTUR...</span>';
            const response = await fetch(`${this.authApi}/validate-cadastur`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': this.csrfToken ?? '',
                },
                body: JSON.stringify({
                    name,
                    cadastur_number: number,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok && result.valid) {
                this.showValidationMessage('✅ CADASTUR válido', 'success');
                return true;
            }

            const message = result?.message || 'Não foi possível validar o CADASTUR informado.';
            this.showValidationMessage(`❌ ${message}`, 'error');
            return false;
        } catch (error) {
            console.error('Erro ao validar CADASTUR:', error);
            this.showValidationMessage('❌ Erro ao validar CADASTUR. Tente novamente.', 'error');
            return false;
        }
    }

    showValidationMessage(message, type) {
        const validationDiv = document.getElementById('cadastur-validation');
        if (!validationDiv) return;

        const classMap = {
            success: 'trekko-validation-success',
            error: 'trekko-validation-error',
            warning: 'trekko-validation-warning',
        };

        validationDiv.className = `trekko-validation-message ${classMap[type] ?? ''}`;
        validationDiv.textContent = message;
    }

    clearValidation() {
        const validationDiv = document.getElementById('cadastur-validation');
        if (validationDiv) {
            validationDiv.className = 'trekko-validation-message';
            validationDiv.textContent = '';
        }
    }

    showLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent ?? '';
        submitBtn.textContent = 'Carregando...';
    }

    hideLoading(form, fallbackText) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || fallbackText;
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `trekko-notification trekko-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    bindUserMenu() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (!userMenuBtn || !userDropdown) {
            document.removeEventListener('click', this.dropdownHandler);
            return;
        }

        if (!userMenuBtn.dataset.bound) {
            userMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                userDropdown.classList.toggle('hidden');
            });
            userMenuBtn.dataset.bound = 'true';
        }

        document.removeEventListener('click', this.dropdownHandler);
        document.addEventListener('click', this.dropdownHandler);
    }

    updateNavigation() {
        const authButtonsContainer = document.getElementById('authButtons');
        const authSection = document.getElementById('authSection');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            if (authButtonsContainer) authButtonsContainer.classList.add('hidden');
            if (authSection) authSection.classList.add('hidden');
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userName) {
                userName.textContent = this.currentUser.name || this.currentUser.email;
            }
            this.bindUserMenu();
        } else {
            if (authButtonsContainer) authButtonsContainer.classList.remove('hidden');
            if (authSection) authSection.classList.remove('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
            document.removeEventListener('click', this.dropdownHandler);
        }
    }

    normalizeUser(rawUser) {
        const normalizedRole = (rawUser.role ?? '').toString().trim().toUpperCase();
        const userType = normalizedRole === 'GUIA' ? 'guia' : 'trekker';
        return {
            id: rawUser.id,
            email: rawUser.email,
            name: rawUser.name ?? rawUser.email,
            role: rawUser.role,
            user_type: userType,
            created_at: rawUser.createdAt,
            updated_at: rawUser.updatedAt,
        };
    }

    async fetchSession() {
        try {
            const response = await fetch(`${this.authApi}/me`, {
                method: 'GET',
                credentials: 'include',
            });

            const payload = await response.json().catch(() => ({}));

            if (payload?.csrfToken) {
                this.csrfToken = payload.csrfToken;
            }

            if (payload?.authenticated && payload.user) {
                this.currentUser = this.normalizeUser(payload.user);
                this.roles = Array.isArray(payload.roles) ? payload.roles : [];
                this.permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
            } else {
                this.currentUser = null;
                this.roles = [];
                this.permissions = [];
                localStorage.removeItem('userData');
            }

            this.updateNavigation();
            this.notifyListeners();
            return payload;
        } catch (error) {
            console.error('Erro ao obter sessão do usuário:', error);
            return null;
        }
    }

    async logout() {
        await this.ensureCsrfToken();
        try {
            await fetch(`${this.authApi}/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'x-csrf-token': this.csrfToken ?? '',
                },
            });
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
        } finally {
            this.csrfToken = null;
            await this.fetchSession();
            this.showSuccess('Sessão encerrada com sucesso.');
        }
    }

    getSession() {
        return {
            authenticated: Boolean(this.currentUser),
            user: this.currentUser,
            roles: [...this.roles],
            permissions: [...this.permissions],
            csrfToken: this.csrfToken,
        };
    }

    getCsrfToken() {
        return this.csrfToken;
    }

    onAuthStateChanged(callback) {
        if (typeof callback !== 'function') return () => undefined;
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        const snapshot = this.getSession();
        for (const listener of this.listeners) {
            try {
                listener(snapshot);
            } catch (error) {
                console.error('Erro ao notificar listener de autenticação:', error);
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.trekkoAuth = new TrekkoAuth();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrekkoAuth;
}
