const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* ===============================
   LOAD PAGE
================================ */
function loadPage(page) {
  // Clear any existing intervals (like prayer countdown)
  if (window.prayerTimer) {
    clearInterval(window.prayerTimer);
    window.prayerTimer = null;
  }

  fetch(`pages/${page}.html`)
    .then(res => res.text())
    .then(html => {
      // Apply fade-out effect if needed, but innerHTML change is abrupt
      // We use a CSS class on the main container for fade-in
      main.classList.remove("page-fade-in");
      void main.offsetWidth; // trigger reflow

      main.innerHTML = html;
      main.classList.add("page-fade-in");

      // Active nav state
      buttons.forEach(btn => btn.classList.remove("active"));
      document
        .querySelector(`[data-page="${page}"]`)
        ?.classList.add("active");

      // Initialize Icons
      if (window.lucide) {
        lucide.createIcons();
      }

      // 🔥 Re-bind page-specific JS
      initThemeToggle();
      initQuranPage();
      initHomePage();
    });
}

/* ===============================
   THEME TOGGLE (PREMIUM)
 ================================ */
function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    // Add immediate transition class if needed, but CSS handles it
    root.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  });
}

/* ===============================
   INITIAL LOAD
================================ */
loadPage("home");

/* ===============================
   NAV CLICK & GLOBAL ROUTING
 ================================ */
document.addEventListener("click", e => {
  const target = e.target.closest("[data-page]");
  if (target) {
    loadPage(target.dataset.page);
  }
});

