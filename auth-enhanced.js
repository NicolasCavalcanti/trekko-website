// Enhanced Authentication System for Trekko
// Sistema de autenticação aprimorado com validação CADASTUR obrigatória

class TrekkoAuthManager {
    constructor() {
        this.apiUrl = 'https://g8h3ilcvjnlq.manus.space/api';
        // Base local de guias não é mais utilizada
        this.currentUser = null;
        this.authToken = null;
        
        this.init();
    }

    // Base de dados de guias válidos com CADASTUR
    loadGuidesDatabase() {
        return [
            {
                name: "Carlos Silva Santos",
                cadastur: "27123456789",
                estado: "RJ",
                especialidades: ["Montanha", "Trilhas"],
                ativo: true
            },
            {
                name: "Maria Fernanda Oliveira",
                cadastur: "27987654321",
                estado: "MG",
                especialidades: ["Cachoeiras", "Ecoturismo"],
                ativo: true
            },
            {
                name: "João Pedro Montanha",
                cadastur: "27456789123",
                estado: "SP",
                especialidades: ["Trekking", "Aventura"],
                ativo: true
            },
            {
                name: "Ana Carolina Rocha",
                cadastur: "27789123456",
                estado: "ES",
                especialidades: ["Trilhas", "Natureza"],
                ativo: true
            },
            {
                name: "Roberto Carlos Lima",
                cadastur: "27321654987",
                estado: "BA",
                especialidades: ["Montanha", "Expedições"],
                ativo: true
            },
            {
                name: "Fernanda Santos Costa",
                cadastur: "27654987321",
                estado: "PR",
                especialidades: ["Ecoturismo", "Aventura"],
                ativo: true
            },
            {
                name: "Lucas Henrique Alves",
                cadastur: "27147258369",
                estado: "SC",
                especialidades: ["Trilhas", "Montanha"],
                ativo: true
            },
            {
                name: "Juliana Pereira Souza",
                cadastur: "27963852741",
                estado: "GO",
                especialidades: ["Natureza", "Trekking"],
                ativo: true
            },
            {
                name: "Rafael Augusto Ferreira",
                cadastur: "27852741963",
                estado: "RO",
                especialidades: ["Expedições", "Aventura"],
                ativo: true
            },
            {
                name: "Camila Rodrigues Martins",
                cadastur: "27741852963",
                estado: "AM",
                especialidades: ["Floresta", "Ecoturismo"],
                ativo: true
            },
            {
                name: "Julieli Ferrari dos Santos",
                cadastur: "21467985879",
                estado: "RS",
                especialidades: [
                    "Ecoturismo",
                    "Turismo Cultural",
                    "Turismo de Negócios e Eventos"
                ],
                ativo: true
            }
        ];
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.loadStoredAuth();
    }

    // Verificar status de autenticação
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('userData');
        
