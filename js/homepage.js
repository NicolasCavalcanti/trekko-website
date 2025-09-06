// Homepage JavaScript - Trekko
// Funcionalidades principais da nova homepage

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Authentication state
let currentUser = null;
let accessToken = null;
let refreshToken = null;

// Initialize homepage
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupEventListeners();
    loadHomepageData();
});

// Check authentication state
function checkAuthState() {
    const userData = localStorage.getItem('userData');
    
    if (userData && userData !== 'null') {
        try {
            currentUser = JSON.parse(userData);
            updateUIForLoggedInUser();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            localStorage.removeItem('userData');
        }
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const navActions = document.querySelector('.nav-actions');
    if (currentUser && navActions) {
        navActions.innerHTML = `
            <div class="user-menu">
                <button class="btn btn-secondary" onclick="toggleUserDropdown()">
                    ${currentUser.name} ▼
                </button>
                <div class="user-dropdown hidden" id="userDropdown">
                    <a href="perfil.html" class="dropdown-item">Meu Perfil</a>
                    <a href="#" class="dropdown-item" onclick="logout()">Sair</a>
                </div>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Header scroll effect
    window.addEventListener('scroll', handleScroll);
    
    // Close dropdowns on outside click
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && !e.target.closest('.user-menu')) {
            dropdown.classList.add('hidden');
        }
    });
}

// Handle scroll effects
function handleScroll() {
    const header = document.getElementById('header');
    const searchCompact = document.getElementById('searchCompact');
    
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
        searchCompact.classList.add('visible');
    } else {
        header.classList.remove('scrolled');
        searchCompact.classList.remove('visible');
    }
}

// Load homepage data
function loadHomepageData() {
    loadEstados();
    loadGuiasDestaque();
    loadRealCounts();
}

// Load real counts from API
async function loadRealCounts() {
    try {
        // Load trilhas count
        const trilhasResponse = await fetch('http://localhost:5000/api/trails?limit=1');
        
        if (trilhasResponse.ok) {
            const trilhasData = await trilhasResponse.json();
            
            if (trilhasData && trilhasData.total) {
                const trilhasCount = trilhasData.total;
                const trilhasElement = document.getElementById('trilhasCount');
                if (trilhasElement) {
                    trilhasElement.textContent = `${trilhasCount}+`;
                }
                console.log(`📊 Trilhas catalogadas: ${trilhasCount}`);
            }
        }
        
        // Load guias count  
        const guiasResponse = await fetch('http://localhost:5000/api/guides?limit=1');
        
        if (guiasResponse.ok) {
            const guiasData = await guiasResponse.json();
            
            if (guiasData && guiasData.total) {
                const guiasCount = guiasData.total;
                const guiasElement = document.getElementById('guiasCount');
                if (guiasElement) {
                    guiasElement.textContent = `${guiasCount}+`;
                }
                console.log(`👨‍🦯 Guias CADASTUR: ${guiasCount}`);
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar contadores:', error);
        // Keep fallback values if API fails
    }
}

// Estados data and functions - TODOS OS ESTADOS BRASILEIROS
const estadosData = [
    { nome: 'Acre', sigla: 'AC', trilhas: 0, imagem: 'images/estados/acre.jpg', trilha_destaque: 'Serra do Divisor' },
    { nome: 'Alagoas', sigla: 'AL', trilhas: 0, imagem: 'images/estados/alagoas.jpg', trilha_destaque: 'Cânion do Xingó' },
    { nome: 'Amapá', sigla: 'AP', trilhas: 0, imagem: 'images/estados/amapa.jpg', trilha_destaque: 'Fortaleza de São José' },
    { nome: 'Amazonas', sigla: 'AM', trilhas: 0, imagem: 'images/estados/amazonas.jpg', trilha_destaque: 'Pico da Neblina' },
    { nome: 'Bahia', sigla: 'BA', trilhas: 0, imagem: 'images/estados/bahia.jpg', trilha_destaque: 'Vale do Pati' },
    { nome: 'Ceará', sigla: 'CE', trilhas: 0, imagem: 'images/estados/ceara.jpg', trilha_destaque: 'Pico da Ibiapaba' },
    { nome: 'Distrito Federal', sigla: 'DF', trilhas: 0, imagem: 'images/estados/distrito-federal.jpg', trilha_destaque: 'Parque Nacional de Brasília' },
    { nome: 'Espírito Santo', sigla: 'ES', trilhas: 0, imagem: 'images/estados/espirito-santo.jpg', trilha_destaque: 'Pedra Azul' },
    { nome: 'Goiás', sigla: 'GO', trilhas: 0, imagem: 'images/estados/goias.jpg', trilha_destaque: 'Chapada dos Veadeiros' },
    { nome: 'Maranhão', sigla: 'MA', trilhas: 0, imagem: 'images/estados/maranhao.jpg', trilha_destaque: 'Lençóis Maranhenses' },
    { nome: 'Mato Grosso', sigla: 'MT', trilhas: 0, imagem: 'images/estados/mato-grosso.jpg', trilha_destaque: 'Chapada dos Guimarães' },
    { nome: 'Mato Grosso do Sul', sigla: 'MS', trilhas: 0, imagem: 'images/estados/mato-grosso-sul.jpg', trilha_destaque: 'Serra da Bodoquena' },
    { nome: 'Minas Gerais', sigla: 'MG', trilhas: 0, imagem: 'images/estados/minas-gerais.jpg', trilha_destaque: 'Pico da Bandeira' },
    { nome: 'Pará', sigla: 'PA', trilhas: 0, imagem: 'images/estados/para.jpg', trilha_destaque: 'Serra dos Carajás' },
    { nome: 'Paraíba', sigla: 'PB', trilhas: 0, imagem: 'images/estados/paraiba.jpg', trilha_destaque: 'Pico do Jabre' },
    { nome: 'Paraná', sigla: 'PR', trilhas: 0, imagem: 'images/estados/parana.jpg', trilha_destaque: 'Pico Paraná' },
    { nome: 'Pernambuco', sigla: 'PE', trilhas: 0, imagem: 'images/estados/pernambuco.jpg', trilha_destaque: 'Serra do Catimbau' },
    { nome: 'Piauí', sigla: 'PI', trilhas: 0, imagem: 'images/estados/piaui.jpg', trilha_destaque: 'Serra da Capivara' },
    { nome: 'Rio de Janeiro', sigla: 'RJ', trilhas: 0, imagem: 'images/estados/rio-de-janeiro.jpg', trilha_destaque: 'Pedra Bonita' },
    { nome: 'Rio Grande do Norte', sigla: 'RN', trilhas: 0, imagem: 'images/estados/rio-grande-norte.jpg', trilha_destaque: 'Pico do Cabugi' },
    { nome: 'Rio Grande do Sul', sigla: 'RS', trilhas: 0, imagem: 'images/estados/rio-grande-sul.jpg', trilha_destaque: 'Aparados da Serra' },
    { nome: 'Rondônia', sigla: 'RO', trilhas: 0, imagem: 'images/estados/rondonia.jpg', trilha_destaque: 'Parque Nacional de Pacaás Novos' },
    { nome: 'Roraima', sigla: 'RR', trilhas: 0, imagem: 'images/estados/roraima.jpg', trilha_destaque: 'Monte Roraima' },
    { nome: 'Santa Catarina', sigla: 'SC', trilhas: 0, imagem: 'images/estados/santa-catarina.jpg', trilha_destaque: 'Morro da Igreja' },
    { nome: 'São Paulo', sigla: 'SP', trilhas: 0, imagem: 'images/estados/sao-paulo.webp', trilha_destaque: 'Pico dos Marins' },
    { nome: 'Sergipe', sigla: 'SE', trilhas: 0, imagem: 'images/estados/sergipe.jpg', trilha_destaque: 'Serra de Itabaiana' },
    { nome: 'Tocantins', sigla: 'TO', trilhas: 0, imagem: 'images/estados/tocantins.jpg', trilha_destaque: 'Jalapão' }
];

async function loadEstados() {
    const grid = document.getElementById('estadosGrid');
    if (!grid) return;

    // Show loading state for all states initially
    grid.innerHTML = '<div class="loading-states" style="text-align: center; padding: 2rem; color: #666;">Carregando estados com trilhas...</div>';

    const estadosComTrilhas = [];

    // Load real counts for each state
    for (const estado of estadosData) {
        try {
            // Get actual trails for this state to count them correctly
            const response = await fetch(`http://localhost:5000/api/trails?uf=${estado.sigla}&limit=1000`);
            
            if (!response.ok) {
                console.warn(`API response not ok for ${estado.sigla}:`, response.status);
                continue;
            }
            
            const data = await response.json();
            
            let trilhasCount = 0;
            if (data && data.trails && Array.isArray(data.trails)) {
                // Filter trails that actually belong to this state
                const trilhasDoEstado = data.trails.filter(trilha => {
                    const uf = trilha.uf || trilha.state || trilha.estado || '';
                    return uf.toUpperCase() === estado.sigla.toUpperCase();
                });
                trilhasCount = trilhasDoEstado.length;
            }
            
            console.log(`📊 ${estado.nome} (${estado.sigla}): ${trilhasCount} trilhas`);
            
            // Only add states with trails > 0
            if (trilhasCount > 0) {
                estadosComTrilhas.push({
                    ...estado,
                    trilhas: trilhasCount
                });
            }
            
        } catch (error) {
            console.error(`Erro ao carregar trilhas de ${estado.nome}:`, error);
            // Continue with next state
        }
    }

    // Sort states by number of trails (descending)
    estadosComTrilhas.sort((a, b) => b.trilhas - a.trilhas);

    // Render only states with trails
    if (estadosComTrilhas.length > 0) {
        grid.innerHTML = estadosComTrilhas.map(estado => `
            <div class="estado-card" onclick="filterByEstado('${estado.sigla}')">
                <img src="${estado.imagem}" alt="${estado.nome}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop&q=80'">
                <div class="estado-info">
                    <h3>${estado.nome}</h3>
                </div>
            </div>
        `).join('');
    } else {
        // Fallback to original states if API completely fails
        const fallbackStates = [
            { nome: 'São Paulo', sigla: 'SP', imagem: 'images/estados/sao-paulo.webp' },
            { nome: 'Rio de Janeiro', sigla: 'RJ', imagem: 'images/estados/rio-de-janeiro.jpg' },
            { nome: 'Minas Gerais', sigla: 'MG', imagem: 'images/estados/minas-gerais.jpg' }
        ];
        
        grid.innerHTML = fallbackStates.map(estado => `
            <div class="estado-card" onclick="filterByEstado('${estado.sigla}')">
                <img src="${estado.imagem}" alt="${estado.nome}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop&q=80'">
                <div class="estado-info">
                    <h3>${estado.nome}</h3>
                </div>
            </div>
        `).join('');
    }

    console.log(`🎯 Estados com trilhas: ${estadosComTrilhas.length}`);
}


