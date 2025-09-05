const API_BASE_URL = 'https://p9hwiqcldgkm.manus.space/api';

/**
 * Renders the trails carousel on the homepage.
 * @param {HTMLElement} container The DOM element that will hold the carousel cards
 */
export async function renderTrailsCarousel(container) {
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/trails?limit=5`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const trails = data.trails || [];

    if (trails.length === 0) {
      container.innerHTML = '<p>Nenhuma trilha encontrada.</p>';
      return;
    }

    trails.forEach(trail => {
      container.appendChild(createTrailCard(trail));
    });

    if (window.trailImages && typeof window.trailImages.apply === 'function') {
      window.trailImages.apply();
    }

    setupNavigation(container);
  } catch (err) {
    console.error('Erro ao carregar trilhas do carrossel:', err);
    container.innerHTML = '<p>Erro ao carregar trilhas.</p>';
  }
}

function createTrailCard(trail) {
  const card = document.createElement('a');
  card.className = 'trilha-card';
  card.href = `trilha.html?id=${trail.id}`;
  card.setAttribute('data-trail-name', trail.name);

  const coverImage = window.trailImages ? window.trailImages.getCover(trail.name) : null;
  const imageAlt = window.trailImages ? window.trailImages.getAlt(trail.name) : trail.name;

  card.innerHTML = `
    <img src="${coverImage || 'images/placeholder-trail.jpg'}" alt="${imageAlt}">
    <div class="trilha-card-content">
      <h3 class="trilha-title">${trail.name}</h3>
      <p class="trilha-location"><i class="fas fa-map-marker-alt"></i> ${trail.location || ''}${trail.state ? ', ' + trail.state : ''}</p>
      <div class="trilha-stats">
        ${trail.distance ? `<div class="trilha-stat"><i class='fas fa-route'></i> ${trail.distance} km</div>` : ''}
        ${trail.duration ? `<div class="trilha-stat"><i class='fas fa-clock'></i> ${trail.duration}</div>` : ''}
      </div>
      ${trail.average_rating ? `<div class="trilha-rating"><span class="stars">${'★'.repeat(Math.round(trail.average_rating))}</span><span>${trail.average_rating.toFixed(1)}</span></div>` : ''}
    </div>
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
    const card = container.querySelector('.trilha-card');
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

export default { renderTrailsCarousel };
