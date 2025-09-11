// Trekko Homepage JavaScript
class TrekkoHomepage {
    constructor() {
        this.currentTrilhaIndex = 0;
        this.currentDepoimentoIndex = 0;
        this.trilhas = [];
        this.guias = [];
        this.depoimentos = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
        this.setupAnimations();
        this.setupCarousels();
        // this.animateStats(); // Removed as per user request
    }

    setupEventListeners() {
        // Header scroll effect
        window.addEventListener("scroll", () => this.handleScroll());
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById("mobileMenuBtn");
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener("click", () => this.toggleMobileMenu());
        }
        
        // Search functionality
        const searchHomepageBtn = document.getElementById("searchHomepageBtn");
        if (searchHomepageBtn) {
            searchHomepageBtn.addEventListener("click", () => this.handleSearch());
        }
        
        // Newsletter form
        const newsletterForm = document.getElementById("newsletterForm");
        if (newsletterForm) {
            newsletterForm.addEventListener("submit", (e) => this.handleNewsletter(e));
        }
        
        // Smooth scrolling for navigation links
        document.querySelectorAll("a[href^=\"#\"]").forEach(link => {
            link.addEventListener("click", (e) => this.handleSmoothScroll(e));
        });
        
        // Tornar-se guia button
        const tornarGuiaBtn = document.getElementById("tornarGuiaBtn");
        if (tornarGuiaBtn) {
            tornarGuiaBtn.addEventListener("click", () => this.handleTornarGuia());
        }

        // Botões Explorar Trilhas e Encontrar Guias
        const explorarTrilhasBtn = document.getElementById("explorarTrilhasBtn");
        if (explorarTrilhasBtn) {
            explorarTrilhasBtn.addEventListener("click", () => {
                window.location.href = "trilhas.html";
            });
        }

