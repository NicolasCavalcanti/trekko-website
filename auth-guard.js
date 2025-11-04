// auth-guard.js - Proteção de páginas restritas a guias
class AuthGuard {
    constructor() {
        this.ready = this.init();
    }

    async init() {
        try {
            if (window.trekkoAuth?.readyPromise) {
                await window.trekkoAuth.readyPromise;
            }
            await this.checkGuideAccess();
        } catch (error) {
            console.error('Erro ao inicializar AuthGuard:', error);
            this.redirectToLogin('Não foi possível validar sua sessão. Faça login novamente.');
        }
    }

    async getSession() {
        if (!window.trekkoAuth) {
            return { authenticated: false };
        }
        if (window.trekkoAuth.readyPromise) {
            await window.trekkoAuth.readyPromise;
        }
        return window.trekkoAuth.getSession();
    }

    async checkGuideAccess() {
        const session = await this.getSession();
        if (!session.authenticated || !session.user) {
            this.redirectToLogin('Você precisa estar logado para acessar esta página.');
            return;
        }

        const isGuide = Array.isArray(session.roles)
            ? session.roles.map((role) => role.toUpperCase()).includes('GUIA')
            : session.user.user_type === 'guia';

        if (!isGuide) {
            this.redirectToHome('Acesso restrito aos Guias credenciados.');
            return;
        }

        this.showPageContent();
    }

    redirectToLogin(message) {
        alert(message);
        window.location.href = 'https://www.trekko.com.br/';
    }

    redirectToHome(message) {
        alert(message);
        window.location.href = 'https://www.trekko.com.br/';
    }

    showPageContent() {
        const body = document.body;
        const mainContent = document.querySelector('main');

        if (body?.classList.contains('hidden')) {
            body.classList.remove('hidden');
        }

        if (mainContent?.classList.contains('hidden')) {
            mainContent.classList.remove('hidden');
        }

        body?.classList.add('guide-authenticated');
    }

    static async currentSession() {
        if (window.trekkoAuth?.readyPromise) {
            await window.trekkoAuth.readyPromise;
        }
        return window.trekkoAuth?.getSession?.();
    }

    static async isGuide() {
        const session = await AuthGuard.currentSession();
        if (!session?.authenticated) return false;
        if (Array.isArray(session.roles)) {
            return session.roles.map((role) => role.toUpperCase()).includes('GUIA');
        }
        return session.user?.user_type === 'guia';
    }

    static async getCurrentGuide() {
        const session = await AuthGuard.currentSession();
        if (!session?.authenticated) return null;
        const isGuide = await AuthGuard.isGuide();
        return isGuide ? session.user : null;
    }
}

const guardPages = ['admin-expeditions.html', 'nova-expedicao.html'];

document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname || '';
    if (guardPages.some((page) => pathname.includes(page))) {
        console.log('Aplicando proteção de acesso para Guias...');
        // eslint-disable-next-line no-new
        new AuthGuard();
    }
});

async function toggleGuideElements() {
    const isGuide = await AuthGuard.isGuide();
    const guideOnlyElements = document.querySelectorAll('.guide-only, [data-guide-only="true"]');

    guideOnlyElements.forEach((element) => {
        if (isGuide) {
            element.style.display = '';
            element.classList.remove('hidden');
        } else {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    });

    const organizeExpeditionsLink = document.querySelector('a[href="admin-expeditions.html"]');
    if (organizeExpeditionsLink) {
        if (isGuide) {
            organizeExpeditionsLink.style.display = '';
            organizeExpeditionsLink.classList.remove('hidden');
        } else {
            organizeExpeditionsLink.style.display = 'none';
            organizeExpeditionsLink.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        void toggleGuideElements();
    }, 100);
});

if (window.trekkoAuth?.onAuthStateChanged) {
    window.trekkoAuth.onAuthStateChanged(() => {
        void toggleGuideElements();
    });
}

window.addEventListener('storage', (event) => {
    if (event.key === 'userData') {
        void toggleGuideElements();
    }
});

// Funções globais esperadas por outras partes do site
window.shouldShowGuideOptions = async function shouldShowGuideOptions() {
    return AuthGuard.isGuide();
};

window.toggleGuideElements = toggleGuideElements;
