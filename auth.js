// auth.js - Sistema de autenticacao global
class AuthManager {
    constructor() {
        this.apiUrl = 'https://g8h3ilcvjnlq.manus.space/api';
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
    }

    // Verificar status de autenticacao
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('userData');
        
        if (token && user) {
            this.showUserMenu(JSON.parse(user));
        } else {
            this.showLoginButtons();
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Aguardar um pouco para garantir que os elementos estejam carregados
        setTimeout(() => {
            // Botoes de login/cadastro
            const loginBtn = document.getElementById('loginBtn');
            const registerBtn = document.getElementById('registerBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            const userMenuBtn = document.getElementById('userMenuBtn');

            console.log('Elementos encontrados:', {
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
            
            if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
            if (userMenuBtn) userMenuBtn.addEventListener('click', () => this.toggleUserDropdown());

            // Fechar dropdown ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#userMenu')) {
                    const dropdown = document.getElementById('userDropdown');
                    if (dropdown) dropdown.classList.add('hidden');
                }
            });
        }, 100);
    }

    // Mostrar menu do usuario
    showUserMenu(user) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.classList.remove('hidden');
        if (userName) userName.textContent = user.name || user.email;
    }

    // Mostrar botoes de login
    showLoginButtons() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');

        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (userMenu) userMenu.classList.add('hidden');
    }

    // Toggle dropdown do usuario
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    }

    // Abrir modal de login
    openLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            this.createLoginModal();
        }
    }

    // Abrir modal de cadastro
    openRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            this.createRegisterModal();
        }
    }

    // Criar modal de login
    createLoginModal() {
        const modalHTML = `
            <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Entrar</h2>
                        <button id="closeLoginModal" class="text-gray-400 hover:text-gray-600">
                            <span class="text-2xl">&times;</span>
                        </button>
                    </div>
                    
                    <form id="loginForm">
                        <div class="mb-4">
                            <label for="loginEmail" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" id="loginEmail" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        
                        <div class="mb-6">
                            <label for="loginPassword" class="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                            <input type="password" id="loginPassword" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        
                        <div id="loginError" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
                        
                        <button type="submit" id="loginSubmitBtn" 
                                class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium">
                            Entrar
                        </button>
                    </form>
                    
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-600">
                            Nao tem uma conta? 
                            <button id="switchToRegister" class="text-green-600 hover:text-green-700 font-medium">Cadastre-se</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupLoginModalEvents();
    }

    // Criar modal de cadastro
    createRegisterModal() {
        const modalHTML = `
            <div id="registerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Cadastrar</h2>
                        <button id="closeRegisterModal" class="text-gray-400 hover:text-gray-600">
                            <span class="text-2xl">&times;</span>
                        </button>
                    </div>
                    
                    <form id="registerForm">
                        <div class="mb-4">
                            <label for="registerName" class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                            <input type="text" id="registerName" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        
                        <div class="mb-4">
                            <label for="registerEmail" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" id="registerEmail" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        
                        <div class="mb-4">
                            <label for="registerPassword" class="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                            <input type="password" id="registerPassword" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <p class="text-xs text-gray-500 mt-1">Minimo 8 caracteres, incluindo maiuscula, minuscula e numero</p>
                        </div>
                        
                        <div class="mb-4">
                            <label for="userType" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuario</label>
                            <select id="userType" required 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900">
                                <option value="">Selecione o tipo de usuario...</option>
                                <option value="trekker">Trekker (Usuario comum)</option>
                                <option value="guia">Guia Profissional</option>
                            </select>
                        </div>
                        
                        <div id="cadasturSection" class="hidden mb-4">
                            <label for="cadasturNumber" class="block text-sm font-medium text-gray-700 mb-2">Numero CADASTUR</label>
                            <input type="text" id="cadasturNumber" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <div id="cadasturValidation" class="mt-2 text-sm"></div>
                        </div>
                        
                        <div id="registerError" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
                        <div id="registerSuccess" class="hidden mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded"></div>
                        
                        <button type="submit" id="registerSubmitBtn" 
                                class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium">
                            Cadastrar
                        </button>
                    </form>
                    
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-600">
                            Ja tem uma conta? 
                            <button id="switchToLogin" class="text-green-600 hover:text-green-700 font-medium">Faca login</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupRegisterModalEvents();
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

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Configurar eventos do modal de cadastro
    setupRegisterModalEvents() {
        const modal = document.getElementById('registerModal');
        const closeBtn = document.getElementById('closeRegisterModal');
        const form = document.getElementById('registerForm');
        const switchBtn = document.getElementById('switchToLogin');
        const userTypeSelect = document.getElementById('userType');

        closeBtn.addEventListener('click', () => modal.remove());
        switchBtn.addEventListener('click', () => {
            modal.remove();
            this.openLoginModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Mostrar/ocultar secao CADASTUR
        userTypeSelect.addEventListener('change', () => {
            const cadasturSection = document.getElementById('cadasturSection');
            if (userTypeSelect.value === 'guia') {
                cadasturSection.classList.remove('hidden');
            } else {
                cadasturSection.classList.add('hidden');
            }
        });

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Processar login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = document.getElementById('loginSubmitBtn');
        const errorDiv = document.getElementById('loginError');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        this.hideError(errorDiv);

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Salvar dados do usuario
                localStorage.setItem('authToken', data.access_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Atualizar UI
                this.showUserMenu(data.user);
                document.getElementById('loginModal').remove();
            } else {
                this.showError(errorDiv, data.message || 'Erro ao fazer login');
            }
        } catch (error) {
            this.showError(errorDiv, 'Erro de conexao. Tente novamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    }

    // Processar cadastro
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const userType = document.getElementById('userType').value;
        const cadastur = document.getElementById('cadasturNumber').value;
        
        const submitBtn = document.getElementById('registerSubmitBtn');
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');

        // Validacoes
        if (!this.validatePassword(password)) {
            this.showError(errorDiv, 'Senha deve ter pelo menos 8 caracteres, incluindo maiuscula, minuscula e numero');
            return;
        }

        if (userType === 'guia' && !cadastur) {
            this.showError(errorDiv, 'Numero CADASTUR e obrigatorio para guias');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Cadastrando...';
        this.hideError(errorDiv);
        this.hideSuccess(successDiv);

        try {
            const requestData = {
                name,
                email,
                password,
                user_type: userType
            };

            if (userType === 'guia') {
                requestData.cadastur_number = cadastur;
            }

            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(successDiv, 'Cadastro realizado com sucesso! Voce ja esta logado.');
                
                // Salvar dados do usuario
                localStorage.setItem('authToken', data.access_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Atualizar UI
                this.showUserMenu(data.user);
                
                setTimeout(() => {
                    document.getElementById('registerModal').remove();
                }, 2000);
            } else {
                this.showError(errorDiv, data.message || 'Erro ao fazer cadastro');
            }
        } catch (error) {
            this.showError(errorDiv, 'Erro de conexao. Tente novamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Cadastrar';
        }
    }

    // Logout
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        
        this.showLoginButtons();
        
        // Redirecionar para home se estiver em pagina protegida
        if (window.location.pathname.includes('perfil.html')) {
            window.location.href = 'index.html';
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

    // Verificar se usuario esta logado
    isLoggedIn() {
        return localStorage.getItem('authToken') !== null;
    }

    // Obter dados do usuario
    getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Mostrar erro
    showError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    // Ocultar erro
    hideError(element) {
        element.classList.add('hidden');
    }

    // Mostrar sucesso
    showSuccess(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    // Ocultar sucesso
    hideSuccess(element) {
        element.classList.add('hidden');
    }
}

// Inicializar sistema de autenticacao quando a pagina carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando sistema de autenticacao...');
    window.authManager = new AuthManager();
    console.log('Sistema de autenticacao inicializado');
});

