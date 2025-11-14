// TrekkoAuth - front-end authentication orchestrator
//
// This module centralizes all authentication behaviour for the Trekko
// experience.  It keeps the public API small (login, register, logout and
// subscription to session updates) while providing a resilient implementation
// that can survive flaky connections and inconsistent DOM states.  The
// previous iteration mixed DOM manipulation, network calls and storage access
// without coordination which led to duplicated event handlers, stale sessions
// and hard to reproduce bugs.  The new version focuses on:
//
//  * A single source of truth for the session kept inside TrekkoAuth and
//    synchronised with localStorage.
//  * Safe DOM access guarded by runtime checks so the class works in testing
//    environments where parts of the DOM API are missing.
//  * A compact fetch wrapper that always propagates meaningful errors and makes
//    sure cookies are sent (`credentials: 'include'`).
//  * Clear separation between modal creation and business logic which prevents
//    duplicated listeners and dangling elements.
//  * First-class CADASTUR validation with visual feedback that is reused by
//    both manual input checks and API confirmation.
//
// The public surface of the class remains compatible with the previous
// implementation (methods such as `handleRegister`, `handleLogin` and
// `validateCadasturAPI`) so existing tests and pages continue to work.

class TrekkoAuthError extends Error {
    constructor(message, payload = {}) {
        super(message);
        this.name = 'TrekkoAuthError';
        this.payload = payload;
    }
}

class TrekkoAuth {
    constructor(options = {}) {
        this.options = options;
        this.apiUrl = this.normalizeEndpoint(options.apiUrl ?? this.detectEndpoint());
        this.storageKey = options.storageKey ?? 'userData';
        this.csrfToken = options.csrfToken ?? null;
        this.session = { authenticated: false, user: null };
        this.listeners = new Set();
        this.activeModal = null;

        this.boundDocumentHandler = (event) => this.handleDelegatedAction(event);
        this.boundEscapeHandler = (event) => {
            if (event?.key === 'Escape') {
                this.closeActiveModal();
            }
        };

        if (typeof document !== 'undefined') {
            this.injectStylesheet(options.stylesheet ?? 'new_auth.css');
            this.registerGlobalListeners();
            this.restoreSessionFromStorage();
        }
    }

    normalizeEndpoint(raw) {
        if (!raw) return '/api/auth';
        return raw.endsWith('/') ? raw.slice(0, -1) : raw;
    }

    detectEndpoint() {
        if (typeof window !== 'undefined' && window.__TREKKO_AUTH_ENDPOINT__) {
            return window.__TREKKO_AUTH_ENDPOINT__;
        }

        if (typeof document !== 'undefined') {
            const meta = document.querySelector?.('meta[name="trekko-auth-endpoint"]');
            if (meta?.content) {
                return meta.content;
            }

            const datasetEndpoint = document.body?.dataset?.trekkoAuthEndpoint;
            if (datasetEndpoint) {
                return datasetEndpoint;
            }
        }

        return '/api/auth';
    }

    injectStylesheet(href) {
        if (!href || typeof document === 'undefined') return;
        const exists = document.querySelector?.(`link[href="${href}"]`);
        if (exists) return;

        const link = document.createElement?.('link');
        if (!link) return;

        link.rel = 'stylesheet';
        link.href = href;
        document.head?.appendChild?.(link);
    }

