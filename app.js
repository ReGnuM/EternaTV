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
// CATEGORY DETECTOR (CLAVE)
// ============================================================
function detectCategory(name = "") {
  const n = name.toLowerCase();

  if (["la 1","la 2","antena","telecinco","cuatro","sexta"].some(k => n.includes(k)))
    return "nacional";

  if (["24h","noticias","news","cnn","bbc","euronews"].some(k => n.includes(k)))
    return "noticias";

  if (["dazn","eurosport","gol","sport","liga"].some(k => n.includes(k)))
    return "deportes";

  if (["clan","disney","nick","cartoon","boing","baby"].some(k => n.includes(k)))
    return "infantil";

  if (["mtv","comedy","fox","neox","fdf","energy","divinity","paramount"].some(k => n.includes(k)))
    return "entretenimiento";

  if (["tv3","telemadrid","canal sur","etb","ib3","aragón","tvg"].some(k => n.includes(k)))
    return "autonómica";

  return "otros";
}

// ============================================================
// LOAD CHANNELS
// ============================================================
const API_URL = "https://proxy.rafelweb.workers.dev/";

async function loadChannels() {
  showSkeletons();

  let data = null;

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (e) {
    console.warn("⚠️ API error", e);
  }

  if (!data || !Array.isArray(data)) {
    data = [
      { name: "La 1", streams: [] },
      { name: "Antena 3", streams: [] },
      { name: "Telecinco", streams: [] }
    ];
  }

  // NORMALIZACIÓN + CLASIFICACIÓN
  allChannels = data.map(c => ({
    name: c.name || "Sin nombre",
    logo: c.logo || "",
    streams: c.streams || [],
    category: detectCategory(c.name || "")
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
        ${c.logo ? `<img src="${c.logo}" onerror="this.style.display='none'">` : ""}
      </div>
      <div class="card-name">${c.name}</div>
      <div class="card-region">${c.category}</div>
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
// SEARCH + FILTER
// ============================================================
function initSearch() {
  const input = document.getElementById("search");

  input.addEventListener("input", applyFilters);
}

function applyFilters() {
  const q = document.getElementById("search").value.toLowerCase().trim();

  filtered = allChannels.filter(c => {
    const matchSearch =
      !q || c.name.toLowerCase().includes(q);

    const matchCat =
      activeCategory === "all" ||
      c.category === activeCategory;

    return matchSearch && matchCat;
  });

  render();
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