        const encontrarGuiasBtn = document.getElementById("encontrarGuiasBtn");
        if (encontrarGuiasBtn) {
            encontrarGuiasBtn.addEventListener("click", () => {
                window.location.href = "guias.html";
            });
        }
    }

    handleScroll() {
        const header = document.getElementById("header");
        if (window.scrollY > 100) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
        
        // Animate elements on scroll
        this.animateOnScroll();
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById("navMenu");
        navMenu.classList.toggle("mobile-open");
    }

    handleSmoothScroll(e) {
        const href = e.target.getAttribute("href");
        if (href.startsWith("#")) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
    }

    handleSearch() {
        const searchInput = document.getElementById("searchInput").value;
        const estado = document.getElementById("estadoSelect").value;
        const dificuldade = document.getElementById("dificuldadeSelect").value;
        const distancia = document.getElementById("distanciaInput").value;
        
        const params = new URLSearchParams();
        if (searchInput) params.append("search", searchInput);
        if (estado) params.append("estado", estado);
        if (dificuldade) params.append("dificuldade", dificuldade);
        if (distancia) params.append("distancia", distancia);
        
        window.location.href = `trilhas.html?${params.toString()}`;
    }

    handleNewsletter(e) {
        e.preventDefault();
        const email = e.target.querySelector("input[type=\"email\"]").value;
        
        this.showNotification("Obrigado! Você foi inscrito em nossa newsletter.", "success");
        e.target.reset();
    }

    handleTornarGuia() {
        if (window.authManager) {
            window.authManager.openRegisterModal();
            setTimeout(() => {
                const userTypeSelect = document.getElementById("userType");
                if (userTypeSelect) {
                    userTypeSelect.value = "guia";
                    userTypeSelect.dispatchEvent(new Event("change"));
                }
            }, 100);
        }
    }

    loadData() {
        this.loadGuias();
        this.loadDepoimentos();
    }

    loadGuias() {
        this.guias = [
            {
                id: 1,
                name: "Carlos Silva Santos",
                location: "Rio de Janeiro, RJ",
                avatar: "images/guias/carlos-silva.jpg",
                cadastur: "27123456789",
                specialties: ["Montanha", "Trilhas"],
                rating: 4.9,
                expeditions: 127
            },
            {
                id: 2,
                name: "Maria Fernanda Oliveira",
                location: "Belo Horizonte, MG",
                avatar: "images/guias/maria-fernanda.jpg",
                cadastur: "27987654321",
                specialties: ["Cachoeiras", "Ecoturismo"],
                rating: 4.8,
                expeditions: 89
            },
            {
                id: 3,
                name: "João Pedro Montanha",
                location: "São Paulo, SP",
                avatar: "images/guias/joao-pedro.jpg",
                cadastur: "27456789123",
                specialties: ["Trekking", "Aventura"],
                rating: 4.7,
                expeditions: 156
            },
            {
                id: 4,
                name: "Ana Carolina Rocha",
                location: "Vitória, ES",
                avatar: "images/guias/ana-carolina.jpg",
                cadastur: "27789123456",
                specialties: ["Trilhas", "Natureza"],
                rating: 4.9,
                expeditions: 203
            }
        ];
        
        this.renderGuias();
    }

    loadDepoimentos() {
        this.depoimentos = [
            {
                id: 1,
                text: "Experiência incrível! O guia Carlos foi excepcional, muito conhecimento e segurança. A trilha do Pico da Bandeira foi desafiadora mas valeu cada passo.",
                author: "Marina Santos",
                location: "São Paulo, SP",
                avatar: "images/depoimentos/marina-santos.jpg",
                rating: 5
            },
            {
                id: 2,
                text: "Primeira vez fazendo uma trilha e me senti super segura com a Maria Fernanda. Ela explicou tudo sobre a natureza local e foi muito atenciosa.",
                author: "Roberto Lima",
                location: "Belo Horizonte, MG",
                avatar: "images/depoimentos/roberto-lima.jpg",
                rating: 5
            },
            {
                id: 3,
                text: "A plataforma Trekko facilitou muito encontrar um guia certificado. Recomendo para todos que querem explorar a natureza com segurança.",
                author: "Juliana Costa",
                location: "Rio de Janeiro, RJ",
                avatar: "images/depoimentos/juliana-costa.jpg",
                rating: 5
            }
        ];
        
        this.renderDepoimentos();
    }


    renderGuias() {
        const container = document.getElementById("guiasGrid");
        if (!container) return;
        
        container.innerHTML = this.guias.map(guia => `
            <div class="guia-card">
                <img src="${guia.avatar}" alt="${guia.name}" class="guia-avatar" onerror="this.src=\'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face\'"/>
                <h3 class="guia-name">${guia.name}</h3>
                <p class="guia-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${guia.location}
                </p>
                <div class="guia-badges">
                    <span class="badge cadastur">CADASTUR</span>
                    ${guia.specialties.map(specialty => `<span class="badge">${specialty}</span>`).join("")}
                </div>
                <div class="guia-stats">
                    <div class="stars">
                        ${this.generateStars(guia.rating)}
                    </div>
                    <span>${guia.rating} • ${guia.expeditions} expedições</span>
                </div>
            </div>
        `).join("");
    }

    renderDepoimentos() {
        const container = document.getElementById("depoimentosCarousel");
        const indicators = document.getElementById("depoimentosIndicators");
        
        if (!container || !indicators) return;
        
        container.innerHTML = this.depoimentos.map(depoimento => `
            <div class="depoimento">
                <p class="depoimento-text">"${depoimento.text}"</p>
                <div class="depoimento-author">
                    <img src="${depoimento.avatar}" alt="${depoimento.author}" class="author-avatar" onerror="this.src=\'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face\'"/>
                    <div class="author-info">
                        <h4>${depoimento.author}</h4>
                        <p>${depoimento.location}</p>
                        <div class="stars">
                            ${this.generateStars(depoimento.rating)}
                        </div>
                    </div>
                </div>
            </div>
        `).join("");
        
        indicators.innerHTML = this.depoimentos.map((_, index) => `
            <span class="indicator ${index === 0 ? "active" : ""}" data-index="${index}"></span>
        `).join("");
        
        indicators.querySelectorAll(".indicator").forEach(indicator => {
            indicator.addEventListener("click", (e) => {
                const index = parseInt(e.target.dataset.index);
                this.goToDepoimento(index);
            });
        });
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return [
            ...Array(fullStars).fill("<i class=\"fas fa-star\"></i>"),
            ...(hasHalfStar ? ["<i class=\"fas fa-star-half-alt\"></i>"] : []),
            ...Array(emptyStars).fill("<i class=\"far fa-star\"></i>")
        ].join("");
    }

    setupCarousels() {
        
        setInterval(() => {
            this.nextDepoimento();
        }, 5000);
    }


    nextDepoimento() {
        this.currentDepoimentoIndex = (this.currentDepoimentoIndex + 1) % this.depoimentos.length;
        this.goToDepoimento(this.currentDepoimentoIndex);
    }

    goToDepoimento(index) {
        this.currentDepoimentoIndex = index;
        
        const container = document.getElementById("depoimentosCarousel");
        const indicators = document.getElementById("depoimentosIndicators");
        
        if (!container || !indicators) return;
        
        const cardWidth = 400 + 32; 
        const translateX = -index * cardWidth;
        container.style.transform = `translateX(${translateX}px)`;
        
        indicators.querySelectorAll(".indicator").forEach((indicator, i) => {
            indicator.classList.toggle("active", i === index);
        });
    }

    animateStats() {
        const stats = document.querySelectorAll(".stat-number");
        
        const animateNumber = (element) => {
            const target = parseInt(element.dataset.count);
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(current).toLocaleString();
            }, 16);
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector(".stat-number");
                    if (statNumber && !statNumber.dataset.animated) {
                        statNumber.dataset.animated = "true";
                        animateNumber(statNumber);
                    }
                }
            });
        });
        
        const heroStats = document.querySelector(".hero-stats");
        if (heroStats) {
            observer.observe(heroStats);
        }
    }

    setupAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("animate-fade-in-up");
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });
        
        document.querySelectorAll(".step, .trilha-card, .guia-card, .estado-card").forEach(el => {
            observer.observe(el);
        });
    }

    animateOnScroll() {
        const hero = document.querySelector(".hero-background");
        if (hero) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        }
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === "success" ? "check-circle" : "info-circle"}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === "success" ? "var(--verde-sucesso)" : "var(--azul-petroleo)"};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        const closeBtn = notification.querySelector(".notification-close");
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
        `;
        
        closeBtn.addEventListener("click", () => {
            notification.remove();
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.trekkoHomepage = new TrekkoHomepage();
});

const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
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
`;
document.head.appendChild(notificationStyles);