    registerGlobalListeners() {
        if (typeof document === 'undefined') return;
        document.addEventListener?.('click', this.boundDocumentHandler);

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('keydown', this.boundEscapeHandler);
            window.addEventListener('storage', (event) => {
                if (event?.key === this.storageKey) {
                    this.restoreSessionFromStorage();
                    this.updateNavigation();
                }
            });
            window.addEventListener('DOMContentLoaded', () => {
                if (this.options.autoSync === false) return;
                // `fetch` might be undefined in testing environments.
                if (typeof fetch !== 'function') return;
                void this.synchroniseSessionWithBackend().catch(() => undefined);
            });
        }
    }

    restoreSessionFromStorage() {
        if (typeof localStorage === 'undefined') return;
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
            this.session = { authenticated: false, user: null };
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                this.session = {
                    authenticated: Boolean(parsed?.id || parsed?.email),
                    user: parsed,
                };
            }
        } catch (error) {
            console.error('Erro ao restaurar sessão do armazenamento local:', error);
            this.session = { authenticated: false, user: null };
        }
    }

    persistSession(user, csrfToken) {
        this.session = {
            authenticated: Boolean(user),
            user: user ?? null,
        };

        if (csrfToken) {
            this.csrfToken = csrfToken;
        }

        if (typeof localStorage !== 'undefined') {
            if (user) {
                localStorage.setItem(this.storageKey, JSON.stringify(user));
            } else {
                localStorage.removeItem(this.storageKey);
            }
        }

        this.notifyListeners();
    }

    clearSession() {
        this.persistSession(null, null);
    }

    async synchroniseSessionWithBackend() {
        try {
            const payload = await this.request('/me', { method: 'GET' });

            if (payload?.csrfToken) {
                this.csrfToken = payload.csrfToken;
            }

            if (payload?.authenticated && payload.user) {
                const normalised = this.normaliseUserPayload(payload.user);
                this.persistSession(normalised, payload.csrfToken);
            } else {
                this.clearSession();
            }
            this.updateNavigation();
        } catch (error) {
            console.warn('Não foi possível sincronizar a sessão inicial:', error);
        }
    }

    handleDelegatedAction(event) {
        const target = event?.target;
        if (!target || typeof target.closest !== 'function') return;

        const loginTrigger = target.closest('[data-auth="login"]');
        if (loginTrigger) {
            event.preventDefault?.();
            this.showLoginModal();
            return;
        }

        const registerTrigger = target.closest('[data-auth="register"]');
        if (registerTrigger) {
            event.preventDefault?.();
            this.showRegisterModal();
            return;
        }

        const logoutTrigger = target.closest('[data-auth="logout"]');
        if (logoutTrigger) {
            event.preventDefault?.();
            void this.logout();
        }
    }

    showLoginModal() {
        const modal = this.createModal('Entrar no Trekko', this.getLoginForm());
        this.attachModal(modal, ({ form, modalElement }) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleLogin(form, modalElement);
            });
        });
    }

    showRegisterModal() {
        const modal = this.createModal('Cadastrar no Trekko', this.getRegisterForm());
        this.attachModal(modal, ({ form, modalElement }) => {
            const userTypeSelect = form.querySelector?.('#register-user-type');
            const cadasturSection = form.querySelector?.('#cadastur-section');
            const cadasturInput = form.querySelector?.('#register-cadastur');

            userTypeSelect?.addEventListener('change', () => {
                if (!cadasturSection || !cadasturInput) return;
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

            cadasturInput?.addEventListener('input', () => {
                const currentValue = cadasturInput.value ?? '';
                this.validateCadastur(currentValue);
            });

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleRegister(form, modalElement);
            });
        });
    }

    createModal(title, content) {
        if (typeof document === 'undefined') return null;
        const overlay = document.createElement?.('div');
        if (!overlay) return null;

        overlay.className = 'trekko-modal-overlay';
        overlay.innerHTML = `
            <div class="trekko-modal">
                <div class="trekko-modal-header">
                    <h2>${title}</h2>
                    <button class="trekko-modal-close" data-close="true">&times;</button>
                </div>
                <div class="trekko-modal-body">${content}</div>
            </div>
        `;

        overlay.addEventListener?.('click', (event) => {
            const target = event?.target;
            if (target === overlay || target?.dataset?.close === 'true') {
                this.closeActiveModal();
            }
        });

        return overlay;
    }

    attachModal(modal, callback) {
        if (!modal || typeof document === 'undefined') return;
        this.closeActiveModal();
        document.body?.appendChild?.(modal);
        this.activeModal = modal;

        const form = modal.querySelector?.('form');
        if (form && typeof callback === 'function') {
            callback({ form, modalElement: modal });
        }
    }

    closeActiveModal() {
        if (!this.activeModal) return;
        this.activeModal.remove?.();
        this.activeModal = null;
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

    serializeForm(form) {
        const entries = new FormData(form);
        const payload = {};
        for (const [key, value] of entries) {
            if (typeof value === 'string') {
                payload[key] = value.trim();
            } else {
                payload[key] = value;
            }
        }
        return payload;
    }

    async handleLogin(form, modal) {
        const payload = this.serializeForm(form);

        try {
            this.toggleLoading(form, true);
            const result = await this.request('/login', { method: 'POST', body: payload });

            if (!result?.success) {
                throw new TrekkoAuthError(result?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.', result);
            }

            const normalisedUser = this.normaliseUserPayload(result.user ?? payload);
            this.persistSession(normalisedUser, result.csrfToken);
            this.updateNavigation();
            this.showSuccess('Login realizado com sucesso!');
            modal.remove?.();
            this.activeModal = null;
        } catch (error) {
            const message = error instanceof TrekkoAuthError
                ? error.message
                : 'Não foi possível conectar ao servidor. Tente novamente mais tarde.';
            this.showError(message);
        } finally {
            this.toggleLoading(form, false, 'Entrar');
        }
    }

    async handleRegister(form, modal) {
        const payload = this.serializeForm(form);

        if (payload.user_type === 'guia') {
            const cadastur = payload.cadastur_number ?? '';
            const name = payload.name ?? '';
            const isValid = await this.validateCadasturAPI(cadastur, name);
            if (!isValid) {
                return;
            }
        } else {
            delete payload.cadastur_number;
        }

        try {
            this.toggleLoading(form, true);
            const result = await this.request('/register', { method: 'POST', body: payload });

            if (!result?.success) {
                throw new TrekkoAuthError(result?.message || 'Não foi possível completar o cadastro. Verifique os dados informados.', result);
            }

            const normalisedUser = this.normaliseUserPayload(result.user ?? payload);
            this.persistSession(normalisedUser, result.csrfToken);
            this.updateNavigation();
            this.showSuccess('Cadastro realizado com sucesso!');
            modal.remove?.();
            this.activeModal = null;
        } catch (error) {
            const message = error instanceof TrekkoAuthError
                ? error.message
                : 'Erro de conexão. Tente novamente em instantes.';
            this.showError(message);
        } finally {
            this.toggleLoading(form, false, 'Cadastrar');
        }
    }

    toggleLoading(form, isLoading, fallbackText = '') {
        const submitBtn = form.querySelector?.('button[type="submit"]');
        if (!submitBtn) return;

        if (isLoading) {
            if (!submitBtn.dataset) submitBtn.dataset = {};
            if (!submitBtn.dataset.originalText) {
                submitBtn.dataset.originalText = submitBtn.textContent ?? '';
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Carregando...';
        } else {
            submitBtn.disabled = false;
            const text = submitBtn.dataset?.originalText || fallbackText || submitBtn.textContent;
            submitBtn.textContent = text || fallbackText;
        }
    }

    async request(path, { method = 'GET', body, skipJsonBody = false } = {}) {
        if (typeof fetch !== 'function') {
            throw new TrekkoAuthError('Fetch API indisponível neste ambiente.');
        }

        const headers = { 'Content-Type': 'application/json' };
        if (this.csrfToken) {
            headers['x-csrf-token'] = this.csrfToken;
        }

        const options = {
            method,
            headers,
            credentials: 'include',
        };

        if (body && !skipJsonBody) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.apiUrl}${path}`, options);
        let data = {};

        if (!skipJsonBody) {
            try {
                data = await response.json();
            } catch (error) {
                throw new TrekkoAuthError('Resposta inválida do servidor.', { error });
            }
        }

        if (!response.ok) {
            const message = data?.message || 'Falha ao comunicar com o servidor de autenticação.';
            throw new TrekkoAuthError(message, data);
        }

        if (data?.csrfToken) {
            this.csrfToken = data.csrfToken;
        }

        return data;
    }

    validateCadastur(rawValue) {
        const validationDiv = typeof document !== 'undefined'
            ? document.getElementById?.('cadastur-validation')
            : null;

        if (!validationDiv) return true;

        const cleaned = (rawValue ?? '').replace(/\D/g, '');
        if (!cleaned) {
            validationDiv.innerHTML = '';
            return false;
        }

        if (cleaned.length < 11) {
            validationDiv.innerHTML = '<span class="trekko-validation-warning">⚠️ CADASTUR deve ter 11 dígitos</span>';
            return false;
        }

        if (cleaned.length > 11) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ CADASTUR não pode ter mais de 11 dígitos</span>';
            return false;
        }

        validationDiv.innerHTML = '<span class="trekko-validation-success">✅ Formato válido</span>';
        return true;
    }

    async validateCadasturAPI(cadasturNumber, rawName) {
        const validationDiv = typeof document !== 'undefined'
            ? document.getElementById?.('cadastur-validation')
            : null;

        if (!validationDiv) {
            return false;
        }

        const name = (rawName ?? '').trim();
        const cleaned = (cadasturNumber ?? '').replace(/\D/g, '');

        if (!name) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Informe seu nome completo para validar o CADASTUR</span>';
            return false;
        }

        if (!this.validateCadastur(cadasturNumber)) {
            return false;
        }

        if (!cleaned) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Informe seu número CADASTUR</span>';
            return false;
        }

        try {
            validationDiv.innerHTML = '<span class="trekko-validation-warning">⏳ Validando CADASTUR...</span>';
            const result = await this.request('/validate-cadastur', {
                method: 'POST',
                body: {
                    name,
                    cadastur_number: cleaned,
                },
            });

            if (result?.valid) {
                validationDiv.innerHTML = '<span class="trekko-validation-success">✅ CADASTUR válido</span>';
                return true;
            }

            const message = result?.message || 'Não foi possível validar o CADASTUR informado.';
            validationDiv.innerHTML = `<span class="trekko-validation-error">❌ ${message}</span>`;
            return false;
        } catch (error) {
            validationDiv.innerHTML = '<span class="trekko-validation-error">❌ Erro ao validar CADASTUR</span>';
            return false;
        }
    }

    clearValidation() {
        const validationDiv = typeof document !== 'undefined'
            ? document.getElementById?.('cadastur-validation')
            : null;
        if (validationDiv) {
            validationDiv.innerHTML = '';
        }
    }

    showNotification(message, type) {
        if (typeof document === 'undefined') {
            console.log(`[${type}] ${message}`);
            return;
        }

        const notification = document.createElement?.('div');
        if (!notification) return;

        notification.className = `trekko-notification trekko-notification-${type}`;
        notification.textContent = message;
        document.body?.appendChild?.(notification);

        setTimeout(() => {
            notification.remove?.();
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    normaliseUserPayload(rawUser = {}) {
        const role = (rawUser.role ?? rawUser.user_type ?? '').toString().toLowerCase();
        const userType = role.includes('guia') ? 'guia' : 'trekker';
        return {
            id: rawUser.id ?? rawUser.user_id ?? null,
            email: rawUser.email ?? '',
            name: rawUser.name ?? rawUser.full_name ?? rawUser.email ?? '',
            user_type: userType,
            role: rawUser.role ?? role,
            created_at: rawUser.created_at ?? rawUser.createdAt ?? null,
            updated_at: rawUser.updated_at ?? rawUser.updatedAt ?? null,
        };
    }

    normalizeUserType(type) {
        return type === 'guia' || type === 'guide' ? 'guia' : 'trekker';
    }

    updateNavigation() {
        if (typeof document === 'undefined') return;
        const user = this.session.user;
        const authenticated = this.session.authenticated;

        const authButtons = document.querySelector?.('[data-auth-buttons]');
        const loginBtn = document.getElementById?.('loginBtn');
        const registerBtn = document.getElementById?.('registerBtn');
        const userMenu = document.getElementById?.('userMenu');
        const userName = document.getElementById?.('userName');

        if (authenticated) {
            authButtons?.classList?.add?.('hidden');
            loginBtn?.classList?.add?.('hidden');
            registerBtn?.classList?.add?.('hidden');
            userMenu?.classList?.remove?.('hidden');
            if (userName) {
                userName.textContent = user?.name || user?.email || 'Usuário';
            }
        } else {
            authButtons?.classList?.remove?.('hidden');
            loginBtn?.classList?.remove?.('hidden');
            registerBtn?.classList?.remove?.('hidden');
            userMenu?.classList?.add?.('hidden');
        }
    }

    updateUIForLoggedUser(user) {
        this.persistSession(user, this.csrfToken);
        this.updateNavigation();
    }

    async logout() {
        try {
            await this.request('/logout', { method: 'POST', skipJsonBody: true });
        } catch (error) {
            console.warn('Erro ao encerrar sessão:', error);
        } finally {
            this.clearSession();
            this.updateNavigation();
            this.showSuccess('Sessão encerrada com sucesso.');
        }
    }

    onAuthStateChanged(callback) {
        if (typeof callback !== 'function') return () => undefined;
        this.listeners.add(callback);
        callback(this.getSession());
        return () => {
            this.listeners.delete(callback);
        };
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

    getSession() {
        return {
            authenticated: this.session.authenticated,
            user: this.session.user,
            csrfToken: this.csrfToken,
        };
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener?.('DOMContentLoaded', () => {
        if (!window.trekkoAuth) {
            window.trekkoAuth = new TrekkoAuth();
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrekkoAuth;
}
