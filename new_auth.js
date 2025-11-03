// New Authentication System with CADASTUR Support
class TrekkoAuth {
    constructor() {
        this.apiUrl = 'https://5000-ibpp8roptl9en8w6ne0am-95675309.manusvm.computer/api/auth';
        this.init();
    }

    init() {
        // Initialize authentication system
        this.setupEventListeners();
        console.log('TrekkoAuth initialized');
    }

    setupEventListeners() {
        // Setup event listeners for auth buttons
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

        // Close modal handlers
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
                    <input type="text" id="register-name" name="name" required>
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

        // Handle user type change
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

        // Handle CADASTUR validation
        cadasturInput.addEventListener('input', () => {
            this.validateCadastur(cadasturInput.value);
        });

        // Handle form submission
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
            
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Login realizado com sucesso!');
                localStorage.setItem('userData', JSON.stringify(result.user));
                modal.remove();
                this.updateUIForLoggedUser(result.user);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.hideLoading(form);
        }
    }

    async handleRegister(form, modal) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validate CADASTUR for guides
        data.name = data.name ? data.name.trim() : '';
        if (data.cadastur_number) {
            data.cadastur_number = data.cadastur_number.trim();
        }

        if (data.user_type === 'guia') {
            const isValid = await this.validateCadasturAPI(data.cadastur_number, data.name);
            if (!isValid) {
                return; // Validation message already shown
            }
        }

        try {
            this.showLoading(form);
            
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Cadastro realizado com sucesso!');
                localStorage.setItem('userData', JSON.stringify(result.user));
                modal.remove();
                this.updateUIForLoggedUser(result.user);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError('Erro de conexão. Tente novamente.');
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

        const cleanCadastur = cadasturNumber.replace(/\D/g, '');
        
        if (cleanCadastur.length < 11) {
            validationDiv.innerHTML = '<span class="trekko-validation-warning">⚠️ CADASTUR deve ter 11 dígitos</span>';
            return false;
        } else if (cleanCadastur.length > 11) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ CADASTUR não pode ter mais de 11 dígitos</span>';
            return false;
        } else {
            validationDiv.innerHTML = '<span class="trekko-validation-success">✅ Formato válido</span>';
            return true;
        }
    }

    async validateCadasturAPI(cadasturNumber, rawName) {
        const validationDiv = document.getElementById('cadastur-validation');

        if (!validationDiv) {
            return false;
        }

        const name = (rawName ?? '').trim();
        const cadasturValue = cadasturNumber ?? '';
        const cleanedCadastur = cadasturValue.replace(/\D/g, '');

        if (!name) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Informe seu nome completo para validar o CADASTUR</span>';
            return false;
        }

        const isFormatValid = this.validateCadastur(cadasturValue);
        if (isFormatValid === false) {
            return false;
        }

        if (!cleanedCadastur) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Informe seu número CADASTUR</span>';
            return false;
        }

        try {
            validationDiv.innerHTML = '<span class="trekko-validation-warning">⏳ Validando CADASTUR...</span>';

            const response = await fetch(`${this.apiUrl}/validate-cadastur`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    cadastur_number: cleanedCadastur,
                })
            });

            const result = await response.json();

            if (result.valid) {
                validationDiv.innerHTML = '<span class="trekko-validation-success">✅ CADASTUR válido</span>';
                return true;
            } else {
                const message = result.message || 'Não foi possível validar o CADASTUR informado.';
                validationDiv.innerHTML = `<span class="trekko-validation-error">❌ ${message}</span>`;
                return false;
            }
        } catch (error) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Erro ao validar CADASTUR</span>';
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
        submitBtn.textContent = submitBtn.id.includes('login') ? 'Entrar' : 'Cadastrar';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
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

    updateUIForLoggedUser(user) {
        // Update navigation for logged user
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <div class="user-menu">
                    <button id="userMenuBtn" class="user-menu-btn">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.full_name || user.name}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div id="userDropdown" class="user-dropdown hidden">
                        <a href="perfil.html" class="dropdown-item">
                            <i class="fas fa-user"></i>
                            Meu Perfil
                        </a>
                        <a href="perfil.html#favoritos" class="dropdown-item">
                            <i class="fas fa-heart"></i>
                            Favoritos
                        </a>
                        <hr class="dropdown-divider">
                        <button onclick="trekkoAuth.logout()" class="dropdown-item logout-btn">
                            <i class="fas fa-sign-out-alt"></i>
                            Sair
                        </button>
                    </div>
                </div>
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <i class="fas fa-bars"></i>
                </button>
            `;

            const userMenuBtn = navActions.querySelector('#userMenuBtn');
            const userDropdown = navActions.querySelector('#userDropdown');
            if (userMenuBtn && userDropdown) {
                userMenuBtn.addEventListener('click', () => {
                    userDropdown.classList.toggle('hidden');
                });

                document.addEventListener('click', (e) => {
                    if (!navActions.contains(e.target)) {
                        userDropdown.classList.add('hidden');
                    }
                });
            }
        }
    }

    logout() {
        localStorage.removeItem('userData');
        location.reload();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trekkoAuth = new TrekkoAuth();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrekkoAuth;
}

