const FALLBACK = (w = 250, h = 150) =>
  `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=${w}&h=${h}&fit=crop`;

function formatCount(n) {
  return `${n} trilha${n === 1 ? "" : "s"} disponível${n === 1 ? "" : "is"}`;
}

export async function renderStatesGrid(container) {
  try {
    const res = await fetch("/api/trails/states", { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao buscar estados");
    const { items } = await res.json();

    container.innerHTML = items
      .map((s) => {
        const img = s.coverImageUrl || FALLBACK();
        const destaque = s.trailName
          ? `${s.trailName}${s.trailCity ? `, ${s.trailCity}` : ""}`
          : "—";
        const alt = s.stateName;
        return `
          <div class="estado-card animate-fade-in-up">
            <img src="${img}" alt="${alt}"
                 onerror="this.src='${FALLBACK()}'">
            <div class="estado-card-content">
              <h3 class="estado-name">${s.stateName}</h3>
              <p class="estado-count">${formatCount(s.count)}</p>
              <p class="estado-destaque">${destaque}</p>
            </div>
          </div>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <div class="estado-card">
        <div class="estado-card-content">
          <p>Não foi possível carregar os estados. Tente novamente.</p>
        </div>
      </div>`;
  }
}

const mount = document.getElementById("estadosGrid");
if (mount) renderStatesGrid(mount);
