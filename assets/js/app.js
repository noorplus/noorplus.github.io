
const appMain = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

function loadPage(page) {
  fetch(`pages/${page}.html`)
    .then(r => r.text())
    .then(html => {
      appMain.innerHTML = html;
      if (page === "home") initHome();
    });
}

buttons.forEach(btn =>
  btn.addEventListener("click", () => loadPage(btn.dataset.page))
);

loadPage("home");

/* =========================================================
   HOME PAGE – TODAY'S PRAYER TIMES (FULL)
========================================================= */
function initHomePage() {
  const prefs = JSON.parse(localStorage.getItem("noorPreferences"));
  if (!prefs || !prefs.location || !prefs.prayer) return;

  const { latitude, longitude, city, country } = prefs.location;
  const { method, asr } = prefs.prayer;
  const hijri = prefs.hijriOffset || 0;

  const locationEl = document.getElementById("home-location");
  const listEl = document.getElementById("prayer-list");
  const nextEl = document.getElementById("next-prayer");

  locationEl.textContent = `${city}, ${country}`;
  listEl.innerHTML = "Loading prayer times…";

  const today = new Date().toISOString().split("T")[0];

  fetch(
    `https://api.aladhan.com/v1/timings/${today}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${asr}&adjustment=${hijri}`
  )
    .then(res => res.json())
    .then(data => {
      const t = data.data.timings;

      const prayers = [
        { key: "Fajr", label: "Fajr", time: t.Fajr },
        { key: "Sunrise", label: "Sunrise", time: t.Sunrise },
        { key: "Dhuhr", label: "Dhuhr", time: t.Dhuhr },
        { key: "Asr", label: "Asr", time: t.Asr },
        { key: "Maghrib", label: "Maghrib", time: t.Maghrib },
        { key: "Isha", label: "Isha", time: t.Isha }
      ];

      listEl.innerHTML = "";

      const now = new Date();
      let nextPrayer = null;

      prayers.forEach(p => {
        const row = document.createElement("div");
        row.className = "prayer-row";

        const timeDate = toTodayDate(p.time);
        if (!nextPrayer && timeDate > now) {
          row.classList.add("active");
          nextPrayer = { name: p.label, time: p.time };
        }

        row.innerHTML = `
          <span>${p.label}</span>
          <strong>${p.time}</strong>
        `;

        listEl.appendChild(row);
      });

      if (nextPrayer) {
        nextEl.textContent = `Next prayer: ${nextPrayer.name} at ${nextPrayer.time}`;
      } else {
        nextEl.textContent = "All prayers for today are completed.";
      }
    })
    .catch(() => {
      listEl.innerHTML = "Unable to load prayer times.";
    });
}

/* Helper: convert API time (HH:mm) to today Date */
function toTodayDate(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
}
