// Fetches from local API; relative path supports any deployment environment
const FALLBACK = (w = 400, h = 250) =>
  `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=${w}&h=${h}&fit=crop`;

export async function renderStatesCarousel(container) {
  if (!container) return;
  try {
    const response = await fetch('/api/trails/states', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];
    if (items.length === 0) {
      container.innerHTML = '<p>Nenhum estado encontrado.</p>';
      return;
    }

    items.forEach((state) => {
      container.appendChild(createStateCard(state));
    });

    setupNavigation(container);
  } catch (err) {
    console.error('Erro ao carregar estados do carrossel:', err);
    container.innerHTML = '<p>Erro ao carregar estados.</p>';
  }
}

function createStateCard(state) {
  const card = document.createElement('div');
  card.className = 'estado-card';
  const img = state.coverImageUrl || FALLBACK();
  const alt = state.trailName || state.stateName;
  card.innerHTML = `
    <img src="${img}" alt="${alt}" onerror="this.src='${FALLBACK()}'">
    <div class="estado-name-overlay">${state.stateName}</div>
    <div class="estado-trilha-footer">${state.trailName || ''}</div>
  `;
  return card;
}

function setupNavigation(container) {
  const wrapper = container.parentElement;
  if (!wrapper) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn carousel-prev';
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn carousel-next';
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

  wrapper.appendChild(prevBtn);
  wrapper.appendChild(nextBtn);

  let currentIndex = 0;

  function update() {
    const card = container.querySelector('.estado-card');
    if (!card) return;
    const style = window.getComputedStyle(container);
    const gap = parseInt(style.gap) || 0;
    const cardWidth = card.offsetWidth + gap;
    container.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      update();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < container.children.length - 1) {
      currentIndex++;
      update();
    }
  });
}

export default { renderStatesCarousel };

