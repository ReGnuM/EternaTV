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
  }, 2000);
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
// CHANNEL LOADER (ROBUSTO)
// ============================================================
const API_URL = "https://proxy.rafelweb.workers.dev/";

async function loadChannels() {
  showSkeletons();

  let data = null;

  // 1) DIRECTO
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
    console.log("✔ API directa OK");
  } catch (e) {
    console.warn("⚠️ API directa falló", e);
  }

  // 2) PROXY (CORS FIX)
  if (!data) {
    try {
      const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(API_URL);
      const res = await fetch(proxy, { cache: "no-store" });

      if (!res.ok) throw new Error("Proxy HTTP " + res.status);
      data = await res.json();

      console.log("✔ Proxy OK");
    } catch (e) {
      console.warn("⚠️ Proxy falló", e);
    }
  }

  // 3) FALLBACK DEMO (SI TODO FALLA)
  if (!data || !Array.isArray(data)) {
    console.warn("⚠️ Usando demo local");

    data = [
      { name: "La 1", logo: "", region: "Nacional", streams: [] },
      { name: "La 2", logo: "", region: "Nacional", streams: [] },
      { name: "Antena 3", logo: "", region: "Nacional", streams: [] },
      { name: "Cuatro", logo: "", region: "Nacional", streams: [] },
      { name: "Telecinco", logo: "", region: "Nacional", streams: [] },
      { name: "La Sexta", logo: "", region: "Nacional", streams: [] }
    ];
  }

  allChannels = data;
  filtered = [...allChannels];

  updateCount();
  render();
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
        ${c.logo ? `<img src="${c.logo}" />` : ""}
      </div>
      <div class="card-name">${c.name}</div>
      <div class="card-region">${c.region || ""}</div>
    `;

    el.onclick = () => playChannel(c, i);

    grid.appendChild(el);
  });
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
// SEARCH / FILTER
// ============================================================
function initSearch() {
  const input = document.getElementById("search");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();

    filtered = allChannels.filter(c =>
      c.name.toLowerCase().includes(q)
    );

    render();
  });
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

function applyFilters() {
  filtered = allChannels.filter(c => {
    if (activeCategory === "all") return true;
    return (c.region || "").toLowerCase().includes(activeCategory);
  });

  render();
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
