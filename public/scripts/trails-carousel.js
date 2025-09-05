export async function renderTrailsCarousel(container) {
  const res = await fetch(`/api/trails?page=1&pageSize=12`, { cache: "no-store" });
  if (!res.ok) return;
  const { items } = await res.json();

  const fallback = (w = 320, h = 200) =>
    `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=${w}&h=${h}&fit=crop`;

  container.innerHTML = items
    .map(
      (t) => `
    <div class="trilha-card animate-fade-in-up">
      <img src="${t.coverImageUrl || fallback(400,300)}"
           alt="${t.name}"
           onerror="this.src='${fallback(320,200)}'">
      <div class="trilha-card-content">
        <h3 class="trilha-title">${t.name}</h3>
        <p class="trilha-location">
          <i class="fas fa-map-marker-alt"></i>
          ${t.city}, ${t.state}
        </p>
        <div class="trilha-stats">
          <span class="trilha-stat">
            <i class="fas fa-chart-line"></i>
            ${mapDifficulty(t.difficulty)}
          </span>
          ${t.distanceKm ? `
          <span class="trilha-stat">
            <i class="fas fa-route"></i>
            ${Number(t.distanceKm).toFixed(0)} km
          </span>` : ``}
        </div>
        ${renderRating(t)}
      </div>
    </div>
  `
    )
    .join("");
}

function mapDifficulty(d) {
  const map = { EASY: "Fácil", MODERATE: "Moderada", HARD: "Difícil", EXTREME: "Extrema" };
  return map[d] ?? "Moderada";
}

function renderRating(t) {
  if (typeof t.avgRating !== "number" || typeof t.ratingCount !== "number") return "";
  const full = Math.floor(t.avgRating);
  const half = t.avgRating - full >= 0.5;
  const stars =
    Array.from({ length: full })
      .map(() => '<i class="fas fa-star"></i>')
      .join("") + (half ? '<i class="fas fa-star-half-alt"></i>' : "");
  return `
    <div class="trilha-rating">
      <div class="stars">${stars}</div>
      <span>${t.avgRating.toFixed(1)} (${t.ratingCount} avaliações)</span>
    </div>`;
}
