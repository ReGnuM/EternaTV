let allChannels = [];
let filtered = [];
let currentIndex = -1;
let hls;
let activeCategory = "all";
let viewMode = "grid"; // "grid" | "list"

// CREATORS DATA
let allCreators = [];
let creatorsStorage = "eternatv_creators";

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  initClock();
  initSearch();
  initTabs();
  initViewToggle();
  initPlayerControls();
  initCreators();

  // Splash → load
  setTimeout(async () => {
    await load();
    loadCreators();
    hideSplash();
  }, 2000);
});

function hideSplash() {
  const splash = document.getElementById("splash");
  const app    = document.getElementById("app");
  splash.classList.add("fade-out");
  setTimeout(() => {
    splash.style.display = "none";
    app.classList.remove("hidden");
  }, 700);
}

// ============================================================
// CLOCK
// ============================================================
function initClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,"0");
    const m = String(now.getMinutes()).padStart(2,"0");
    document.getElementById("clock").textContent = `${h}:${m}`;
  }
  tick();
  setInterval(tick, 10000);
}

// ============================================================
// LOAD CHANNELS
// ============================================================
async function load() {
  showSkeletons();
  try {
    const res = await fetch("/agencia/api/channels.php");
    allChannels = await res.json();
  } catch(e) {
    // Demo fallback channels if API fails
    allChannels = getDemoChannels();
  }

  filtered = [...allChannels];
  updateCount();
  render();
}

