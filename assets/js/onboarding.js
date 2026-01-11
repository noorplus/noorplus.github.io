let step = 1;
const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

/* =====================================
   AUTO REQUEST ON FIRST VISIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  requestLocationPermission();
});

/* =====================================
   MANUAL + AUTO LOCATION REQUEST
===================================== */
function requestLocationPermission() {
  const locationEl = document.getElementById("location-text");
  const timezoneEl = document.getElementById("timezone-text");

  if (locationEl) {
    locationEl.innerText = "Requesting location permission…";
  }

  if (!("geolocation" in navigator)) {
    locationEl.innerText = "Geolocation not supported on this device.";
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

/* =====================================
   SUCCESS
===================================== */
function handleLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  enrichLocation(lat, lon);
}

/* =====================================
   ERROR
===================================== */
function handleLocationError(error) {
  console.warn("Geolocation error:", error);

  const locationEl = document.getElementById("location-text");

  if (locationEl) {
    locationEl.innerText =
      "Location access not granted. Please tap “Update Location”.";
  }
}

/* =====================================
   LAYER 2: HUMAN READABLE LOCATION
===================================== */
async function enrichLocation(lat, lon) {
  const locationEl = document.getElementById("location-text");
  const timezoneEl = document.getElementById("timezone-text");

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
    console.warn("Reverse geocoding failed");
  }

  locationEl.innerText = `${city}${country ? ", " + country : ""}`;
  timezoneEl.innerText = `Time Zone: ${timezone}`;

  prefs.location = { lat, lon, city, country, timezone };
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));

  loadPrayerDefaults(lat, lon);
}

/* =====================================
   PRAYER API DEFAULTS
===================================== */
async function loadPrayerDefaults(lat, lon) {
  const res = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}`
  );
  const data = await res.json();
  const meta = data.data.meta;

  prefs.prayerMethod = meta.method.id;
  prefs.asrMethod = meta.school;

  localStorage.setItem("noorPreferences", JSON.stringify(prefs));

  document.getElementById("method-label").innerText = meta.method.name;
  document.getElementById("asr-label").innerText =
    meta.school === 1 ? "Hanafi" : "Shafi";

  document.getElementById("next-btn").classList.remove("hidden");
}

/* =====================================
   STEP NAVIGATION
===================================== */
function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`)?.classList.add("active");
}
