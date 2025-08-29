// Sistema de Imagens das Trilhas
const trailImages = {
    // Trilha da Pedra Bonita - Rio de Janeiro
    'trilha-da-pedra-bonita': {
        cover: 'images/trilhas/pedra-bonita-1.jpg', // 246KB - Melhor resolução
        gallery: [
            'images/trilhas/pedra-bonita-1.jpg',
            'images/trilhas/pedra-bonita-2.jpg',
            'images/trilhas/pedra-bonita-3.jpg'
        ],
        alt: 'Trilha da Pedra Bonita - Rio de Janeiro'
    },
    
    // Pico da Bandeira - Alto Caparaó, MG
    'pico-da-bandeira': {
        cover: 'images/trilhas/pico-bandeira-1.jpg', // 182KB - Melhor resolução
        gallery: [
            'images/trilhas/pico-bandeira-1.jpg',
            'images/trilhas/pico-bandeira-2.jpg',
            'images/trilhas/pico-bandeira-3.jpg'
        ],
        alt: 'Pico da Bandeira - Alto Caparaó, MG'
    },
    
    // Travessia da Serra Fina - Minas Gerais
    'travessia-serra-fina': {
        cover: 'images/trilhas/serra-fina-1.jpg', // 550KB - Melhor resolução
        gallery: [
            'images/trilhas/serra-fina-1.jpg',
            'images/trilhas/serra-fina-2.jpg',
            'images/trilhas/serra-fina-3.jpg'
        ],
        alt: 'Travessia da Serra Fina - Minas Gerais'
    },
    
    // Pico dos Três Estados - Minas Gerais ✅ NOVO
    'pico-dos-tres-estados': {
        cover: 'images/trilhas/tres-estados-1.jpg', // 201KB - Melhor resolução
        gallery: [
            'images/trilhas/tres-estados-1.jpg',
            'images/trilhas/tres-estados-2.jpg',
            'images/trilhas/tres-estados-3.jpg'
        ],
        alt: 'Pico dos Três Estados - Minas Gerais'
    },
    
    // Travessia Petrópolis-Teresópolis - Rio de Janeiro ✅ NOVO
    'travessia-petropolis-teresopolis': {
        cover: 'images/trilhas/petropolis-teresopolis-1.jpg', // 173KB - Melhor resolução
        gallery: [
            'images/trilhas/petropolis-teresopolis-1.jpg',
            'images/trilhas/petropolis-teresopolis-2.jpg',
            'images/trilhas/petropolis-teresopolis-3.jpg'
        ],
        alt: 'Travessia Petrópolis-Teresópolis - Rio de Janeiro'
    },
    
    // Pico das Agulhas Negras - Itamonte, MG ✅ NOVO
    'pico-das-agulhas-negras': {
        cover: 'images/trilhas/agulhas-negras-1.jpg', // 2.4MB - Melhor resolução
        gallery: [
            'images/trilhas/agulhas-negras-1.jpg',
            'images/trilhas/agulhas-negras-2.jpg',
            'images/trilhas/agulhas-negras-3.jpg'
        ],
        alt: 'Pico das Agulhas Negras - Itamonte, MG'
    },
    
    // Pico do Marins - Piquete, SP ✅ NOVO
    'pico-do-marins': {
        cover: 'images/trilhas/pico-marins-1.jpg', // 1.3MB - Melhor resolução
        gallery: [
            'images/trilhas/pico-marins-1.jpg',
            'images/trilhas/pico-marins-2.jpg',
            'images/trilhas/pico-marins-3.jpg'
        ],
        alt: 'Pico do Marins - Piquete, SP'
    },
    
    // Monte Roraima - Santa Elena de Uairén, RR ✅ NOVO
    'monte-roraima': {
        cover: 'images/trilhas/monte-roraima-1.jpg', // 286KB - Melhor resolução
        gallery: [
            'images/trilhas/monte-roraima-1.jpg',
            'images/trilhas/monte-roraima-2.jpg',
            'images/trilhas/monte-roraima-3.jpg'
        ],
        alt: 'Monte Roraima - Santa Elena de Uairén, RR'
    },
    
    // Pico Pedra da Mina - Passa Quatro, MG ✅ NOVO
    'pico-pedra-da-mina': {
        cover: 'images/trilhas/pedra-mina-1.jpg', // 2.5MB - Melhor resolução
        gallery: [
            'images/trilhas/pedra-mina-1.jpg',
            'images/trilhas/pedra-mina-2.jpg',
            'images/trilhas/pedra-mina-3.jpg'
        ],
        alt: 'Pico Pedra da Mina - Passa Quatro, MG'
    },
    
    // Pico do Cristal - Alto Caparaó, MG ✅ NOVO
    'pico-do-cristal': {
        cover: 'images/trilhas/pico-cristal-1.jpg', // 1.0MB - Melhor resolução
        gallery: [
            'images/trilhas/pico-cristal-1.jpg',
            'images/trilhas/pico-cristal-2.jpg',
            'images/trilhas/pico-cristal-3.jpg'
        ],
        alt: 'Pico do Cristal - Alto Caparaó, MG'
    },
    
    // Travessia Marins-Itaguaré - Piquete, SP ✅ NOVO
    'travessia-marins-itaguare': {
        cover: 'images/trilhas/marins-itaguare-1.jpg', // 2.6MB - Melhor resolução
        gallery: [
            'images/trilhas/marins-itaguare-1.jpg',
            'images/trilhas/marins-itaguare-2.jpg',
            'images/trilhas/marins-itaguare-3.jpg'
        ],
        alt: 'Travessia Marins-Itaguaré - Piquete, SP'
    },
    
    // Pico da Neblina - São Gabriel da Cachoeira, AM ✅ NOVO
    'pico-da-neblina': {
        cover: 'images/trilhas/pico-neblina-1.jpg', // 1.9MB - Melhor resolução
        gallery: [
            'images/trilhas/pico-neblina-1.jpg',
            'images/trilhas/pico-neblina-2.jpg',
            'images/trilhas/pico-neblina-3.jpg'
        ],
        alt: 'Pico da Neblina - São Gabriel da Cachoeira, AM'
    },
    
    // Morro do Elefante - São Paulo ✅ NOVO
    'morro-do-elefante': {
        cover: 'images/trilhas/morro-elefante-1.jpg', // 1.3MB - Melhor resolução
        gallery: [
            'images/trilhas/morro-elefante-1.jpg',
            'images/trilhas/morro-elefante-2.jpg',
            'images/trilhas/morro-elefante-3.jpg'
        ],
        alt: 'Morro do Elefante - São Paulo'
    },
    
    // Trilha das Sete Praias - Ubatuba, SP ✅ NOVO
    'trilha-das-sete-praias': {
        cover: 'images/trilhas/sete-praias-1.jpg', // 1.1MB - Melhor resolução
        gallery: [
            'images/trilhas/sete-praias-1.jpg',
            'images/trilhas/sete-praias-2.jpg',
            'images/trilhas/sete-praias-3.jpg'
        ],
        alt: 'Trilha das Sete Praias - Ubatuba, SP'
    },
    
    // Trilha do Bonete - Ilhabela, SP ✅ NOVO
    'trilha-do-bonete': {
        cover: 'images/trilhas/trilha-bonete-1.jpg', // 2.2MB - Melhor resolução
        gallery: [
            'images/trilhas/trilha-bonete-1.jpg',
            'images/trilhas/trilha-bonete-2.jpg',
            'images/trilhas/trilha-bonete-3.jpg'
        ],
        alt: 'Trilha do Bonete - Ilhabela, SP'
    },
    
    // Trilha do Cotia - Ubatuba, SP ✅ NOVO
    'trilha-do-cotia': {
        cover: 'images/trilhas/trilha-cotia-1.jpg', // 1.3MB - Melhor resolução
        gallery: [
            'images/trilhas/trilha-cotia-1.jpg',
            'images/trilhas/trilha-cotia-2.jpg',
            'images/trilhas/trilha-cotia-3.jpg'
        ],
        alt: 'Trilha do Cotia - Ubatuba, SP'
    },
    
    // Trilha da Cachoeira do Tabuleiro - MG ✅ NOVO
    'trilha-da-cachoeira-do-tabuleiro': {
        cover: 'images/trilhas/cachoeira-tabuleiro-1.jpg', // 1.3MB - Melhor resolução
        gallery: [
            'images/trilhas/cachoeira-tabuleiro-1.jpg',
            'images/trilhas/cachoeira-tabuleiro-2.jpg',
            'images/trilhas/cachoeira-tabuleiro-3.jpg'
        ],
        alt: 'Trilha da Cachoeira do Tabuleiro - MG'
    },
    
    // Trilha do Pico do Itacolomi - Ouro Preto, MG ✅ NOVO
    'trilha-do-pico-do-itacolomi': {
        cover: 'images/trilhas/pico-itacolomi-1.jpg', // 3.4MB - Melhor resolução
        gallery: [
            'images/trilhas/pico-itacolomi-1.jpg',
            'images/trilhas/pico-itacolomi-2.jpg',
            'images/trilhas/pico-itacolomi-3.jpg'
        ],
        alt: 'Trilha do Pico do Itacolomi - Ouro Preto, MG'
    },
    
    // Trilha da Cachoeira da Fumaça - Chapada Diamantina, BA ✅ NOVO
    'trilha-da-cachoeira-da-fumaca': {
        cover: 'images/trilhas/cachoeira-fumaca-1.jpg', // 1.3MB - Melhor resolução
        gallery: [
            'images/trilhas/cachoeira-fumaca-1.jpg',
            'images/trilhas/cachoeira-fumaca-2.jpg',
            'images/trilhas/cachoeira-fumaca-3.jpg'
        ],
        alt: 'Trilha da Cachoeira da Fumaça - Chapada Diamantina, BA'
    },
    
    // Pico da Bandeira via Casa Queimada - ES ✅ NOVO
    'pico-da-bandeira-via-casa-queimada': {
        cover: 'images/trilhas/bandeira-casa-queimada-1.jpg', // 1.0MB - Melhor resolução
        gallery: [
            'images/trilhas/bandeira-casa-queimada-1.jpg',
            'images/trilhas/bandeira-casa-queimada-2.jpg',
            'images/trilhas/bandeira-casa-queimada-3.jpg'
        ],
        alt: 'Pico da Bandeira via Casa Queimada - ES'
    }
};

