const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* ===============================
   LOAD PAGE
================================ */
function loadPage(page) {
  fetch(`pages/${page}.html`)
    .then(res => res.text())
    .then(html => {
      main.innerHTML = html;

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
   NAV CLICK
================================ */
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
   HOME DASHBOARD LOGIC (REDESIGN)
 ================================ */
function initHomePage() {
  const hijriEl = document.getElementById("hijri-date");
  if (!hijriEl) return;

  // Get Location & Fetch Times
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude),
      () => fetchPrayerTimes(23.8103, 90.4125) // Fallback: Dhaka
    );
  } else {
    fetchPrayerTimes(23.8103, 90.4125);
  }
}

let prayerTimer = null;

async function fetchPrayerTimes(lat, lon) {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`);
    const data = await res.json();
    const timings = data.data.timings;
    const hijri = data.data.date.hijri;

    // Set Hijri Date
    const hijriEl = document.getElementById("hijri-date");
    if (hijriEl) {
      hijriEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year}`;
    }

    // Update Horizontal List
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    prayers.forEach(p => {
      const el = document.getElementById(`val-${p}`);
      if (el) el.textContent = formatTime(timings[p]);
    });

    // Suhur/Iftar
    const suhurEl = document.getElementById("suhur-val");
    const iftarEl = document.getElementById("iftar-val");
    if (suhurEl) suhurEl.textContent = formatTime(timings.Imsak);
    if (iftarEl) iftarEl.textContent = formatTime(timings.Maghrib);

    startImprovedCountdown(timings);
  } catch (err) {
    console.error("Failed to fetch prayers", err);
  }
}

function formatTime(time24) {
  if (!time24) return "--:--";
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function startImprovedCountdown(timings) {
  if (prayerTimer) clearInterval(prayerTimer);

  const prayers = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib },
    { name: "Isha", time: timings.Isha }
  ];

  function update() {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find NEXT prayer
    let nextIdx = 0;
    for (let i = 0; i < prayers.length; i++) {
      if (currentTimeStr < prayers[i].time) {
        nextIdx = i;
        break;
      }
      if (i === prayers.length - 1) nextIdx = 0; // Wrap to Fajr
    }

    const nextP = prayers[nextIdx];
    const prevP = prayers[(nextIdx + prayers.length - 1) % prayers.length];

    // UI Update: Hero Card
    const nameEl = document.getElementById("next-prayer-name");
    const targetValEl = document.getElementById("target-time-val");
    const targetPeriodEl = document.getElementById("target-time-period");

    if (nameEl) {
      nameEl.textContent = nextP.name;
      const t = formatTime(nextP.time).split(' ');
      targetValEl.textContent = t[0];
      targetPeriodEl.textContent = t[1];

      // Update Horizontal Active
      document.querySelectorAll(".p-item").forEach(item => {
        item.classList.toggle("active", item.dataset.prayer === prevP.name);
      });

      // Countdown Calculation
      const targetTime = new Date();
      const [h, m] = nextP.time.split(':').map(Number);
      targetTime.setHours(h, m, 0, 0);
      if (targetTime < now) targetTime.setDate(targetTime.getDate() + 1);

      const diffSec = Math.floor((targetTime - now) / 1000);
      const diffH = Math.floor(diffSec / 3600);
      const diffM = Math.floor((diffSec % 3600) / 60);
      const diffS = diffSec % 60;

      document.getElementById("remaining-hms").textContent =
        `${String(diffH).padStart(2, '0')}:${String(diffM).padStart(2, '0')}:${String(diffS).padStart(2, '0')}`;

      // Progress Circle & Dot
      const ring = document.getElementById("progress-ring-top");
      const dot = document.getElementById("progress-dot");
      if (ring && dot) {
        const startTime = new Date();
        const [sh, sm] = prevP.time.split(':').map(Number);
        startTime.setHours(sh, sm, 0, 0);
        if (startTime > now) startTime.setDate(startTime.getDate() - 1);

        const totalDuration = (targetTime - startTime) / 1000;
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

        const circumference = 60 * 2 * Math.PI; // Radius is 60
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = circumference - (progress * circumference);

        // Rotate Dot
        const angle = progress * 360;
        dot.style.transform = `rotate(${angle}deg)`;
      }
    }
  }

  update();
  prayerTimer = setInterval(update, 1000);
}
