/**
 * auth.js - Novo sistema de autenticação da Trekko
 * Substitui implementações anteriores e valida CADASTUR com backend.
 */
class TrekkoAuth {
    constructor() {
        this.localApi = 'http://localhost:5000/api/auth';
        // Atualiza URL da API de produção para novo endpoint estável
        this.productionApi = 'https://g8h3ilcvjnlq.manus.space/api/auth';
        const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname) ||
            window.location.protocol === 'file:';
        // Fallback to production if the local API is unavailable
        this.apiUrl = isLocal ? this.localApi : this.productionApi;
        this.authToken = null;
        this.cadasturDataCache = null;
        this.cadasturDataPromise = null;
        this.cadasturValidationToken = 0;
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
        const nameInput = modal.querySelector('#register-name');

        const triggerCadasturValidation = () => {
            if (!cadasturInput) {
                return;
            }

            if (userTypeSelect.value !== 'guia') {
                this.clearValidation();
                return;
            }

            const digits = cadasturInput.value.replace(/\D/g, '');
            if (cadasturInput.value !== digits) {
                cadasturInput.value = digits;
            }

            if (!digits) {
                this.clearValidation();
                return;
            }

            const currentName = nameInput?.value ?? '';
            void this.validateCadastur(currentName, digits);
        };

        userTypeSelect.addEventListener('change', () => {
            if (userTypeSelect.value === 'guia') {
                cadasturSection.style.display = 'block';
                cadasturInput.required = true;
                triggerCadasturValidation();
            } else {
                cadasturSection.style.display = 'none';
                cadasturInput.required = false;
                cadasturInput.value = '';
                this.clearValidation();
            }
        });

