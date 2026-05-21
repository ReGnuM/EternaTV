let allChannels = [];
let filtered = [];
let currentIndex = -1;
let hls;

let activeCategory = "all";
let viewMode = "grid";

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  initClock();
  initSearch();
  initTabs();
  initViewToggle();
  initPlayerControls();

  setTimeout(async () => {
    await loadChannels();
    hideSplash();
  }, 1200);
});

function hideSplash() {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");

  splash.classList.add("fade-out");

  setTimeout(() => {
    splash.style.display = "none";
    app.classList.remove("hidden");
  }, 500);
}

// ============================================================
// CLOCK
// ============================================================
function initClock() {
  const tick = () => {
    const d = new Date();
    document.getElementById("clock").textContent =
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0");
  };

  tick();
  setInterval(tick, 10000);
}

// ============================================================
// CHANNELS LOAD (SOLO CLOUDLFARE WORKER)
// ============================================================

// IMPORTANTE: aquí YA NO llamas a Kesug directamente
const API_URL = "https://proxy.rafelweb.workers.dev/channels";

async function loadChannels() {
  showSkeletons();

  try {
    const res = await fetch(API_URL, { cache: "no-store" });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Respuesta no JSON: " + text.slice(0, 50));
    }

    allChannels = normalizeChannels(data);
    filtered = [...allChannels];

  } catch (e) {
    console.warn("⚠️ API error", e);

    allChannels = [];
    filtered = [];
  }

  updateCount();
  render();
}

// ============================================================
// NORMALIZADOR (CLAVE PARA CATEGORÍAS)
// ============================================================
function normalizeChannels(data) {
  return (data || []).map(c => ({
    name: c.name || "Sin nombre",
    logo: c.logo || "",
    region: (c.region || "").toLowerCase(),
    category: detectCategory(c),
    streams: c.streams || []
  }));
}

// 👉 AQUÍ SE ARREGLA TU PROBLEMA DE CATEGORÍAS
function detectCategory(c) {
  const name = (c.name || "").toLowerCase();
  const region = (c.region || "").toLowerCase();

  if (
    name.includes("la 1") ||
    name.includes("la 2") ||
    name.includes("antena") ||
    name.includes("telecinco") ||
    name.includes("cuatro")
  ) return "nacional";

  if (
    name.includes("24") ||
    name.includes("noticias") ||
    name.includes("news")
  ) return "noticias";

  if (
    name.includes("clan") ||
    name.includes("disney") ||
    name.includes("cartoon")
  ) return "infantil";

  if (
    name.includes("sport") ||
    name.includes("eurosport")
  ) return "deportes";

  if (
    region.includes("madrid") ||
    region.includes("cataluña") ||
    region.includes("valencia") ||
    name.includes("tve")
  ) return "autonomica";

  return "otros";
}

// ============================================================
// RENDER
// ============================================================
function showSkeletons() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const d = document.createElement("div");
    d.className = "skeleton skeleton-card";
    grid.appendChild(d);
  }
}

function render() {
  const grid = document.getElementById("grid");
  const noResults = document.getElementById("no-results");

  grid.innerHTML = "";

  if (!filtered.length) {
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");

  filtered.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "card";
    el.tabIndex = 0;

    el.innerHTML = `
      <div class="card-logo">
        ${c.logo ? `<img src="${c.logo}">` : ""}
      </div>
      <div class="card-name">${c.name}</div>
      <div class="card-region">${c.region}</div>
    `;

    el.onclick = () => play(c, i);

    grid.appendChild(el);
  });
}

// ============================================================
// PLAY
// ============================================================
function play(c, index) {
  currentIndex = index;

  document.getElementById("now-playing-title").textContent = c.name;

  const video = document.getElementById("video");
  const overlay = document.getElementById("player-overlay");

  const url = c.streams?.[0];

  if (!url) {
    overlay.classList.remove("hidden");
    return;
  }

  overlay.classList.add("hidden");

  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (url.includes(".m3u8") && window.Hls?.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  } else {
    video.src = url;
  }

  video.play().catch(() => {});

  loadEPG(c);
}

// ============================================================
// 🔥 EPG "NIVEL PRO" (SIMULADO POR CANAL PERO CONSISTENTE)
// ============================================================
function loadEPG(channel) {
  const list = document.getElementById("epg-list");
  list.innerHTML = "";

  const basePrograms = [
    "Noticias",
    "Magazine",
    "Serie",
    "Documental",
    "Deportes",
    "Cine",
    "Reality",
    "Informativo"
  ];

  const now = new Date();

  for (let i = -2; i <= 6; i++) {
    const t = new Date(now);
    t.setHours(now.getHours() + i, 0, 0, 0);

    const idx =
      (channel.name.length + t.getHours()) % basePrograms.length;

    const item = document.createElement("div");
    item.className = "epg-item";

    item.innerHTML = `
      <div class="epg-time">${String(t.getHours()).padStart(2, "0")}:00</div>
      <div class="epg-prog">${basePrograms[idx]}</div>
    `;

    list.appendChild(item);
  }
}

// ============================================================
// SEARCH + FILTERS
// ============================================================
function initSearch() {
  const input = document.getElementById("search");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();

    filtered = allChannels.filter(c =>
      c.name.toLowerCase().includes(q)
    );

    applyCategory();
  });
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");

      activeCategory = t.dataset.cat;
      applyCategory();
    };
  });
}

function applyCategory() {
  filtered = allChannels.filter(c => {
    if (activeCategory === "all") return true;
    return c.category === activeCategory;
  });

  updateCount();
  render();
}

// ============================================================
function initViewToggle() {
  document.getElementById("view-grid").onclick = () => {
    viewMode = "grid";
    document.getElementById("grid").className = "grid-view";
    render();
  };

  document.getElementById("view-list").onclick = () => {
    viewMode = "list";
    document.getElementById("grid").className = "list-view";
    render();
  };
}

function initPlayerControls() {
  const video = document.getElementById("video");

  document.getElementById("btn-mute").onclick = () => {
    video.muted = !video.muted;
  };

  document.getElementById("btn-fullscreen").onclick = () => {
    const el = document.getElementById("player-wrap");
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };
}

function updateCount() {
  document.getElementById("channel-count").textContent =
    `${filtered.length} canales`;
}
