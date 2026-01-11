let step = 1;

const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

/* ============================
   AUTO START ON FIRST VISIT
============================ */
document.addEventListener("DOMContentLoaded", () => {
  detectLocation();
});

/* ============================
   STEP NAVIGATION
============================ */
function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`)?.classList.add("active");
}

/* ============================
   STEP 1: LOCATION (AUTO)
============================ */
function detectLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported on this device.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      /* Layer 2: Reverse geocode */
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const geo = await geoRes.json();

      const city = geo.city || geo.locality || "Unknown";
      const country = geo.countryName || "Unknown";
      const timezone =
        geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      /* Update UI */
      document.getElementById("location-text").innerText =
        `${city}, ${country}`;

      document.getElementById("timezone-text").innerText =
        `Time Zone: ${timezone}`;

      /* Save location */
      prefs.location = { lat, lon, city, country, timezone };

      /* Fetch prayer defaults from API */
      loadPrayerDefaults(lat, lon);
    },
    () => {
      alert("Location access is required to continue onboarding.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* ============================
   PRAYER API DEFAULTS
============================ */
async function loadPrayerDefaults(lat, lon) {
  const res = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}`
  );
  const data = await res.json();
  const meta = data.data.meta;

  prefs.prayerMethod = meta.method.id;
  prefs.asrMethod = meta.school;

  document.getElementById("method-label").innerText =
    meta.method.name;

  document.getElementById("asr-label").innerText =
    meta.school === 1 ? "Hanafi" : "Shafi";

  document.getElementById("next-btn").classList.remove("hidden");

  savePrefs();
}

/* ============================
   STORAGE
============================ */
function savePrefs() {
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}
