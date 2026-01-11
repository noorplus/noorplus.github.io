let step = 1;

/* ===============================
   AUTO LOCATION REQUEST (CRITICAL)
   This MUST run immediately
================================ */
document.addEventListener("DOMContentLoaded", () => {
  requestLocationPermission();
});

/* ===============================
   REQUEST LOCATION PERMISSION
   (This triggers browser popup)
================================ */
function requestLocationPermission() {
  if (!("geolocation" in navigator)) {
    console.error("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* ===============================
   SUCCESS: PERMISSION GRANTED
================================ */
function handleLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  console.log("Location granted:", lat, lon);

  // Update UI immediately (prevents 'stuck' feeling)
  const locationEl = document.getElementById("location-text");
  const timezoneEl = document.getElementById("timezone-text");

  if (locationEl) {
    locationEl.innerText = "Location detected. Loading details…";
  }

  // Continue with Layer 2 + Prayer API
  enrichLocation(lat, lon);
}

/* ===============================
   ERROR: PERMISSION DENIED / BLOCKED
================================ */
function handleLocationError(error) {
  console.error("Geolocation error:", error);

  const locationEl = document.getElementById("location-text");

  if (locationEl) {
    locationEl.innerText =
      "Location access denied. Please allow location to continue.";
  }

  alert(
    "Location permission is required.\n\n" +
    "Please enable location access in your browser settings and reload the page."
  );
}

/* ===============================
   LAYER 2: HUMAN-READABLE LOCATION
================================ */
async function enrichLocation(lat, lon) {
  let city = "Unknown";
  let country = "";
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const geo = await res.json();

    city = geo.city || geo.locality || city;
    country = geo.countryName || country;
    timezone = geo.timezone || timezone;
  } catch (e) {
    console.warn("Reverse geocoding failed, using fallback");
  }

  // Update UI
  document.getElementById("location-text").innerText =
    `${city}${country ? ", " + country : ""}`;

  document.getElementById("timezone-text").innerText =
    `Time Zone: ${timezone}`;

  // Save location
  const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};
  prefs.location = { lat, lon, city, country, timezone };
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));

  // Continue to prayer defaults
  loadPrayerDefaults(lat, lon);
}

/* ===============================
   PRAYER API DEFAULTS
================================ */
async function loadPrayerDefaults(lat, lon) {
  const res = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}`
  );
  const data = await res.json();
  const meta = data.data.meta;

  const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};
  prefs.prayerMethod = meta.method.id;
  prefs.asrMethod = meta.school;

  localStorage.setItem("noorPreferences", JSON.stringify(prefs));

  // Update UI
  document.getElementById("method-label").innerText = meta.method.name;
  document.getElementById("asr-label").innerText =
    meta.school === 1 ? "Hanafi" : "Shafi";

  document.getElementById("next-btn").classList.remove("hidden");
}

/* ===============================
   STEP NAVIGATION
================================ */
function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`)?.classList.add("active");
}