        cadasturInput.addEventListener('input', () => {
            triggerCadasturValidation();
        });

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (userTypeSelect.value === 'guia' && cadasturInput.value.trim().length > 0) {
                    void this.validateCadastur(nameInput.value, cadasturInput.value);
                } else if (cadasturInput.value.trim().length === 0) {
                    this.clearValidation();
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(form, modal);
        });
    }

    async handleLogin(form, modal) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        if (data.cadastur_number) {
            data.cadastur_number = data.cadastur_number.replace(/\D/g, '');
        }

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
        if (data.cadastur_number) {
            data.cadastur_number = data.cadastur_number.replace(/\D/g, '');
        }

        if (data.user_type === 'guia') {
            const isValid = await this.validateCadastur(data.name ?? '', data.cadastur_number);
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

    async validateCadastur(name, cadasturNumber) {
        const validationDiv = document.getElementById('cadastur-validation');
        this.cadasturValidationToken += 1;
        const currentToken = this.cadasturValidationToken;

        if (!validationDiv) {
            return false;
        }

        const trimmedName = (name ?? '').trim();
        const rawNumber = (cadasturNumber ?? '').toString().trim();

        if (!trimmedName || !rawNumber) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Número CADASTUR e nome são obrigatórios</span>';
            return false;
        }

        const digitsOnly = rawNumber.replace(/\D/g, '');
        if (digitsOnly.length !== rawNumber.length) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ CADASTUR deve conter apenas números</span>';
            return false;
        }

        if (digitsOnly.length !== 11) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ CADASTUR deve conter 11 dígitos</span>';
            return false;
        }

        validationDiv.innerHTML = '<span>🔄 Validando...</span>';

        let cadasturData;
        try {
            cadasturData = await this.loadCadasturData();
        } catch (error) {
            console.error('Erro ao carregar base CADASTUR local:', error);
            if (currentToken === this.cadasturValidationToken) {
                validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Não foi possível acessar a base oficial CADASTUR. Tente novamente.</span>';
            }
            return false;
        }

        if (currentToken !== this.cadasturValidationToken) {
            return false;
        }

        const normalizedName = this.normalizeCadasturName(trimmedName);
        const namesForNumber = cadasturData.namesByNumber.get(digitsOnly);

        if (!namesForNumber || !namesForNumber.has(normalizedName)) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Nome ou número CADASTUR não encontrados na base oficial. Verifique seus dados ou entre em contato com suporte@trekko.com.br.</span>';
            return false;
        }

        let serverResult;
        try {
            serverResult = await this.validateCadasturServer(trimmedName, digitsOnly);
        } catch (error) {
            console.error('Erro ao validar CADASTUR no servidor:', error);
            if (currentToken === this.cadasturValidationToken) {
                validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Erro ao validar CADASTUR. Tente novamente.</span>';
            }
            return false;
        }

        if (currentToken !== this.cadasturValidationToken) {
            return false;
        }

        if (!serverResult.valid) {
            const message = serverResult.message || 'Nome ou número CADASTUR não encontrados na base oficial. Verifique seus dados ou entre em contato com suporte@trekko.com.br.';
            validationDiv.innerHTML = `<span class="trekko-validation-error">❌ ${message}</span>`;
            return false;
        }

        const successMessage = serverResult.message || 'CADASTUR válido e verificado';
        validationDiv.innerHTML = `<span class="trekko-validation-success">✅ ${successMessage}</span>`;
        return true;
    }

    async validateCadasturServer(name, cadasturNumber) {
        const payload = {
            name: name.trim(),
            cadastur_number: cadasturNumber,
        };

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        };

        let response;
        let result = {};

        try {
            response = await fetch(`${this.apiUrl}/validate-cadastur`, requestOptions);
        } catch (error) {
            if (this.apiUrl !== this.productionApi) {
                response = await fetch(`${this.productionApi}/validate-cadastur`, requestOptions);
                this.apiUrl = this.productionApi;
            } else {
                throw error;
            }
        }

        if (!response) {
            return { valid: false };
        }

        try {
            result = await response.json();
        } catch {
            result = {};
        }

        if (!response.ok && this.apiUrl === this.localApi) {
            response = await fetch(`${this.productionApi}/validate-cadastur`, requestOptions);
            this.apiUrl = this.productionApi;
            try {
                result = await response.json();
            } catch {
                result = {};
            }
        }

        if (!response.ok) {
            return {
                valid: false,
                message: result.message,
            };
        }

        const status = typeof result?.status === 'string' ? result.status.toLowerCase() : '';
        const isValid = Boolean(
            result?.valid === true ||
            result?.success === true ||
            result?.data?.valid === true ||
            status === 'success' ||
            status === 'ok' ||
            result?.data?.active === true
        );

        return {
            valid: isValid,
            message: result?.message,
        };
    }

    async loadCadasturData() {
        if (this.cadasturDataCache) {
            return this.cadasturDataCache;
        }

        if (this.cadasturDataPromise) {
            return this.cadasturDataPromise;
        }

        this.cadasturDataPromise = this.fetchCadasturCsv()
            .then((csv) => this.parseCadasturCsv(csv))
            .then((data) => {
                if (!data || data.namesByNumber.size === 0) {
                    throw new Error('Base oficial CADASTUR vazia ou inválida');
                }
                this.cadasturDataCache = data;
                return data;
            })
            .catch((error) => {
                this.cadasturDataCache = null;
                throw error;
            })
            .finally(() => {
                this.cadasturDataPromise = null;
            });

        return this.cadasturDataPromise;
    }

    async fetchCadasturCsv() {
        const candidates = ['/BD_CADASTUR.csv', '/CADASTUR.csv'];
        let lastError = null;

        for (const candidate of candidates) {
            try {
                const response = await fetch(candidate, { cache: 'no-store' });
                if (!response.ok) {
                    lastError = new Error(`Falha ao carregar ${candidate}: ${response.status}`);
                    continue;
                }

                const text = await response.text();
                if (text && text.trim().length > 0) {
                    return text;
                }

                lastError = new Error(`Arquivo ${candidate} vazio`);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Não foi possível carregar a base CADASTUR');
    }

    parseCadasturCsv(csvContent) {
        const sanitized = csvContent.replace(/\r/g, '\n');
        const lines = sanitized.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

        if (lines.length === 0) {
            return { namesByNumber: new Map(), total: 0 };
        }

        const headerLine = lines.shift().replace(/^\uFEFF/, '');
        const delimiter = this.detectCadasturDelimiter(headerLine);
        const headers = this.parseCadasturLine(headerLine, delimiter).map((header) => this.normalizeCadasturHeader(header));
        const nameIndex = this.findCadasturColumnIndex(headers, ['NOME_COMPLETO', 'NOME', 'NOME_COMPLETO_DO_GUIA', 'NOME_DO_GUIA']);
        const numberIndex = this.findCadasturColumnIndex(headers, ['NUMERO_CADASTUR', 'NUMERO_DO_CERTIFICADO', 'NUMERO_DO_CADASTUR']);

        if (nameIndex === -1 || numberIndex === -1) {
            throw new Error('Colunas NOME_COMPLETO ou NUMERO_CADASTUR não encontradas na base CADASTUR');
        }

        const namesByNumber = new Map();
        let total = 0;

        for (const rawLine of lines) {
            const values = this.parseCadasturLine(rawLine, delimiter);
            if (values.length <= Math.max(nameIndex, numberIndex)) {
                continue;
            }

            const rawName = values[nameIndex]?.trim();
            const rawNumber = values[numberIndex]?.trim();
            if (!rawName || !rawNumber) {
                continue;
            }

            const normalizedNumber = this.normalizeCadasturNumber(rawNumber);
            const normalizedName = this.normalizeCadasturName(rawName);

            if (!normalizedNumber || !normalizedName) {
                continue;
            }

            if (!namesByNumber.has(normalizedNumber)) {
                namesByNumber.set(normalizedNumber, new Set());
            }

            namesByNumber.get(normalizedNumber).add(normalizedName);
            total += 1;
        }

        return { namesByNumber, total };
    }

    detectCadasturDelimiter(headerLine) {
        const candidates = [',', ';', '\t', '|'];
        let bestDelimiter = ';';
        let bestCount = -1;

        for (const candidate of candidates) {
            const count = headerLine.split(candidate).length - 1;
            if (count > bestCount) {
                bestCount = count;
                bestDelimiter = candidate;
            }
        }

        return bestDelimiter;
    }

    parseCadasturLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];

            if (char === '"') {
                if (inQuotes && line[index + 1] === '"') {
                    current += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === delimiter && !inQuotes) {
                result.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        result.push(current);
        return result;
    }

    normalizeCadasturHeader(value) {
        return value
            .replace(/^\uFEFF/, '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_');
    }

    findCadasturColumnIndex(headers, candidates) {
        for (const candidate of candidates) {
            const index = headers.indexOf(candidate);
            if (index !== -1) {
                return index;
            }
        }
        return -1;
    }

    normalizeCadasturName(value) {
        return value
            .replace(/^\uFEFF/, '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    normalizeCadasturNumber(value) {
        return value.replace(/\D/g, '');
    }

    clearValidation() {
        this.cadasturValidationToken += 1;
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
                    <button id="userMenuBtn" class="user-menu-btn">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.full_name || user.name || user.email}</span>
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
        localStorage.removeItem('authToken');
        this.authToken = null;
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.trekkoAuth = new TrekkoAuth();
});