// Guias em destaque
async function loadGuiasDestaque() {
    const grid = document.getElementById('guiasGrid');
    if (!grid) return;
    
    try {
        // Try to load from API
        const response = await fetch(`${API_BASE_URL}/guides?limit=4`);
        let guias = [];
        
        if (response.ok) {
            const data = await response.json();
            guias = data.guides || data || [];
        }
        
        // Fallback to static data
        if (guias.length === 0) {
            guias = [
                {
                    name: 'Carlos Silva',
                    location: 'Serra da Mantiqueira, MG',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
                    languages: ['Português', 'Inglês'],
                    average_rating: 0.0,
                    total_reviews: 0,
                    cadastur_certified: true
                },
                {
                    name: 'Ana Costa',
                    location: 'Chapada Diamantina, BA',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face',
                    languages: ['Português', 'Espanhol'],
                    average_rating: 0.0,
                    total_reviews: 0,
                    cadastur_certified: true
                },
                {
                    name: 'Pedro Montanha',
                    location: 'Serra dos Órgãos, RJ',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
                    languages: ['Português', 'Inglês', 'Francês'],
                    average_rating: 0.0,
                    total_reviews: 0,
                    cadastur_certified: true
                },
                {
                    name: 'Lucia Aventura',
                    location: 'Campos do Jordão, SP',
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
                    languages: ['Português'],
                    average_rating: 0.0,
                    total_reviews: 0,
                    cadastur_certified: true
                }
            ];
        }

        // Clean data for initial state
        guias = guias.map(guia => ({
            ...guia,
            average_rating: 0.0,
            total_reviews: 0
        }));

        grid.innerHTML = guias.slice(0, 4).map(guia => `
            <div class="guia-card fade-in" onclick="viewGuia('${guia.name}')">
                <img src="${guia.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face'}" alt="${guia.name}" class="guia-avatar">
                <h3 class="guia-name">${guia.name}</h3>
                <p class="guia-location">📍 ${guia.location || guia.city + ', ' + guia.state}</p>
                <div class="guia-badges">
                    ${guia.cadastur_certified ? '<span class="badge cadastur">CADASTUR</span>' : ''}
                    ${(guia.languages || ['Português']).map(idioma => `<span class="badge">${idioma}</span>`).join('')}
                </div>
                <div class="trilha-rating">
                    <span class="stars">⭐ ${guia.average_rating}</span>
                    <span>(${guia.total_reviews} avaliações)</span>
                </div>
                <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Conversar com guia</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar guias:', error);
    }
}

// Search functions
function searchTrilhas() {
    const destino = document.getElementById('destinoInput').value;
    const data = document.getElementById('dataInput').value;
    const pessoas = document.getElementById('pessoasInput').value;
    
    // GA4 event
    gtag('event', 'search_submit', {
        search_term: destino,
        date: data,
        people_count: pessoas
    });
    
    // Redirect to trilhas page with filters
    const params = new URLSearchParams();
    if (destino) params.append('destino', destino);
    if (data) params.append('data', data);
    if (pessoas) params.append('pessoas', pessoas);
    
    window.location.href = `/trilhas.html?${params.toString()}`;
}

function performSearch() {
    // Get search values from new filter fields
    const searchInput = document.getElementById('searchInput')?.value || '';
    const estado = document.getElementById('estadoSelect')?.value || '';
    const dificuldade = document.getElementById('dificuldadeSelect')?.value || '';
    const distancia = document.getElementById('distanciaInput')?.value || '';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (searchInput) params.append('search', searchInput);
    if (estado) params.append('estado', estado);
    if (dificuldade) params.append('dificuldade', dificuldade);
    if (distancia) params.append('distancia', distancia);
    
    // Redirect to trilhas page with filters
    const queryString = params.toString();
    const url = queryString ? `trilhas.html?${queryString}` : 'trilhas.html';
    
    // Track GA4 event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'search_submit', {
            search_term: searchInput,
            estado: estado,
            dificuldade: dificuldade,
            distancia: distancia
        });
    }
    
    console.log('🔍 Realizando busca com filtros:', { searchInput, estado, dificuldade, distancia });
    window.location.href = url;
}

function filterByEstado(sigla) {
    // GA4 event tracking
    gtag('event', 'filter_apply', { 
        filter_type: 'estado', 
        filter_value: sigla,
        event_category: 'navigation',
        event_label: `Estado: ${sigla}`
    });
    
    // Redirecionar para página de trilhas com filtro aplicado
    const trilhasUrl = new URL('/trilhas.html', window.location.origin);
    trilhasUrl.searchParams.set('estado', sigla);
    
    // Adicionar parâmetros para melhor UX
    trilhasUrl.searchParams.set('filtro_aplicado', 'estado');
    trilhasUrl.searchParams.set('origem', 'homepage');
    
    console.log(`🔍 Redirecionando para trilhas do estado: ${sigla}`);
    console.log(`📍 URL: ${trilhasUrl.toString()}`);
    
    // Redirecionar
    window.location.href = trilhasUrl.toString();
}

function viewTrilha(nome) {
    gtag('event', 'trail_card_click', { trail_name: nome });
    window.location.href = `/trilha.html?nome=${encodeURIComponent(nome)}`;
}

function viewGuia(nome) {
    gtag('event', 'guide_contact_click', { guide_name: nome });
    window.location.href = `/guia.html?nome=${encodeURIComponent(nome)}`;
}

// Newsletter
function submitNewsletter(event) {
    event.preventDefault();
    const nome = document.getElementById('newsletterNome').value;
    const email = document.getElementById('newsletterEmail').value;
    
    gtag('event', 'lead_submit', {
        method: 'newsletter',
        name: nome,
        email: email
    });
    
    // Show success message
    alert('Obrigado! Você receberá nossas melhores trilhas em breve.');
    event.target.reset();
}

// Modal functions
function openModal(type) {
    gtag('event', 'modal_open', { modal_type: type });
    
    if (type === 'login') {
        showLoginModal();
    } else if (type === 'cadastro') {
        showRegisterModal();
    } else if (type === 'guia') {
        showGuideModal();
    }
}

function showLoginModal() {
    // Create and show login modal
    const modal = createModal('login', 'Entrar na Trekko', `
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
                <label for="loginPassword">Senha</label>
                <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="btn btn-primary full-width">Entrar</button>
        </form>
        <p class="text-center mt-4">
            Não tem conta? <a href="#" onclick="closeModal('login'); openModal('cadastro');">Cadastre-se</a>
        </p>
    `);
    document.body.appendChild(modal);
}

function showRegisterModal() {
    // Create and show register modal
    const modal = createModal('cadastro', 'Cadastrar na Trekko', `
        <form id="registerForm" onsubmit="handleRegister(event)">
            <div class="form-group">
                <label for="registerName">Nome Completo</label>
                <input type="text" id="registerName" required>
            </div>
            <div class="form-group">
                <label for="registerEmail">Email</label>
                <input type="email" id="registerEmail" required>
            </div>
            <div class="form-group">
                <label for="registerPassword">Senha</label>
                <input type="password" id="registerPassword" required>
            </div>
            <div class="form-group">
                <label for="registerUserType">Tipo de Usuário</label>
                <select id="registerUserType" required>
                    <option value="">Selecione...</option>
                    <option value="trekker">🥾 Trekker (Usuário)</option>
                    <option value="guia">🧭 Guia Profissional</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary full-width">Cadastrar</button>
        </form>
        <p class="text-center mt-4">
            Já tem conta? <a href="#" onclick="closeModal('cadastro'); openModal('login');">Faça login</a>
        </p>
    `);
    document.body.appendChild(modal);
}

function showGuideModal() {
    // Redirect to guide registration
    window.location.href = '/guias.html#cadastro';
}

function createModal(id, title, content) {
    const modal = document.createElement('div');
    modal.id = `modal-${id}`;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button onclick="closeModal('${id}')" class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(id);
        }
    });
    
    return modal;
}

function closeModal(id) {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) {
        modal.remove();
    }
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            accessToken = data.access_token;
            
            localStorage.setItem('userData', JSON.stringify(currentUser));
            localStorage.setItem('accessToken', accessToken);
            
            gtag('event', 'login', { method: 'email' });
            
            closeModal('login');
            updateUIForLoggedInUser();
            
            alert('Login realizado com sucesso!');
        } else {
            alert('Email ou senha incorretos.');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const userType = document.getElementById('registerUserType').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                user_type: userType
            })
        });
        
        if (response.ok) {
            gtag('event', 'sign_up', { method: 'email' });
            
            closeModal('cadastro');
            alert('Cadastro realizado com sucesso! Faça login para continuar.');
            openModal('login');
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao cadastrar. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        alert('Erro ao cadastrar. Tente novamente.');
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function logout() {
    currentUser = null;
    accessToken = null;
    
    localStorage.removeItem('userData');
    localStorage.removeItem('accessToken');
    
    gtag('event', 'logout');
    
    // Reload page to reset UI
    window.location.reload();
}

// Animation and scroll effects
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = Math.random() * 0.3 + 's';
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all cards
    setTimeout(() => {
        document.querySelectorAll('.estado-card, .trilha-card, .guia-card, .step, .depoimento, .conteudo-card').forEach(el => {
            observer.observe(el);
        });
    }, 100);
}

// Auto-rotate depoimentos
function initializeCarousel() {
    let depoimentoIndex = 0;
    setInterval(() => {
        const container = document.getElementById('depoimentosContainer');
        if (container && container.children.length > 0) {
            depoimentoIndex = (depoimentoIndex + 1) % container.children.length;
            container.style.transform = `translateX(-${depoimentoIndex * 370}px)`;
        }
    }, 5000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    initializeCarousel();
});

// Add modal styles
const modalStyles = `
<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.modal-content {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.modal-header h2 {
    margin: 0;
    color: var(--cinza-grafite);
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--cinza-grafite);
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-size: 1rem;
    outline: none;
}

.form-group input:focus,
.form-group select:focus {
    border-color: var(--verde-floresta);
    box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.1);
}

.full-width {
    width: 100%;
}

.text-center {
    text-align: center;
}

.mt-4 {
    margin-top: 1rem;
}

.user-menu {
    position: relative;
}

.user-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    padding: 0.5rem 0;
    min-width: 150px;
    z-index: 1000;
}

.dropdown-item {
    display: block;
    padding: 0.5rem 1rem;
    color: var(--cinza-grafite);
    text-decoration: none;
    transition: background-color 0.3s ease;
}

.dropdown-item:hover {
    background-color: var(--cinza-claro);
}

.hidden {
    display: none;
}
</style>
`;

// Add styles to head
document.head.insertAdjacentHTML('beforeend', modalStyles);



// ========================================
// MAPA INTERATIVO - TRILHAS PRÓXIMAS
// ========================================

let map;
let userMarker;
let trailMarkers = [];
let userLocation = null;

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
});

// Initialize the interactive map
function initializeMap() {
    // Create map centered on Brazil
    map = L.map('map').setView([-15.7801, -47.9292], 4);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Request user location
    requestUserLocation();
}

// Request user's current location
function requestUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            onLocationSuccess,
            onLocationError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    } else {
        onLocationError(new Error('Geolocation not supported'));
    }
}

// Handle successful location retrieval
function onLocationSuccess(position) {
    userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    console.log('📍 Localização do usuário:', userLocation);
    
    // Center map on user location
    map.setView([userLocation.lat, userLocation.lng], 8);
    
    // Add user marker
    userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background: #2D6A4F; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">📍</div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        })
    }).addTo(map);
    
    userMarker.bindPopup('<b>Sua localização</b><br>Trilhas próximas em um raio de 300km').openPopup();
    
    // Load nearby trails
    loadNearbyTrails();
}

// Handle location error
function onLocationError(error) {
    console.warn('❌ Erro ao obter localização:', error.message);
    
    // Show message on map
    const errorMessage = L.popup()
        .setLatLng([-15.7801, -47.9292])
        .setContent('<b>Localização não disponível</b><br>Mostrando todas as trilhas do Brasil')
        .openOn(map);
    
    // Load all trails instead
    loadAllTrails();
}

// Load trails near user location (300km radius)
async function loadNearbyTrails() {
    if (!userLocation) return;
    
    try {
        console.log('🔍 Buscando trilhas próximas...');
        
        // Fetch all trails from API
        const response = await fetch('http://localhost:5000/api/trails?limit=1000');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const trails = data.trails || data || [];
        
        console.log(`📊 Total de trilhas encontradas: ${trails.length}`);
        
        // Filter trails within 300km radius
        const nearbyTrails = trails.filter(trail => {
            if (!trail.latitude || !trail.longitude) return false;
            
            const distance = calculateDistance(
                userLocation.lat, 
                userLocation.lng, 
                parseFloat(trail.latitude), 
                parseFloat(trail.longitude)
            );
            
            return distance <= 300; // 300km radius
        });
        
        console.log(`🎯 Trilhas próximas (300km): ${nearbyTrails.length}`);
        
        // Add trail markers to map
        addTrailMarkers(nearbyTrails);
        
    } catch (error) {
        console.error('❌ Erro ao carregar trilhas próximas:', error);
        loadAllTrails(); // Fallback to all trails
    }
}

// Load all trails if location is not available
async function loadAllTrails() {
    try {
        console.log('🔍 Carregando todas as trilhas...');
        
        const response = await fetch('http://localhost:5000/api/trails?limit=100');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const trails = data.trails || data || [];
        
        console.log(`📊 Total de trilhas carregadas: ${trails.length}`);
        
        // Add all trail markers
        addTrailMarkers(trails);
        
    } catch (error) {
        console.error('❌ Erro ao carregar trilhas:', error);
    }
}

// Add trail markers to the map
function addTrailMarkers(trails) {
    // Clear existing trail markers
    trailMarkers.forEach(marker => map.removeLayer(marker));
    trailMarkers = [];
    
    trails.forEach(trail => {
        if (!trail.latitude || !trail.longitude) return;
        
        const lat = parseFloat(trail.latitude);
        const lng = parseFloat(trail.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        // Create custom trail marker
        const trailMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'trail-marker',
                html: '<div style="background: #7C4B2A; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🥾</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        });
        
        // Create popup content
        const distance = userLocation ? 
            calculateDistance(userLocation.lat, userLocation.lng, lat, lng) : null;
        
        const popupContent = `
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: #2D6A4F; font-size: 14px; font-weight: bold;">${trail.name}</h3>
                <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${trail.city}, ${trail.uf}</p>
                ${trail.difficulty ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">🏔️ ${trail.difficulty}</p>` : ''}
                ${trail.distance ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">📏 ${trail.distance} km</p>` : ''}
                ${distance ? `<p style="margin: 4px 0; font-size: 12px; color: #2D6A4F; font-weight: bold;">📍 ${Math.round(distance)} km de você</p>` : ''}
                <button onclick="viewTrailDetails('${trail.id || trail.name}')" style="background: #2D6A4F; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 8px;">Ver Detalhes</button>
            </div>
        `;
        
        trailMarker.bindPopup(popupContent);
        
        // Add hover effect
        trailMarker.on('mouseover', function() {
            this.openPopup();
        });
        
        trailMarker.addTo(map);
        trailMarkers.push(trailMarker);
    });
    
    console.log(`🗺️ ${trailMarkers.length} marcadores adicionados ao mapa`);
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// View trail details
function viewTrailDetails(trailId) {
    window.open(`trilha.html?id=${trailId}`, '_blank');
}

// Add custom CSS for map markers
const mapStyles = document.createElement('style');
mapStyles.textContent = `
    .trail-marker {
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    
    .trail-marker:hover {
        transform: scale(1.2);
    }
    
    .user-location-marker {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.8;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    .leaflet-popup-content-wrapper {
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .leaflet-popup-content {
        margin: 12px;
        line-height: 1.4;
    }
`;
document.head.appendChild(mapStyles);

