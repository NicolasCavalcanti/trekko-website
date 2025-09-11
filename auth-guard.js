// auth-guard.js - Sistema de proteção de páginas para Guias
class AuthGuard {
    constructor() {
        this.init();
    }

    init() {
        // Verificar se o usuário está logado e é um guia
        this.checkGuideAccess();
    }

    // Verificar acesso de guia
    checkGuideAccess() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (!token || !userData) {
            this.redirectToLogin('Você precisa estar logado para acessar esta página.');
            return;
        }

        try {
            const user = JSON.parse(userData);
            
            // Verificar se o usuário é um guia
            if (user.role !== 'guide' && user.role !== 'guia') {
                this.redirectToHome('Acesso restrito apenas para Guias certificados.');
                return;
            }

            // Se chegou até aqui, o usuário é um guia válido
            this.showPageContent();
            
        } catch (error) {
            console.error('Erro ao verificar dados do usuário:', error);
            this.redirectToLogin('Erro na verificação de acesso. Faça login novamente.');
        }
    }

    // Redirecionar para login
    redirectToLogin(message) {
        alert(message);
        window.location.href = 'index.html';
    }

    // Redirecionar para home
    redirectToHome(message) {
        alert(message);
        window.location.href = 'index.html';
    }

    // Mostrar conteúdo da página
    showPageContent() {
        // Remove a classe hidden do body ou main content se existir
        const body = document.body;
        const mainContent = document.querySelector('main');
        
        if (body.classList.contains('hidden')) {
            body.classList.remove('hidden');
        }
        
        if (mainContent && mainContent.classList.contains('hidden')) {
            mainContent.classList.remove('hidden');
        }

        // Adiciona classe para indicar que o usuário é um guia autenticado
        body.classList.add('guide-authenticated');
    }

    // Verificar se o usuário atual é um guia
    static isGuide() {
        const userData = localStorage.getItem('userData');
        if (!userData) return false;
        
        try {
            const user = JSON.parse(userData);
            return user.role === 'guide' || user.role === 'guia';
        } catch (error) {
            return false;
        }
    }

    // Obter dados do guia atual
    static getCurrentGuide() {
        const userData = localStorage.getItem('userData');
        if (!userData) return null;
        
        try {
            const user = JSON.parse(userData);
            if (user.role === 'guide' || user.role === 'guia') {
                return user;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

// Inicializar proteção quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar a proteção se estivermos nas páginas de guia
    if (window.location.pathname.includes('admin-expeditions.html') || 
        window.location.pathname.includes('nova-expedicao.html')) {
        console.log('Aplicando proteção de acesso para Guias...');
        new AuthGuard();
    }
});

// Função global para verificar se deve mostrar opções de guia
function shouldShowGuideOptions() {
    return AuthGuard.isGuide();
}

// Função para ocultar/mostrar elementos baseado no tipo de usuário
function toggleGuideElements() {
    const isGuide = AuthGuard.isGuide();
    
    // Elementos que só devem aparecer para guias
    const guideOnlyElements = document.querySelectorAll('.guide-only, [data-guide-only="true"]');
    
    guideOnlyElements.forEach(element => {
        if (isGuide) {
            element.style.display = '';
            element.classList.remove('hidden');
        } else {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    });

    // Links do menu de navegação
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

// Executar quando o sistema de auth for carregado
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que o auth.js foi carregado
    setTimeout(() => {
        toggleGuideElements();
    }, 100);
});

// Também executar quando o estado de autenticação mudar
window.addEventListener('storage', (e) => {
    if (e.key === 'userData') {
        toggleGuideElements();
    }
});

