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
   HOME DASHBOARD LOGIC
 ================================ */
function initHomePage() {
  const dateEl = document.getElementById("current-date");
  const locEl = document.getElementById("current-location");
  if (!dateEl) return;

  // Set Date
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

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
    const meta = data.data.meta;

    const locEl = document.getElementById("current-location");
    if (locEl) {
      locEl.textContent = meta.timezone.split('/')[1] || "My Location";
    }

    // Update Schedule List
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    prayers.forEach(p => {
      const el = document.getElementById(`time-${p}`);
      if (el) el.textContent = timings[p];
    });

    // Suhur/Iftar (Approximate)
    const suhurEl = document.getElementById("suhur-time");
    const iftarEl = document.getElementById("iftar-time");
    if (suhurEl) suhurEl.textContent = timings.Imsak;
    if (iftarEl) iftarEl.textContent = timings.Maghrib;

    startPrayerCountdown(timings);
  } catch (err) {
    console.error("Failed to fetch prayers", err);
  }
}

function startPrayerCountdown(timings) {
  if (prayerTimer) clearInterval(prayerTimer);

  const prayers = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Sunrise", time: timings.Sunrise },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib },
    { name: "Isha", time: timings.Isha }
  ];

  function update() {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find current and next prayer
    let currentIdx = -1;
    for (let i = 0; i < prayers.length; i++) {
      if (currentTimeStr >= prayers[i].time) {
        currentIdx = i;
      }
    }

    // Default to last prayer of yesterday if before Fajr
    const currentP = currentIdx === -1 ? prayers[prayers.length - 1] : prayers[currentIdx];
    const nextP = prayers[(currentIdx + 1) % prayers.length];

    // Update UI
    const nowPName = document.getElementById("now-p-name");
    if (nowPName) {
      nowPName.textContent = currentP.name;
      const startEl = document.getElementById("now-p-start");
      const endEl = document.getElementById("now-p-end");
      if (startEl) startEl.textContent = currentP.time;
      if (endEl) endEl.textContent = nextP.time;

      // Update active state in list
      document.querySelectorAll(".prayer-row").forEach(row => {
        row.classList.toggle("active", row.dataset.prayer === currentP.name);
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

      const remainingEl = document.getElementById("remaining-time");
      if (remainingEl) {
        remainingEl.textContent =
          `${String(diffH).padStart(2, '0')}:${String(diffM).padStart(2, '0')}:${String(diffS).padStart(2, '0')}`;
      }

      // Progress Circle
      const circle = document.getElementById("progress-circle");
      if (circle) {
        const startTime = new Date();
        const [sh, sm] = currentP.time.split(':').map(Number);
        startTime.setHours(sh, sm, 0, 0);
        if (startTime > now) startTime.setDate(startTime.getDate() - 1);

        const totalDuration = (targetTime - startTime) / 1000;
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference - (progress * circumference);
      }
    }
  }

  update();
  prayerTimer = setInterval(update, 1000);
}