// Adicionar CSS para galeria
const galleryCSS = `
<style>
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

.gallery-item img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 0.5rem;
    transition: transform 0.2s, opacity 0.2s;
}

.gallery-item img:hover {
    transform: scale(1.05);
    opacity: 0.8;
}

@media (max-width: 768px) {
    .gallery-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .gallery-item img {
        height: 120px;
    }
}
</style>
`;

// Adicionar CSS ao head
if (!document.querySelector('#gallery-styles')) {
    document.head.insertAdjacentHTML('beforeend', galleryCSS.replace('<style>', '<style id="gallery-styles">'));
}

// Função para obter imagem de capa da trilha
function getTrailCoverImage(trailName) {
    const trailKey = normalizeTrailName(trailName);
    return trailImages[trailKey]?.cover || 'images/trilhas/default-trail.jpg';
}

// Função para obter galeria de imagens da trilha
function getTrailGallery(trailName) {
    const trailKey = normalizeTrailName(trailName);
    return trailImages[trailKey]?.gallery || [];
}

// Função para obter texto alternativo da imagem
function getTrailImageAlt(trailName) {
    const trailKey = normalizeTrailName(trailName);
    return trailImages[trailKey]?.alt || trailName;
}

// Função para normalizar nome da trilha para chave
function normalizeTrailName(name) {
    return name.toLowerCase()
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Função para aplicar imagens nas trilhas da página
function applyTrailImages() {
    // Aplicar em cards de trilhas
    const trailCards = document.querySelectorAll('[data-trail-name]');
    trailCards.forEach(card => {
        const trailName = card.getAttribute('data-trail-name');
        const imgElement = card.querySelector('img');
        if (imgElement && trailName) {
            imgElement.src = getTrailCoverImage(trailName);
            imgElement.alt = getTrailImageAlt(trailName);
        }
    });
    
    // Aplicar em página individual de trilha
    const trailHero = document.querySelector('.trail-hero img');
    const trailTitle = document.querySelector('.trail-title');
    if (trailHero && trailTitle) {
        const trailName = trailTitle.textContent;
        trailHero.src = getTrailCoverImage(trailName);
        trailHero.alt = getTrailImageAlt(trailName);
    }
    
    // Aplicar galeria de imagens
    const galleryContainer = document.querySelector('.trail-gallery');
    if (galleryContainer && trailTitle) {
        const trailName = trailTitle.textContent;
        const gallery = getTrailGallery(trailName);
        
        if (gallery.length > 0) {
            galleryContainer.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-900 mb-4">📸 Galeria de Fotos</h3>
                <div class="gallery-grid">
                    ${gallery.map((img, index) => `
                        <div class="gallery-item">
                            <img src="${img}" alt="${getTrailImageAlt(trailName)} - Foto ${index + 1}" 
                                 onclick="openImageModal('${img}')" class="cursor-pointer">
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
}

// Função para abrir modal de imagem
function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-full p-4">
            <img src="${imageSrc}" class="max-w-full max-h-full object-contain">
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75">
                ×
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Aplicar imagens quando a página carregar
document.addEventListener('DOMContentLoaded', applyTrailImages);

// Exportar funções para uso global
window.trailImages = {
    getCover: getTrailCoverImage,
    getGallery: getTrailGallery,
    getAlt: getTrailImageAlt,
    apply: applyTrailImages
};