        if (token && user) {
            try {
                this.currentUser = JSON.parse(user);
                this.authToken = token;
                this.showUserMenu(this.currentUser);
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
                this.clearAuth();
            }
        } else {
            this.showLoginButtons();
        }
    }

    // Carregar autenticação armazenada
    loadStoredAuth() {
        const userData = localStorage.getItem('userData');
        const authToken = localStorage.getItem('authToken');
        
        if (userData && authToken) {
            try {
                this.currentUser = JSON.parse(userData);
                this.authToken = authToken;
            } catch (error) {
                console.error('Erro ao carregar autenticação:', error);
                this.clearAuth();
            }
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        console.log('Configurando event listeners de autenticação...');
        
        // Aguardar carregamento dos elementos
        setTimeout(() => {
            this.bindAuthButtons();
        }, 100);
    }

    bindAuthButtons() {
        // Botões de login/cadastro
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userMenuBtn = document.getElementById('userMenuBtn');

        console.log('Elementos de autenticação:', {
            loginBtn: !!loginBtn,
            registerBtn: !!registerBtn,
            logoutBtn: !!logoutBtn,
            userMenuBtn: !!userMenuBtn
        });

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('Abrindo modal de login...');
                this.openLoginModal();
            });
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                console.log('Abrindo modal de cadastro...');
                this.openRegisterModal();
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => this.toggleUserDropdown());
        }

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userMenu')) {
                const dropdown = document.getElementById('userDropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }
        });
    }

    // Mostrar menu do usuário
    showUserMenu(user) {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.classList.remove('hidden');
        if (userName) userName.textContent = user.name || user.email;
    }

    // Mostrar botões de login
    showLoginButtons() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');

        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.classList.add('hidden');
    }

    // Toggle dropdown do usuário
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    }

    // Abrir modal de login
    openLoginModal() {
        const existingModal = document.getElementById('loginModal');
        if (existingModal) {
            existingModal.remove();
        }
        this.createLoginModal();
    }

    // Abrir modal de cadastro
    openRegisterModal() {
        const existingModal = document.getElementById('registerModal');
        if (existingModal) {
            existingModal.remove();
        }
        this.createRegisterModal();
    }

    // Criar modal de login
    createLoginModal() {
        const modalHTML = `
            <div id="loginModal" class="auth-modal">
                <div class="auth-modal-overlay"></div>
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <h2>Entrar na Trekko</h2>
                        <button id="closeLoginModal" class="auth-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="loginEmail">
                                <i class="fas fa-envelope"></i>
                                Email
                            </label>
                            <input type="email" id="loginEmail" required 
                                   placeholder="seu@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="loginPassword">
                                <i class="fas fa-lock"></i>
                                Senha
                            </label>
                            <input type="password" id="loginPassword" required 
                                   placeholder="Sua senha">
                        </div>
                        
                        <div id="loginError" class="error-message hidden"></div>
                        
                        <button type="submit" id="loginSubmitBtn" class="btn btn-primary btn-full">
                            <i class="fas fa-sign-in-alt"></i>
                            Entrar
                        </button>
                    </form>
                    
                    <div class="auth-modal-footer">
                        <p>Não tem uma conta? 
                            <button id="switchToRegister" class="link-button">Cadastre-se</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupLoginModalEvents();
        this.addModalStyles();
    }

    // Criar modal de cadastro com validação CADASTUR aprimorada
    createRegisterModal() {
        const modalHTML = `
            <div id="registerModal" class="auth-modal">
                <div class="auth-modal-overlay"></div>
                <div class="auth-modal-content register-modal">
                    <div class="auth-modal-header">
                        <h2>Cadastrar na Trekko</h2>
                        <button id="closeRegisterModal" class="auth-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="registerForm" class="auth-form">
                        <div class="form-group">
                            <label for="registerName">
                                <i class="fas fa-user"></i>
                                Nome Completo *
                            </label>
                            <input type="text" id="registerName" required 
                                   placeholder="Digite seu nome completo">
                            <div id="nameValidation" class="validation-message"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="registerEmail">
                                <i class="fas fa-envelope"></i>
                                Email *
                            </label>
                            <input type="email" id="registerEmail" required 
                                   placeholder="seu@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="registerPassword">
                                <i class="fas fa-lock"></i>
                                Senha *
                            </label>
                            <input type="password" id="registerPassword" required 
                                   placeholder="Mínimo 8 caracteres">
                            <div class="password-requirements">
                                <small>Mínimo 8 caracteres, incluindo maiúscula, minúscula e número</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="userType">
                                <i class="fas fa-user-tag"></i>
                                Tipo de Usuário *
                            </label>
                            <select id="userType" required>
                                <option value="">Selecione o tipo de usuário...</option>
                                <option value="trekker">🥾 Trekker (Usuário comum)</option>
                                <option value="guia">🧭 Guia Profissional</option>
                            </select>
                        </div>
                        
                        <div id="cadasturSection" class="form-group hidden">
                            <label for="cadasturNumber" class="required-label">
                                <i class="fas fa-certificate"></i>
                                Número CADASTUR *
                            </label>
                            <input type="text" id="cadasturNumber"
                                   placeholder="Ex: 27123456789"
                                   maxlength="11">
                            <div class="cadastur-info">
                                <small>
                                    <i class="fas fa-info-circle"></i>
                                    CADASTUR é o registro obrigatório para guias de turismo no Brasil. 
                                    <a href="https://cadastur.turismo.gov.br/" target="_blank">Saiba mais</a>
                                </small>
                            </div>
                            <div id="cadasturValidation" class="validation-message"></div>
                        </div>
                        
                        <div id="validationSummary" class="validation-summary hidden">
                            <div class="validation-header">
                                <i class="fas fa-check-circle"></i>
                                <h4>Validação de Guia Profissional</h4>
                            </div>
                            <div id="validationDetails" class="validation-details"></div>
                        </div>
                        
                        <div id="registerError" class="error-message hidden"></div>
                        <div id="registerSuccess" class="success-message hidden"></div>
                        
                        <button type="submit" id="registerSubmitBtn" class="btn btn-primary btn-full">
                            <i class="fas fa-user-plus"></i>
                            Cadastrar
                        </button>
                    </form>
                    
                    <div class="auth-modal-footer">
                        <p>Já tem uma conta? 
                            <button id="switchToLogin" class="link-button">Faça login</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupRegisterModalEvents();
        this.addModalStyles();
    }

    // Configurar eventos do modal de login
    setupLoginModalEvents() {
        const modal = document.getElementById('loginModal');
        const closeBtn = document.getElementById('closeLoginModal');
        const form = document.getElementById('loginForm');
        const switchBtn = document.getElementById('switchToRegister');

        closeBtn.addEventListener('click', () => modal.remove());
        switchBtn.addEventListener('click', () => {
            modal.remove();
            this.openRegisterModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Fechar modal ao clicar no overlay
        modal.querySelector('.auth-modal-overlay').addEventListener('click', () => modal.remove());
    }

    // Configurar eventos do modal de cadastro
    setupRegisterModalEvents() {
        const modal = document.getElementById('registerModal');
        const closeBtn = document.getElementById('closeRegisterModal');
        const form = document.getElementById('registerForm');
        const switchBtn = document.getElementById('switchToLogin');
        const userTypeSelect = document.getElementById('userType');
        const nameInput = document.getElementById('registerName');
        const cadasturInput = document.getElementById('cadasturNumber');

        closeBtn.addEventListener('click', () => modal.remove());
        switchBtn.addEventListener('click', () => {
            modal.remove();
            this.openLoginModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Mostrar/ocultar seção CADASTUR baseado no tipo de usuário
        userTypeSelect.addEventListener('change', (e) => {
            this.toggleCadasturSection(e.target.value);
        });

        // Validação em tempo real do nome
        nameInput.addEventListener('input', () => {
            this.validateName();
        });

        // Validação em tempo real do CADASTUR
        if (cadasturInput) {
            cadasturInput.addEventListener('input', () => {
                this.formatCadastur(cadasturInput);
                this.validateCadastur();
            });
        }

        // Fechar modal ao clicar no overlay
        modal.querySelector('.auth-modal-overlay').addEventListener('click', () => modal.remove());
    }

    // Mostrar/ocultar seção CADASTUR
    toggleCadasturSection(userType) {
        const cadasturSection = document.getElementById('cadasturSection');
        const cadasturInput = document.getElementById('cadasturNumber');
        
        if (userType === 'guia') {
            cadasturSection.classList.remove('hidden');
            cadasturInput.required = true;
        } else {
            cadasturSection.classList.add('hidden');
            cadasturInput.required = false;
            cadasturInput.value = '';
            this.clearValidation();
        }
    }

    // Validar nome em tempo real
    validateName() {
        const nameInput = document.getElementById('registerName');
        const nameValidation = document.getElementById('nameValidation');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            this.showValidationMessage(nameValidation, 'Nome deve ter pelo menos 2 caracteres', 'error');
            nameInput.classList.add('error');
            return false;
        }
        
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
            this.showValidationMessage(nameValidation, 'Nome deve conter apenas letras e espaços', 'error');
            nameInput.classList.add('error');
            return false;
        }
        
        this.showValidationMessage(nameValidation, 'Nome válido', 'success');
        nameInput.classList.remove('error');
        nameInput.classList.add('success');
        return true;
    }

    // Validar CADASTUR em tempo real
    async validateCadastur() {
        const cadasturInput = document.getElementById('cadasturNumber');
        const cadasturValidation = document.getElementById('cadasturValidation');
        const validationSummary = document.getElementById('validationSummary');

        const cadastur = cadasturInput.value.trim();

        if (!cadastur) {
            this.showValidationMessage(cadasturValidation, 'CADASTUR é obrigatório para guias', 'error');
            cadasturInput.classList.add('error');
            validationSummary.classList.add('hidden');
            return false;
        }

        if (cadastur.length !== 11) {
            this.showValidationMessage(cadasturValidation, 'CADASTUR deve ter exatamente 11 dígitos', 'error');
            cadasturInput.classList.add('error');
            validationSummary.classList.add('hidden');
            return false;
        }

        try {
            const resp = await fetch(`${this.apiUrl}/auth/validate-cadastur`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cadastur_number: cadastur })
            });
            const result = await resp.json();

            if (!result.valid) {
                this.showValidationMessage(cadasturValidation, result.message || 'CADASTUR inválido', 'error');
                cadasturInput.classList.add('error');
                validationSummary.classList.add('hidden');
                return false;
            }

            this.showValidationMessage(cadasturValidation, 'CADASTUR válido e verificado', 'success');
            cadasturInput.classList.remove('error');
            cadasturInput.classList.add('success');
            validationSummary.classList.add('hidden');
            return true;
        } catch (err) {
            console.error('Erro ao validar CADASTUR:', err);
            this.showValidationMessage(cadasturValidation, 'Erro ao validar CADASTUR', 'error');
            cadasturInput.classList.add('error');
            validationSummary.classList.add('hidden');
            return false;
        }
    }

    // (Descontinuado) Função de busca local de guias
    // A validação agora é feita diretamente com o backend oficial

    // Normalizar string para comparação
    normalizeString(str) {
        return str.toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .trim();
    }

    // Mostrar mensagem de validação
    showValidationMessage(element, message, type) {
        if (!element) return;
        
        element.innerHTML = `
            <div class="validation-item ${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
    }

    // Limpar validações
    clearValidation() {
        const nameValidation = document.getElementById('nameValidation');
        const cadasturValidation = document.getElementById('cadasturValidation');
        const validationSummary = document.getElementById('validationSummary');
        const nameInput = document.getElementById('registerName');
        const cadasturInput = document.getElementById('cadasturNumber');

        if (nameValidation) nameValidation.innerHTML = '';
        if (cadasturValidation) cadasturValidation.innerHTML = '';
        if (validationSummary) validationSummary.classList.add('hidden');
        
        // Remover classes de validação
        [nameInput, cadasturInput].forEach(input => {
            if (input) {
                input.classList.remove('error', 'success');
            }
        });
    }

    // Formatar CADASTUR (apenas números)
    formatCadastur(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        input.value = value;
    }

    // Processar login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = document.getElementById('loginSubmitBtn');
        const errorDiv = document.getElementById('loginError');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        this.hideMessage(errorDiv);

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Salvar dados do usuário
                this.currentUser = data.user;
                this.authToken = data.access_token || 'mock-token';
                
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('userData', JSON.stringify(this.currentUser));

                // Fechar modal e atualizar interface
                document.getElementById('loginModal').remove();
                this.showUserMenu(this.currentUser);
                
                // Mostrar notificação de sucesso
                this.showNotification('Login realizado com sucesso!', 'success');
                
                // Redirecionar para perfil se necessário
                if (window.location.pathname.includes('perfil.html')) {
                    window.location.reload();
                }
            } else {
                this.showMessage(errorDiv, data.message || 'Erro ao fazer login', 'error');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showMessage(errorDiv, 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    // Processar cadastro com validação CADASTUR obrigatória
    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const userType = document.getElementById('userType').value;
        const cadastur = document.getElementById('cadasturNumber').value.trim();
        const submitBtn = document.getElementById('registerSubmitBtn');
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');

        // Validações básicas
        if (!name || !email || !password || !userType) {
            this.showMessage(errorDiv, 'Todos os campos obrigatórios devem ser preenchidos.', 'error');
            return;
        }

        // Validação específica para guias
        if (userType === 'guia') {
            if (!cadastur) {
                this.showMessage(errorDiv, 'CADASTUR é obrigatório para guias profissionais.', 'error');
                return;
            }

            try {
                const resp = await fetch(`${this.apiUrl}/auth/validate-cadastur`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cadastur_number: cadastur })
                });
                const result = await resp.json();
                if (!result.valid) {
                    this.showMessage(errorDiv, result.message || 'CADASTUR inválido', 'error');
                    return;
                }
            } catch (err) {
                console.error('Erro ao validar CADASTUR:', err);
                this.showMessage(errorDiv, 'Erro ao validar CADASTUR. Tente novamente.', 'error');
                return;
            }
        }

        // Validação de senha
        if (!this.validatePassword(password)) {
            this.showMessage(errorDiv, 'A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        this.hideMessage(errorDiv);
        this.hideMessage(successDiv);

        try {
            const userData = {
                name,
                email,
                password,
                user_type: userType
            };

            // Adicionar CADASTUR se for guia
            if (userType === 'guia') {
                userData.cadastur_number = cadastur;
            }

            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showMessage(successDiv, 'Cadastro realizado com sucesso! Você pode fazer login agora.', 'success');
                
                // Limpar formulário
                document.getElementById('registerForm').reset();
                this.clearValidation();
                
                // Fechar modal após 2 segundos e abrir login
                setTimeout(() => {
                    document.getElementById('registerModal').remove();
                    this.openLoginModal();
                }, 2000);
                
            } else {
                this.showMessage(errorDiv, data.message || 'Erro ao realizar cadastro', 'error');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            this.showMessage(errorDiv, 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar';
        }
    }

    // Validar senha
    validatePassword(password) {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        return minLength && hasUpper && hasLower && hasNumber;
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.authToken = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        this.showLoginButtons();
        this.showNotification('Logout realizado com sucesso!', 'success');
        
        // Redirecionar para home se estiver em página protegida
        if (window.location.pathname.includes('perfil.html') || 
            window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    // Limpar autenticação
    clearAuth() {
        this.currentUser = null;
        this.authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.showLoginButtons();
    }

    // Mostrar mensagem
    showMessage(element, message, type) {
        if (element) {
            element.innerHTML = `
                <div class="message-content">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            element.classList.remove('hidden');
        }
    }

    // Ocultar mensagem
    hideMessage(element) {
        if (element) {
            element.classList.add('hidden');
        }
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `trekko-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Adicionar estilos inline
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Funcionalidade de fechar
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
        `;
        
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Adicionar à página
        document.body.appendChild(notification);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Adicionar estilos dos modais
    addModalStyles() {
        if (document.getElementById('trekkoAuthStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'trekkoAuthStyles';
        styles.textContent = `
            .auth-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
            }
            
            .auth-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }
            
            .auth-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                width: 100%;
                max-width: 450px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .register-modal {
                max-width: 500px;
            }
            
            .auth-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1.5rem 1.5rem 1rem;
                border-bottom: 1px solid #e9ecef;
            }
            
            .auth-modal-header h2 {
                margin: 0;
                color: #2D6A4F;
                font-size: 1.5rem;
                font-weight: 700;
            }
            
            .auth-modal-close {
                background: none;
                border: none;
                font-size: 1.25rem;
                color: #666;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .auth-modal-close:hover {
                background: #f8f9fa;
                color: #333;
            }
            
            .auth-form {
                padding: 1.5rem;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 0.5rem;
                font-size: 0.875rem;
            }
            
            .required-label {
                color: #dc3545;
            }
            
            .form-group input,
            .form-group select {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.2s ease;
                background: white;
            }
            
            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: #2D6A4F;
            }
            
            .form-group input.error {
                border-color: #dc3545;
            }
            
            .form-group input.success {
                border-color: #28a745;
            }
            
            .password-requirements {
                margin-top: 0.5rem;
            }
            
            .password-requirements small {
                color: #666;
                font-size: 0.75rem;
            }
            
            .cadastur-info {
                margin-top: 0.5rem;
            }
            
            .cadastur-info small {
                color: #666;
                font-size: 0.75rem;
                display: flex;
                align-items: flex-start;
                gap: 0.25rem;
            }
            
            .cadastur-info a {
                color: #2D6A4F;
                text-decoration: none;
            }
            
            .cadastur-info a:hover {
                text-decoration: underline;
            }
            
            .validation-message {
                margin-top: 0.5rem;
            }
            
            .validation-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border-radius: 6px;
                font-size: 0.875rem;
            }
            
            .validation-item.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .validation-item.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .validation-summary {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            }
            
            .validation-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
                color: #155724;
            }
            
            .validation-header h4 {
                margin: 0;
                font-size: 1rem;
            }
            
            .validation-details {
                color: #155724;
            }
            
            .guide-info p {
                margin: 0.25rem 0;
                font-size: 0.875rem;
            }
            
            .error-message,
            .success-message {
                padding: 0.75rem;
                border-radius: 6px;
                margin-bottom: 1rem;
            }
            
            .error-message {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .success-message {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .message-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .btn-full {
                width: 100%;
                padding: 0.875rem;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .auth-modal-footer {
                padding: 1rem 1.5rem 1.5rem;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            
            .auth-modal-footer p {
                margin: 0;
                color: #666;
                font-size: 0.875rem;
            }
            
            .link-button {
                background: none;
                border: none;
                color: #2D6A4F;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
            }
            
            .link-button:hover {
                text-decoration: underline;
            }
            
            .hidden {
                display: none !important;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            @media (max-width: 480px) {
                .auth-modal-content {
                    margin: 0.5rem;
                    max-width: none;
                }
                
                .auth-modal-header,
                .auth-form,
                .auth-modal-footer {
                    padding-left: 1rem;
                    padding-right: 1rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Verificar se usuário está logado
    isLoggedIn() {
        return !!this.authToken && !!this.currentUser;
    }

    // Obter dados do usuário
    getUserData() {
        return this.currentUser;
    }

    // Obter token de autenticação
    getAuthToken() {
        return this.authToken;
    }
}

// Inicializar o sistema de autenticação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new TrekkoAuthManager();
});

// Exportar para uso global
window.TrekkoAuthManager = TrekkoAuthManager;