// (Keep bottom nav buttons for active state management)
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    loadPage(btn.dataset.page);
  });
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
        playBtn.innerHTML = `<i data-lucide="play"></i>`;

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
      fetch(`https://api.alquran.cloud/v1/surah/${number}/ar`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/bn.bengali`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/en.asad`).then(r => r.json())
    ]).then(([ar, bn, en]) => {
      ayahListEl.innerHTML = "";

      ar.data.ayahs.forEach((ayah, i) => {
        const div = document.createElement("div");
        div.className = "ayah";
        div.innerHTML = `
          <p class="ayah-ar">${ayah.text}</p>
          <p class="ayah-bn">${bn.data.ayahs[i].text}</p>
          <p class="ayah-en">${en.data.ayahs[i].text}</p>
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
    `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;

  // Stop previous audio
  if (currentAudio) {
    currentAudio.pause();
    currentPlayBtn.innerHTML = `<i data-lucide="play"></i>`;
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
  btn.innerHTML = `<i data-lucide="pause"></i>`;
  if (window.lucide) lucide.createIcons();

  currentAudio = audio;
  currentPlayBtn = btn;

  audio.onended = () => {
    btn.innerHTML = `<i data-lucide="play"></i>`;
    if (window.lucide) lucide.createIcons();
    currentAudio = null;
    currentPlayBtn = null;
  };
}

/* ===============================
   HOME DASHBOARD LOGIC (LITE THEME)
 ================================ */
function initHomePage() {
  const liteDate = document.getElementById("lite-date");
  if (!liteDate) return;

  // Set Current Date
  const now = new Date();
  liteDate.textContent = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Get Location & Fetch
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchLitePrayerTimes(pos.coords.latitude, pos.coords.longitude),
      () => fetchLitePrayerTimes(23.8103, 90.4125) // Fallback: Dhaka
    );
  } else {
    fetchLitePrayerTimes(23.8103, 90.4125);
  }
}

let prayerTimer = null;

async function fetchLitePrayerTimes(lat, lon) {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`);
    const data = await res.json();
    const timings = data.data.timings;
    const meta = data.data.meta;

    // Set Location
    const locEl = document.getElementById("lite-location");
    if (locEl) locEl.textContent = meta.timezone.split('/')[1] || "Dhaka";

    // Set Suhur/Iftar
    const suhurEl = document.getElementById("val-suhur");
    const iftarEl = document.getElementById("val-iftar");
    if (suhurEl) suhurEl.textContent = formatTo12h(timings.Imsak);
    if (iftarEl) iftarEl.textContent = formatTo12h(timings.Maghrib);

    // Update Mini Schedule
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    prayers.forEach(p => {
      const el = document.getElementById(`sh-${p}`);
      if (el) el.textContent = formatTo12h(timings[p]);
    });

    startLiteCountdown(timings);
  } catch (err) {
    console.error("Home load failed", err);
  }
}

function formatTo12h(time24) {
  if (!time24) return "--:--";
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function startLiteCountdown(timings) {
  if (prayerTimer) clearInterval(prayerTimer);

  const schedule = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Sunrise", time: timings.Sunrise, forbidden: true },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib, forbidden: true },
    { name: "Isha", time: timings.Isha }
  ];

  function update() {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find next event
    let nextIdx = 0;
    for (let i = 0; i < schedule.length; i++) {
      if (nowStr < schedule[i].time) {
        nextIdx = i;
        break;
      }
      if (i === schedule.length - 1) nextIdx = 0;
    }

    const nextEvent = schedule[nextIdx];
    const prevEvent = schedule[(nextIdx + schedule.length - 1) % schedule.length];

    // Status Determination
    const statusLabel = document.getElementById("p-status-label");
    const rangeEl = document.getElementById("p-time-range");
    const approxEl = document.getElementById("p-approx-left");

    if (statusLabel) {
      // Logic: 15 mins before a "Forbidden" event like Sunrise or Maghrib
      const targetTime = new Date();
      const [th, tm] = nextEvent.time.split(':').map(Number);
      targetTime.setHours(th, tm, 0, 0);
      if (targetTime < now) targetTime.setDate(targetTime.getDate() + 1);

      const diffSec = Math.floor((targetTime - now) / 1000);
      const isForbidden = nextEvent.forbidden && (diffSec <= 900); // 15 mins

      statusLabel.textContent = isForbidden ? "Forbidden Time" : `Next Prayer : ${nextEvent.name}`;

      // Range show (e.g. 5:11 PM - 5:26 PM)
      const rangeStart = new Date(targetTime.getTime() - 15 * 60000);
      rangeEl.textContent = isForbidden
        ? `${formatTo12h(rangeStart.getHours() + ':' + rangeStart.getMinutes())} - ${formatTo12h(nextEvent.time)}`
        : formatTo12h(nextEvent.time);

      // Approx Formatting: "0 hour 2.37 min left"
      const hours = Math.floor(diffSec / 3600);
      const mins = (diffSec % 3600) / 60;
      approxEl.textContent = `${hours} hour ${mins.toFixed(2)} min left (Approx)`;

      // HMS Timer
      const hms = `${String(hours).padStart(2, '0')}:${String(Math.floor(mins)).padStart(2, '0')}:${String(diffSec % 60).padStart(2, '0')}`;
      document.getElementById("lite-timer-hms").textContent = hms;

      // Active state in schedule
      document.querySelectorAll(".ms-item").forEach(item => {
        item.classList.toggle("active", item.dataset.prayer === prevEvent.name);
      });

      // Circle Update
      const ring = document.getElementById("ring-lite-fill");
      const dot = document.getElementById("lite-dot");
      if (ring && dot) {
        const startTime = new Date();
        const [sh, sm] = prevEvent.time.split(':').map(Number);
        startTime.setHours(sh, sm, 0, 0);
        if (startTime > now) startTime.setDate(startTime.getDate() - 1);

        const total = (targetTime - startTime) / 1000;
        const elapsed = (now - startTime) / 1000;
        const prog = Math.min(Math.max(elapsed / total, 0), 1);

        const circ = 44 * 2 * Math.PI;
        ring.style.strokeDasharray = `${circ} ${circ}`;
        ring.style.strokeDashoffset = circ - (prog * circ);
        dot.style.transform = `rotate(${prog * 360}deg)`;
      }
    }
  }

  update();
  prayerTimer = setInterval(update, 1000);
}
