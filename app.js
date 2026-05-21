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
  }, 1500);
});

function hideSplash() {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");

  splash.classList.add("fade-out");

  setTimeout(() => {
    splash.style.display = "none";
    app.classList.remove("hidden");
  }, 600);
}

// ============================================================
// CLOCK
// ============================================================
function initClock() {
  const tick = () => {
    const now = new Date();
    document.getElementById("clock").textContent =
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };
  tick();
  setInterval(tick, 10000);
}

// ============================================================
// LOAD CHANNELS (PRODUCTION READY)
// ============================================================
const API_URL = "https://proxy.rafelweb.workers.dev/";

async function loadChannels() {
  showSkeletons();

  let data = null;

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    data = await res.json();
    console.log("✔ Canales cargados");
  } catch (e) {
    console.warn("⚠️ Error API", e);
  }

  // Validación real
  if (!data || !Array.isArray(data)) {
    console.warn("⚠️ Fallback demo");

    data = [
      { name: "La 1", region: "nacional", streams: [] },
      { name: "Antena 3", region: "nacional", streams: [] },
      { name: "Telecinco", region: "nacional", streams: [] }
    ];
  }

  // Normalización (CLAVE)
  allChannels = data.map(c => ({
    name: c.name || "Sin nombre",
    logo: c.logo || "",
    region: (c.region || "").toLowerCase(),
    streams: c.streams || [],
  }));

  applyFilters();
}

// ============================================================
// RENDER
// ============================================================
function showSkeletons() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const div = document.createElement("div");
    div.className = "skeleton skeleton-card";
    grid.appendChild(div);
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
        ${c.logo ? `<img src="${c.logo}" onerror="this.style.display='none'"/>` : ""}
      </div>
      <div class="card-name">${c.name}</div>
      <div class="card-region">${c.region}</div>
    `;

    el.onclick = () => playChannel(c, i);
    grid.appendChild(el);
  });

  updateCount();
}

// ============================================================
// PLAY
// ============================================================
function playChannel(c, index) {
  currentIndex = index;

  document.getElementById("now-playing-title").textContent = c.name;
  document.getElementById("now-playing-prog").textContent = "En directo";

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
}

// ============================================================
// SEARCH + FILTERS (FIX REAL)
// ============================================================
function initSearch() {
  const input = document.getElementById("search");

  input.addEventListener("input", applyFilters);
}

function applyFilters() {
  const q = document.getElementById("search").value.toLowerCase().trim();

  filtered = allChannels.filter(c => {
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.region.includes(q);

    const matchCat =
      activeCategory === "all" ||
      categoryMatch(c, activeCategory);

    return matchSearch && matchCat;
  });

  render();
}

// ============================================================
// CATEGORY ENGINE (FIX IMPORTANTE)
// ============================================================
function categoryMatch(c, cat) {
  const name = c.name.toLowerCase();
  const region = c.region;

  switch (cat) {
    case "nacional":
      return ["la 1","la2","antena 3","telecinco","cuatro","sexta"]
        .some(k => name.includes(k));

    case "noticias":
      return ["24h","news","noticias","cnn","bbc"]
        .some(k => name.includes(k));

    case "deportes":
      return ["sport","dazn","gol","liga"]
        .some(k => name.includes(k));

    case "infantil":
      return ["clan","disney","nick","cartoon","boing"]
        .some(k => name.includes(k));

    case "entretenimiento":
      return ["mtv","comedy","neox","fdf","energy","divinity"]
        .some(k => name.includes(k));

    case "autonómica":
      return (
        region.includes("auto") ||
        ["tv3","telemadrid","canal sur","etb"]
          .some(k => name.includes(k))
      );

    default:
      return true;
  }
}

// ============================================================
// TABS
// ============================================================
function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      activeCategory = tab.dataset.cat;
      applyFilters();
    });
  });
}

// ============================================================
// VIEW
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

// ============================================================
// PLAYER CONTROLS
// ============================================================
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

// ============================================================
// COUNT
// ============================================================
function updateCount() {
  document.getElementById("channel-count").textContent =
    `${filtered.length} canales`;
}
