// auth.js - Sistema de autenticacao global com validação de CADASTUR
class AuthManager {
    constructor() {
        this.apiUrl = 'https://g8h3ilcvjnlq.manus.space/api';
        // Base local de guias removida em favor da validação via API
        this.init();
    }

    // Base local de guias descontinuada; validação agora via API
    loadGuidesDatabase() {
        return [];
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
                            Não tem uma conta? 
                            <button id="switchToRegister" class="text-green-600 hover:text-green-700 font-medium">Cadastre-se</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupLoginModalEvents();
    }

    // Criar modal de cadastro com validação aprimorada
    createRegisterModal() {
        const modalHTML = `
            <div id="registerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Cadastrar na Trekko</h2>
                        <button id="closeRegisterModal" class="text-gray-400 hover:text-gray-600">
                            <span class="text-2xl">&times;</span>
                        </button>
                    </div>
                    
                    <form id="registerForm">
                        <div class="mb-4">
                            <label for="registerName" class="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                            <input type="text" id="registerName" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                   placeholder="Digite seu nome completo">
                            <div id="nameValidation" class="mt-1 text-sm"></div>
                        </div>
                        
                        <div class="mb-4">
                            <label for="registerEmail" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="registerEmail" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                   placeholder="seu@email.com">
                        </div>
                        
                        <div class="mb-4">
                            <label for="registerPassword" class="block text-sm font-medium text-gray-700 mb-2">Senha *</label>
                            <input type="password" id="registerPassword" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                   placeholder="Mínimo 8 caracteres">
                            <p class="text-xs text-gray-500 mt-1">Mínimo 8 caracteres, incluindo maiúscula, minúscula e número</p>
                        </div>
                        
                        <div class="mb-4">
                            <label for="userType" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuário *</label>
                            <select id="userType" required 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900">
                                <option value="">Selecione o tipo de usuário...</option>
                                <option value="trekker">🥾 Trekker (Usuário comum)</option>
                                <option value="guia">🧭 Guia Profissional</option>
                            </select>
                        </div>
                        
                        <div id="cadasturSection" class="hidden mb-4">
                            <label for="cadasturNumber" class="block text-sm font-medium text-red-600 mb-2">Número CADASTUR *</label>
                            <input type="text" id="cadasturNumber"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                   placeholder="Ex: 27123456789">
                            <p class="text-xs text-gray-500 mt-1">
                                CADASTUR é o registro obrigatório para guias de turismo no Brasil. 
                                <a href="https://cadastur.turismo.gov.br/" target="_blank" class="text-green-600 hover:text-green-700">Saiba mais</a>
                            </p>
                            <div id="cadasturValidation" class="mt-2 text-sm"></div>
                        </div>
                        
                        <div id="validationSummary" class="hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                            <h4 class="font-medium text-blue-800 mb-2">Validação de Guia Profissional:</h4>
                            <div id="validationDetails" class="text-sm text-blue-700"></div>
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
                            Já tem uma conta? 
                            <button id="switchToLogin" class="text-green-600 hover:text-green-700 font-medium">Faça login</button>
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

    // Configurar eventos do modal de cadastro com validação aprimorada
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

        // Mostrar/ocultar seção CADASTUR
        userTypeSelect.addEventListener('change', () => {
            const cadasturSection = document.getElementById('cadasturSection');
            
            if (userTypeSelect.value === 'guia') {
                cadasturSection.classList.remove('hidden');
                cadasturInput.setAttribute('required', 'required');
                // Validar CADASTUR existente quando o tipo muda para guia
                this.validateCadastur();
            } else {
                cadasturSection.classList.add('hidden');
                cadasturInput.removeAttribute('required');
                cadasturInput.value = '';
                this.clearValidation();
            }
        });

        // Limpar validação ao alterar o nome
        nameInput.addEventListener('input', () => {
            if (userTypeSelect.value === 'guia') {
                this.clearValidation();
            }
        });

        // Validação em tempo real do CADASTUR
        cadasturInput.addEventListener('input', (e) => {
            this.formatCadastur(e.target);
            if (userTypeSelect.value === 'guia') {
                this.validateCadastur();
            }
        });

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Validar número CADASTUR via API oficial
    validateCadastur() {
        const cadasturInput = document.getElementById('cadasturNumber');
        const cadasturValidation = document.getElementById('cadasturValidation');
        const validationSummary = document.getElementById('validationSummary');

        const cadastur = cadasturInput.value.trim();

        this.clearValidation();

        if (!cadastur) {
            cadasturValidation.innerHTML = '<span class="text-red-600">✗ CADASTUR é obrigatório para guias</span>';
            cadasturInput.classList.add('border-red-300');
            validationSummary.classList.add('hidden');
            return;
        }

        if (!/^\d+$/.test(cadastur)) {
            cadasturValidation.innerHTML = '<span class="text-red-600">✗ CADASTUR deve conter apenas números</span>';
            cadasturInput.classList.add('border-red-300');
            validationSummary.classList.add('hidden');
            return;
        }

        fetch(`${this.apiUrl}/auth/validate-cadastur`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cadastur_number: cadastur })
        })
            .then(resp => resp.json())
            .then(result => {
                if (result.valid) {
                    cadasturValidation.innerHTML = '<span class="text-green-600">✓ CADASTUR válido e verificado</span>';
                    cadasturInput.classList.remove('border-red-300');
                    cadasturInput.classList.add('border-green-300');
                } else {
                    cadasturValidation.innerHTML = `<span class="text-red-600">✗ ${result.message || 'CADASTUR não encontrado na base oficial'}</span>`;
                    cadasturInput.classList.remove('border-green-300');
                    cadasturInput.classList.add('border-red-300');
                }
                validationSummary.classList.add('hidden');
            })
            .catch(() => {
                cadasturValidation.innerHTML = '<span class="text-red-600">✗ Erro ao validar CADASTUR</span>';
                cadasturInput.classList.add('border-red-300');
                validationSummary.classList.add('hidden');
            });
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
        if (nameInput) {
            nameInput.classList.remove('border-red-300', 'border-green-300', 'border-yellow-300');
        }
        if (cadasturInput) {
            cadasturInput.classList.remove('border-red-300', 'border-green-300', 'border-yellow-300');
        }
    }

    // Formatar CADASTUR (apenas números)
    formatCadastur(input) {
        const value = input.value.replace(/\D/g, '');
        input.value = value;
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

                // Fechar modal e atualizar interface
                document.getElementById('loginModal').remove();
                this.showUserMenu(data.user);
                
                // Redirecionar para perfil se necessário
                if (window.location.pathname.includes('perfil.html')) {
                    window.location.reload();
                }
            } else {
                this.showError(errorDiv, data.message || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(errorDiv, 'Erro de conexão. Tente novamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    }

    // Processar cadastro com validação aprimorada
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
            this.showError(errorDiv, 'Todos os campos obrigatórios devem ser preenchidos.');
            return;
        }

        // Validação específica para guias
        if (userType === 'guia') {
            if (!cadastur) {
                this.showError(errorDiv, 'CADASTUR é obrigatório para guias profissionais.');
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
                    this.showError(errorDiv, result.message || 'CADASTUR inválido');
                    return;
                }
            } catch (err) {
                console.error('Erro ao validar CADASTUR:', err);
                this.showError(errorDiv, 'Erro ao validar CADASTUR. Tente novamente.');
                return;
            }
        }

        // Validação de senha
        if (password.length < 8) {
            this.showError(errorDiv, 'A senha deve ter pelo menos 8 caracteres.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Cadastrando...';
        this.hideError(errorDiv);
        this.hideError(successDiv);

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

            if (response.ok) {
                this.showSuccess(successDiv, 'Cadastro realizado com sucesso! Você pode fazer login agora.');
                
                // Limpar formulário
                document.getElementById('registerForm').reset();
                this.clearValidation();
                
                // Fechar modal após 2 segundos e abrir login
                setTimeout(() => {
                    document.getElementById('registerModal').remove();
                    this.openLoginModal();
                }, 2000);
                
            } else {
                this.showError(errorDiv, data.message || 'Erro ao realizar cadastro');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            this.showError(errorDiv, 'Erro de conexão. Tente novamente.');
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
        
        // Redirecionar para home se estiver em página protegida
        if (window.location.pathname.includes('perfil.html') || 
            window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    // Mostrar erro
    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    // Ocultar erro
    hideError(element) {
        if (element) {
            element.classList.add('hidden');
        }
    }

    // Mostrar sucesso
    showSuccess(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    // Verificar se usuário está logado
    isLoggedIn() {
        return !!localStorage.getItem('authToken');
    }

    // Obter dados do usuário
    getUserData() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Obter token de autenticação
    getAuthToken() {
        return localStorage.getItem('authToken');
    }
}

// Inicializar o sistema de autenticação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Exportar para uso global
window.AuthManager = AuthManager;

