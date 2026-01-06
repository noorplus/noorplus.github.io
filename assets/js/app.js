const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* ===============================
   CORE UTILITIES
================================ */
function formatTo12h(time24) {
  if (!time24) return "--:--";
  let [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

function loadPage(page) {
  if (window.prayerTimer) {
    clearInterval(window.prayerTimer);
    window.prayerTimer = null;
  }

  fetch(`pages/${page}.html`)
    .then(res => res.text())
    .then(html => {
      main.classList.remove("page-fade-in");
      void main.offsetWidth;
      main.innerHTML = html;
      main.classList.add("page-fade-in");

      buttons.forEach(btn => btn.classList.remove("active"));
      document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

      if (window.lucide) lucide.createIcons();
      initThemeToggle();
      initQuranPage();
      initHomePage();
    });
}

function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  toggleBtn.onclick = () => {
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };
}

/* ===============================
   INITIAL LOAD & PREFERENCES
================================ */
function restorePreferences() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

restorePreferences();
loadPage("home");

document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-page]");
  if (target) loadPage(target.getAttribute("data-page"));
});

/* ===============================
   LOAD SAVED THEME (GLOBAL)
================================ */
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

let currentAudio = null;
let currentPlayBtn = null;

function initQuranPage() {
  const surahListEl = document.getElementById("surah-list");
  const ayahViewEl = document.getElementById("ayah-view");
  const ayahListEl = document.getElementById("ayah-list");
  const backBtn = document.getElementById("back-to-surah");

  if (!surahListEl) return; // not on Quran page

  /* ===============================
     FETCH SURAH LIST
  ================================ */
  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      surahListEl.innerHTML = "";

      data.data.forEach(surah => {
        const row = document.createElement("div");
        row.className = "surah-row";

        /* Surah info (LEFT) */
        const info = document.createElement("div");
        info.className = "surah-info";
        info.innerHTML = `
          <span class="surah-name">
            ${surah.number}. ${surah.englishName}
          </span>
          <span class="surah-ar">${surah.name}</span>
        `;
        info.onclick = () => loadSurah(surah.number);

        /* Play button (RIGHT) */
        const playBtn = document.createElement("button");
        playBtn.className = "surah-play";
        playBtn.innerHTML = \`<i data-lucide="play"></i>\`;

        playBtn.onclick = async (e) => {
          e.stopPropagation();
          await playSurahAudio(surah.number, playBtn);
        };

        row.appendChild(info);
        row.appendChild(playBtn);
        surahListEl.appendChild(row);
      });

      // Re-init icons for dynamic elements
      if (window.lucide) lucide.createIcons();
    });

  /* ===============================
     LOAD SURAH AYAH
  ================================ */
  function loadSurah(number) {
    surahListEl.classList.add("hidden");
    ayahViewEl.classList.remove("hidden");
    ayahListEl.innerHTML = "<p>Loading Ayahs…</p>";

    Promise.all([
      fetch(\`https://api.alquran.cloud/v1/surah/\${number}/ar\`).then(r => r.json()),
      fetch(\`https://api.alquran.cloud/v1/surah/\${number}/bn.bengali\`).then(r => r.json()),
      fetch(\`https://api.alquran.cloud/v1/surah/\${number}/en.asad\`).then(r => r.json())
    ]).then(([ar, bn, en]) => {
      ayahListEl.innerHTML = "";

      ar.data.ayahs.forEach((ayah, i) => {
        const div = document.createElement("div");
        div.className = "ayah";
        div.innerHTML = `
          < p class="ayah-ar" >\${ ayah.text }</p >
          <p class="ayah-bn">\${bn.data.ayahs[i].text}</p>
          <p class="ayah-en">\${en.data.ayahs[i].text}</p>
        `;
        ayahListEl.appendChild(div);
      });
    });
  }

  /* ===============================
     BACK BUTTON
  ================================ */
  backBtn.onclick = () => {
    ayahViewEl.classList.add("hidden");
    surahListEl.classList.remove("hidden");
  };
}

/* ===============================
   SURAH AUDIO (OFFLINE CACHED)
================================ */
async function playSurahAudio(number, btn) {
  const url =
    \`https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/\${number}.mp3\`;

  // Stop previous audio
  if (currentAudio) {
    currentAudio.pause();
    currentPlayBtn.innerHTML = \`<i data-lucide="play"></i>\`;
    if (window.lucide) lucide.createIcons();
  }

  // Toggle same button
  if (currentPlayBtn === btn) {
    currentAudio = null;
    currentPlayBtn = null;
    return;
  }

  const audio = new Audio();
  const cache = await caches.open("quran-audio-v1");
  const cached = await cache.match(url);

  if (cached) {
    const blob = await cached.blob();
    audio.src = URL.createObjectURL(blob);
  } else {
    audio.src = url;
    fetch(url).then(res => cache.put(url, res.clone()));
  }

  audio.play();
  btn.innerHTML = \`<i data-lucide="pause"></i>\`;
  if (window.lucide) lucide.createIcons();

  currentAudio = audio;
  currentPlayBtn = btn;

  audio.onended = () => {
    btn.innerHTML = \`<i data-lucide="play"></i>\`;
    if (window.lucide) lucide.createIcons();
    currentAudio = null;
    currentPlayBtn = null;
  };
}

/* ===============================
   ADVANCED DASHBOARD LOGIC
 ================================ */
function initHomePage() {
  const dateEl = document.getElementById("adv-date");
  if (!dateEl) return;

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });

  renderTracker();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAdvPrayerTimes(pos.coords.latitude, pos.coords.longitude),
      () => fetchAdvPrayerTimes(23.8103, 90.4125)
    );
  } else {
    fetchAdvPrayerTimes(23.8103, 90.4125);
  }

  document.querySelectorAll(".t-btn").forEach(btn => {
    btn.onclick = () => {
      // Logic: Only allow clicking if NOT missed and NOT upcoming (current or same-day logic)
      if (btn.classList.contains("upcoming") || btn.classList.contains("missed")) return;
      toggleTracker(btn.dataset.p);
    };
  });
}

async function fetchAdvPrayerTimes(lat, lon) {
  try {
    const res = await fetch(\`https://api.aladhan.com/v1/timings?latitude=\${lat}&longitude=\${lon}&method=2\`);
    const data = await res.json();
    const timings = data.data.timings;
    const meta = data.data.meta;

    const locEl = document.getElementById("adv-location");
    if (locEl) locEl.textContent = meta.timezone.split("/")[1]?.replace('_', ' ') || "Dhaka";

    const suhurEl = document.getElementById("adv-suhur");
    const iftarEl = document.getElementById("adv-iftar");
    if (suhurEl) suhurEl.textContent = formatTo12h(timings.Imsak);
    if (iftarEl) iftarEl.textContent = formatTo12h(timings.Maghrib);

    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    prayers.forEach(p => {
      const el = document.getElementById(\`s-\${p}\`);
      if (el) el.textContent = formatTo12h(timings[p]);
    });

    startAdvCountdown(timings);
  } catch (err) {
    console.error("Dashboard Load Failed", err);
  }
}

function startAdvCountdown(timings) {
  if (window.prayerTimer) clearInterval(window.prayerTimer);

  const schedule = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib },
    { name: "Isha", time: timings.Isha }
  ];

  function update() {
    const now = new Date();
    const nowTimeStr = \`\${String(now.getHours()).padStart(2, "0")}:\${String(now.getMinutes()).padStart(2, "0")}\`;

    let currentIdx = -1;
    for (let i = 0; i < schedule.length; i++) {
      if (nowTimeStr >= schedule[i].time) currentIdx = i;
    }
    if (currentIdx === -1) currentIdx = schedule.length - 1;

    const currentP = schedule[currentIdx];
    const nextP = schedule[(currentIdx + 1) % schedule.length];

    document.getElementById("adv-p-now").textContent = currentP.name;
    document.getElementById("adv-p-start").textContent = formatTo12h(currentP.time);

    document.querySelectorAll(".s-item").forEach(item => {
      item.classList.toggle("active", item.dataset.prayer === currentP.name);
    });

    const target = new Date();
    const [th, tm] = nextP.time.split(":").map(Number);
    target.setHours(th, tm, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);

    const diff = Math.floor((target - now) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    document.getElementById("adv-timer").textContent = \`\${String(h).padStart(2, "0")}:\${String(m).padStart(2, "0")}:\${String(s).padStart(2, "0")}\`;

    const ring = document.getElementById("adv-ring-fill");
    if (ring) {
      const start = new Date();
      const [sh, sm] = currentP.time.split(":").map(Number);
      start.setHours(sh, sm, 0, 0);
      if (start > now) start.setDate(start.getDate() - 1);

      const totalLen = (target - start) / 1000;
      const elapsed = (now - start) / 1000;
      const prog = Math.min(Math.max(elapsed / totalLen, 0), 1);
      const circ = 54 * 2 * Math.PI;
      ring.style.strokeDasharray = \`\${circ} \${circ}\`;
      ring.style.strokeDashoffset = circ - (prog * circ);
    }

    updateTrackerStates(timings, nowTimeStr);
  }

  update();
  window.prayerTimer = setInterval(update, 1000);
}

/* ===============================
   STRICT TRACKER LOGIC
 ================================ */
function getTrackerData() {
  const data = localStorage.getItem("noorplus_tracker_strict");
  return data ? JSON.parse(data) : {};
}

function renderTracker() {
  const today = new Date().toISOString().split("T")[0];
  const data = getTrackerData();
  const todayData = data[today] || {};

  document.querySelectorAll(".t-btn").forEach(btn => {
    const p = btn.dataset.p;
    btn.classList.remove("done", "missed", "upcoming");
    if (todayData[p] === "done") btn.classList.add("done");
  });
}

function toggleTracker(pName) {
  const today = new Date().toISOString().split("T")[0];
  const data = getTrackerData();
  if (!data[today]) data[today] = {};
  data[today][pName] = (data[today][pName] === "done") ? "" : "done";
  localStorage.setItem("noorplus_tracker_strict", JSON.stringify(data));
  renderTracker();
}

function updateTrackerStates(timings, nowStr) {
  const today = new Date().toISOString().split("T")[0];
  const data = getTrackerData();
  const todayData = data[today] || {};

  document.querySelectorAll(".t-btn").forEach(btn => {
    const p = btn.dataset.p;
    const pStartStr = timings[p];

    btn.classList.remove("missed", "upcoming");

    // Logic: 
    // 1. If it's before prayer start -> Upcoming
    // 2. If it's after (or during) and NOT done -> Missed (Strict past check)
    if (nowStr < pStartStr) {
      btn.classList.add("upcoming");
    } else {
      // It's either the current prayer or a past one
      // If it's NOT done, and it's PAST the current period... 
      // Actually, user said 'past' = red. Let's make anything past-current red if not done.
      if (todayData[p] !== "done") {
        btn.classList.add("missed");
      }
    }
  });
}