function getDemoChannels() {
  return [
    { name:"La 1",       logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/La_1_logo_2021.svg/200px-La_1_logo_2021.svg.png",         region:"Nacional", streams:[] },
    { name:"La 2",       logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/La_2_logo_2021.svg/200px-La_2_logo_2021.svg.png",         region:"Nacional", streams:[] },
    { name:"Antena 3",   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antena_3_2016.svg/200px-Antena_3_2016.svg.png",           region:"Nacional", streams:[] },
    { name:"Cuatro",     logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Cuatro_logo_2019.svg/200px-Cuatro_logo_2019.svg.png",      region:"Nacional", streams:[] },
    { name:"Telecinco",  logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Telecinco_logo_2019.svg/200px-Telecinco_logo_2019.svg.png", region:"Nacional", streams:[] },
    { name:"La Sexta",   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/La_Sexta_logo.svg/200px-La_Sexta_logo.svg.png",            region:"Nacional", streams:[] },
    { name:"24H",        logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Canal_24_Horas_2021.svg/200px-Canal_24_Horas_2021.svg.png", region:"Noticias", streams:[] },
    { name:"Clan TV",    logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Clan_2021_logo.svg/200px-Clan_2021_logo.svg.png",           region:"Infantil", streams:[] },
    { name:"TRECE",      logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Logotipo_de_Trece_2018.svg/200px-Logotipo_de_Trece_2018.svg.png", region:"Nacional", streams:[] },
    { name:"Telemadrid", logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Telemadrid_2013.svg/200px-Telemadrid_2013.svg.png",         region:"Autonómica", streams:[] },
  ];
}

// ============================================================
// RENDER
// ============================================================
function showSkeletons() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  for(let i=0;i<12;i++){
    const sk = document.createElement("div");
    sk.className = "skeleton skeleton-card";
    grid.appendChild(sk);
  }
}

function render() {
  const grid = document.getElementById("grid");
  const noRes = document.getElementById("no-results");

  grid.innerHTML = "";

  if(filtered.length === 0) {
    noRes.classList.remove("hidden");
    return;
  }
  noRes.classList.add("hidden");

  filtered.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.tabIndex = 0;
    div.dataset.index = i;

    if(viewMode === "grid") {
      div.innerHTML = `
        <div class="card-playing"></div>
        <div class="card-logo">
          <img src="${c.logo}" alt="${c.name}" onerror="this.style.display='none'">
        </div>
        <div class="card-name">${c.name}</div>
        <div class="card-region">${c.region || ""}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="card-playing"></div>
        <div class="card-logo">
          <img src="${c.logo}" alt="${c.name}" onerror="this.style.display='none'">
        </div>
        <div class="card-info">
          <div class="card-name">${c.name}</div>
          <div class="card-region">${c.region || ""}</div>
        </div>
        <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="9 18 15 12 9 6"/></svg>
      `;
    }

    div.onclick = () => play(c, i);
    div.onfocus = () => { currentIndex = i; };
    grid.appendChild(div);
  });

  // Re-mark active
  if(currentIndex >= 0) markActive(currentIndex);
}

// ============================================================
// PLAY
// ============================================================
function play(c, index) {
  currentIndex = index;
  markActive(index);

  // Update player info
  document.getElementById("now-playing-title").textContent = c.name;
  document.getElementById("now-playing-prog").textContent = "En directo · TDT";

  const logoEl = document.getElementById("channel-logo-player");
  logoEl.innerHTML = c.logo
    ? `<img src="${c.logo}" alt="${c.name}" onerror="this.innerHTML=''">`
    : "";

  const video = document.getElementById("video");
  const overlay = document.getElementById("player-overlay");
  const wrap    = document.getElementById("player-wrap");

  if(hls) { hls.destroy(); hls = null; }

  const streams = c.streams || [];
  const url = streams[0] || "";

  if(!url) {
    overlay.classList.remove("hidden");
    document.getElementById("no-signal").querySelector("p").textContent = "Sin señal disponible";
    document.getElementById("no-signal").querySelector("span").textContent = "Este canal no tiene stream configurado";
    return;
  }

  overlay.classList.add("hidden");
  wrap.classList.add("playing");

  if(url.includes(".m3u8") && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
  } else if(video.canPlayType("application/vnd.apple.mpegurl") && url.includes(".m3u8")) {
    video.src = url;
    video.play().catch(()=>{});
  } else {
    video.src = url;
    video.play().catch(()=>{});
  }

  loadEPG(c);
}

function markActive(index) {
  document.querySelectorAll(".card").forEach(el => el.classList.remove("active"));
  const cards = document.querySelectorAll(".card");
  if(cards[index]) {
    cards[index].classList.add("active");
    cards[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
}

// ============================================================
// EPG (simulated)
// ============================================================
function loadEPG(channel) {
  const list = document.getElementById("epg-list");
  list.innerHTML = "";

  const now = new Date();
  const hours = [];

  for(let i = -2; i <= 5; i++) {
    const t = new Date(now);
    t.setHours(t.getHours() + i, 0, 0, 0);
    hours.push(t);
  }

  const programs = [
    "Telediario","Saber Vivir","Los Desayunos","Aquí la Tierra",
    "El Tiempo","La Tarde en Directo","Informe Semanal","Cine de tarde",
    "Españoles en el Mundo","Masterchef","Factor X","Noticias 24h"
  ];

  hours.forEach((t, idx) => {
    const isNow = idx === 2;
    const timeStr = `${String(t.getHours()).padStart(2,"0")}:00`;
    const progName = programs[(t.getHours() + channel.name.length) % programs.length];

    const item = document.createElement("div");
    item.className = `epg-item${isNow ? " now" : ""}`;
    item.innerHTML = `
      <div class="epg-time">${timeStr}</div>
      <div class="epg-prog">
        ${progName}${isNow ? '<span class="epg-now-tag">AHORA</span>' : ""}
      </div>
    `;
    list.appendChild(item);

    if(isNow) {
      item.scrollIntoView({ block: "center" });
      document.getElementById("now-playing-prog").textContent = progName + " · En directo";
    }
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const input = document.getElementById("search");
  const clearBtn = document.getElementById("clearSearch");

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearBtn.style.display = q ? "block" : "none";
    applyFilters();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    applyFilters();
    input.focus();
  });
}

// ============================================================
// CATEGORY TABS
// ============================================================
function initTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.cat;
      applyFilters();
    });
  });
}

// ============================================================
// FILTERS
// ============================================================
function applyFilters() {
  const q = document.getElementById("search").value.toLowerCase().trim();

  filtered = allChannels.filter(c => {
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.region || "").toLowerCase().includes(q);
    const matchCat = activeCategory === "all" || categoryMatch(c, activeCategory);
    return matchSearch && matchCat;
  });

  updateCount();
  render();
}

function categoryMatch(c, cat) {
  const name     = (c.name     || "").toLowerCase();
  const region   = (c.region   || "").toLowerCase();
  const category = (c.category || "").toLowerCase();

  const rules = {
nacional: () =>
  category === "nacional" ||
  ["la 1", "la 2", "antena 3", "cuatro", "telecinco", "la sexta"]
    .some(k => name.includes(k)),


    noticias:        () =>
      category === "noticias" ||
      name.includes("24") ||
      name.includes("noticias") ||
      name.includes("info") ||
      name.includes("news"),

    deportes:        () =>
      category === "deportes" ||
      name.includes("sport") ||
      name.includes("deporte") ||
      name.includes("gol") ||
      name.includes("eurosport"),

    infantil:        () =>
      category === "infantil" ||
      name.includes("clan") ||
      name.includes("disney") ||
      name.includes("cartoon") ||
      name.includes("nick") ||
      name.includes("baby"),

    entretenimiento: () =>
      category === "entretenimiento" ||
      name.includes("fox") ||
      name.includes("comedy") ||
      name.includes("calle") ||
      name.includes("energy") ||
      name.includes("divinity") ||
      name.includes("neox"),

    "autonómica":    () =>
      category === "autonómica" ||
      region.includes("autonóm") ||
      region.includes("regional") ||
      ["tv3","etb","tvg","tpa","rtva","cmtv","7rm","canal sur","telemadrid","tv canaria","ib3"]
        .some(k => name.includes(k) || region.includes(k)),
  };

  return rules[cat] ? rules[cat]() : true;
}

function updateCount() {
  document.getElementById("channel-count").textContent =
    `${filtered.length} ${filtered.length === 1 ? "canal" : "canales"}`;
}

// ============================================================
// VIEW TOGGLE
// ============================================================
function initViewToggle() {
  document.getElementById("view-grid").addEventListener("click", () => {
    setView("grid");
  });
  document.getElementById("view-list").addEventListener("click", () => {
    setView("list");
  });
}

function setView(mode) {
  viewMode = mode;
  const grid = document.getElementById("grid");
  grid.className = mode === "grid" ? "grid-view" : "list-view";
  document.getElementById("view-grid").classList.toggle("active", mode === "grid");
  document.getElementById("view-list").classList.toggle("active", mode === "list");
  render();
}

// ============================================================
// PLAYER CONTROLS
// ============================================================
function initPlayerControls() {
  const video = document.getElementById("video");
  const btnMute = document.getElementById("btn-mute");
  const btnFs   = document.getElementById("btn-fullscreen");

  btnMute.addEventListener("click", () => {
    video.muted = !video.muted;
    btnMute.style.opacity = video.muted ? "0.4" : "1";
  });

  btnFs.addEventListener("click", () => {
    const wrap = document.getElementById("player-wrap");
    if(!document.fullscreenElement) {
      (wrap.requestFullscreen || wrap.webkitRequestFullscreen).call(wrap);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  });
}

// ============================================================
// CREATORS SECTION
// ============================================================

// Data de creadores de ejemplo (hispanohablantes conocidos)
const exampleCreators = [
  {
    id: 1,
    name: "Ibai",
    platform: "Twitch",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1467971491207266307/HhYN0KsJ_400x400.jpg",
    streamUrl: "https://twitch.tv/ibai",
    followers: 3200000,
    description: "Streamer de gaming y entretenimiento. Reacciones, directos épicos y comunidad.",
    verified: true
  },
  {
    id: 2,
    name: "TheGrefg",
    platform: "Twitch",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1558627619370336256/l-LqwYvH_400x400.jpg",
    streamUrl: "https://twitch.tv/thegrefg",
    followers: 2800000,
    description: "Fortnite y videojuegos. Campeonatos profesionales. Top player español.",
    verified: true
  },
  {
    id: 3,
    name: "AuronPlay",
    platform: "Twitch",
    category: "🎭 Comedy",
    logo: "https://pbs.twimg.com/profile_images/1534357689176571904/kFYWvF0f_400x400.jpg",
    streamUrl: "https://twitch.tv/auronplay",
    followers: 2900000,
    description: "Humor, reacciones y entretenimiento. El rey de las carcajadas.",
    verified: true
  },
  {
    id: 4,
    name: "Rubius",
    platform: "Twitch",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1588347261286301699/tgE4kHNf_400x400.jpg",
    streamUrl: "https://twitch.tv/rubius",
    followers: 2500000,
    description: "Gaming, reacciones y entretenimiento. Pionero del streaming en español.",
    verified: true
  },
  {
    id: 5,
    name: "Vegetta777",
    platform: "YouTube",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1467266515821850625/lqnCUEiA_400x400.jpg",
    streamUrl: "https://youtube.com/@vegetta777",
    followers: 6800000,
    description: "Minecraft, videojuegos y aventuras. Legendario del gaming español.",
    verified: true
  },
  {
    id: 6,
    name: "Willyrex",
    platform: "YouTube",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1461087829949534210/vFTbHiMy_400x400.jpg",
    streamUrl: "https://youtube.com/@willyrex",
    followers: 5600000,
    description: "Minecraft creativo y supervivencia. Arte digital y gaming.",
    verified: true
  },
  {
    id: 7,
    name: "ElXokas",
    platform: "Twitch",
    category: "🎮 Gaming",
    logo: "https://pbs.twimg.com/profile_images/1493865852851834882/SgSf0kqF_400x400.jpg",
    streamUrl: "https://twitch.tv/elxokas",
    followers: 1800000,
    description: "Shooter pro y competitivo. Contenido skill y análisis.",
    verified: true
  },
  {
    id: 8,
    name: "Loulogio",
    platform: "Twitch",
    category: "✨ Lifestyle",
    logo: "https://pbs.twimg.com/profile_images/1613389235525279745/PqY2Jfod_400x400.jpg",
    streamUrl: "https://twitch.tv/loulogio",
    followers: 850000,
    description: "Lifestyle, viajes y experiencias. Contenido original y diferente.",
    verified: true
  },
  {
    id: 9,
    name: "Andrea Stella",
    platform: "Onlyfans",
    category: "✨ Lifestyle",
    logo: "https://via.placeholder.com/200?text=Andrea",
    streamUrl: "https://onlyfans.com/placeholder",
    followers: 450000,
    description: "Contenido exclusivo lifestyle y wellness.",
    verified: true
  },
  {
    id: 10,
    name: "Sofia Creamer",
    platform: "Onlyfans",
    category: "🎨 Arte",
    logo: "https://via.placeholder.com/200?text=Sofia",
    streamUrl: "https://onlyfans.com/placeholder",
    followers: 320000,
    description: "Arte digital y contenido creativo exclusivo.",
    verified: true
  }
];

function initCreators() {
  // Panel toggle
  document.getElementById("creators-btn").addEventListener("click", openCreatorsPanel);
  document.getElementById("close-creators").addEventListener("click", closeCreatorsPanel);
  document.getElementById("creators-panel").addEventListener("click", (e) => {
    if(e.target.id === "creators-panel") closeCreatorsPanel();
  });

  // Tabs
  document.querySelectorAll(".creators-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".creators-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".creators-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // Form submit
  document.getElementById("creator-form").addEventListener("submit", submitCreatorForm);

  // Load creators de ejemplo
  if(!localStorage.getItem(creatorsStorage)) {
    localStorage.setItem(creatorsStorage, JSON.stringify(exampleCreators));
  }
}

function openCreatorsPanel() {
  document.getElementById("creators-panel").classList.add("visible");
  renderCreatorsList();
}

function closeCreatorsPanel() {
  document.getElementById("creators-panel").classList.remove("visible");
}

function loadCreators() {
  const stored = localStorage.getItem(creatorsStorage);
  allCreators = stored ? JSON.parse(stored) : exampleCreators;
}

function saveCreators() {
  localStorage.setItem(creatorsStorage, JSON.stringify(allCreators));
}

function renderCreatorsList() {
  const list = document.getElementById("creators-list");
  list.innerHTML = "";

  if(allCreators.length === 0) {
    list.innerHTML = `
      <div class="creators-empty">
        <svg viewBox="0 0 80 80" fill="none" width="50">
          <circle cx="40" cy="35" r="20" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
          <path d="M 20 60 Q 40 50 60 60" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none"/>
        </svg>
        <p>Sin creadores</p>
        <span>¡Sé el primero en subir tu canal!</span>
      </div>
    `;
    return;
  }

  allCreators.forEach(creator => {
    const card = document.createElement("div");
    card.className = `creator-item ${creator.verified ? "verified" : "pending"}`;
    
    // Badge platform color
    let badgeClass = "";
    if(creator.platform === "Twitch") badgeClass = "creator-badge-twitch";
    else if(creator.platform === "YouTube") badgeClass = "creator-badge-youtube";
    else if(creator.platform === "Onlyfans") badgeClass = "creator-badge-onlyfans";

    const platformEmoji = {
      "Twitch": "🟣",
      "YouTube": "🔴",
      "Onlyfans": "💙",
      "Instagram": "📷",
      "TikTok": "🎵"
    }[creator.platform] || "⭐";

    card.innerHTML = `
      <div class="creator-verified">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      <div class="creator-avatar">
        <img src="${creator.logo}" alt="${creator.name}" onerror="this.parentElement.innerHTML='${creator.name.charAt(0).toUpperCase()}'">
        <div class="creator-badge-platform ${badgeClass}">${platformEmoji}</div>
      </div>
      <div class="creator-info">
        <h4 class="creator-name">${creator.name}</h4>
        <div class="creator-platform">${creator.platform}</div>
        <div class="creator-followers">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>${(creator.followers / 1000000).toLocaleString('es-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})}M</span>
        </div>
        <div class="creator-category">${creator.category}</div>
        <p>${creator.description}</p>
      </div>
      <div class="creator-actions">
        <button class="btn-small btn-play" onclick="playCreator(${creator.id})" title="Reproducir">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
        </button>
        <button class="btn-small btn-remove" onclick="removeCreator(${creator.id})" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    list.appendChild(card);
  });
}

function playCreator(id) {
  const creator = allCreators.find(c => c.id === id);
  if(!creator) return;

  closeCreatorsPanel();

  // Update player info
  document.getElementById("now-playing-title").textContent = creator.name;
  document.getElementById("now-playing-prog").textContent = `${creator.platform} · En directo`;

  const logoEl = document.getElementById("channel-logo-player");
  logoEl.innerHTML = `<img src="${creator.logo}" alt="${creator.name}" style="border-radius: 50%;">`;

  const video = document.getElementById("video");
  const overlay = document.getElementById("player-overlay");
  const wrap    = document.getElementById("player-wrap");

  if(hls) { hls.destroy(); hls = null; }

  const url = creator.streamUrl;

  if(!url) {
    overlay.classList.remove("hidden");
    return;
  }

  overlay.classList.add("hidden");
  wrap.classList.add("playing");

  if(url.includes(".m3u8") && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
  } else {
    video.src = url;
    video.play().catch(()=>{});
  }
}

function removeCreator(id) {
  if(confirm("¿Eliminar este creador?")) {
    allCreators = allCreators.filter(c => c.id !== id);
    saveCreators();
    renderCreatorsList();
  }
}

function submitCreatorForm(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const newCreator = {
    id: Date.now(),
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    logo: formData.get("logo"),
    streamUrl: formData.get("streamUrl"),
    platform: formData.get("platform"),
    followers: parseInt(formData.get("followers")) || 0,
    verified: false,
    createdAt: new Date().toISOString()
  };

  allCreators.push(newCreator);
  saveCreators();

  form.reset();
  alert("✓ Canal enviado correctamente. Aparecerá como 'Pendiente de verificación'. Un administrador lo revisará pronto.");
  
  // Switch to list tab
  document.querySelector('[data-tab="list"]').click();
  renderCreatorsList();
}

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
document.addEventListener("keydown", (e) => {
  const cards = document.querySelectorAll(".card");
  const cols = viewMode === "grid" ? Math.round(document.getElementById("grid").clientWidth / 130) : 1;

  switch(e.key) {
    case "ArrowRight":
      currentIndex = Math.min(currentIndex + 1, cards.length - 1);
      cards[currentIndex]?.focus();
      e.preventDefault();
      break;
    case "ArrowLeft":
      currentIndex = Math.max(currentIndex - 1, 0);
      cards[currentIndex]?.focus();
      e.preventDefault();
      break;
    case "ArrowDown":
      currentIndex = Math.min(currentIndex + cols, cards.length - 1);
      cards[currentIndex]?.focus();
      e.preventDefault();
      break;
    case "ArrowUp":
      currentIndex = Math.max(currentIndex - cols, 0);
      cards[currentIndex]?.focus();
      e.preventDefault();
      break;
    case "Enter":
      if(currentIndex >= 0) cards[currentIndex]?.click();
      break;
    case "f":
    case "F":
      document.getElementById("btn-fullscreen").click();
      break;
    case "m":
    case "M":
      document.getElementById("btn-mute").click();
      break;
    case "/":
      document.getElementById("search").focus();
      e.preventDefault();
      break;
    case "Escape":
      document.getElementById("search").blur();
      closeCreatorsPanel();
      break;
  }
});