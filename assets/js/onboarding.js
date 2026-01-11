/* =================================================
   STEP 0: FORCE BROWSER LOCATION POPUP (MINIMAL)
   This is the ONLY reliable trigger
================================================== */

document.addEventListener("DOMContentLoaded", () => {
  navigator.geolocation.getCurrentPosition(
    onPermissionGranted,
    onPermissionDenied
  );
});

/* =================================================
   PERMISSION GRANTED
================================================== */
function onPermissionGranted(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  console.log("Permission granted:", lat, lon);

  // Update UI immediately
  const locationEl = document.getElementById("location-text");
  const timezoneEl = document.getElementById("timezone-text");

  if (locationEl) {
    locationEl.innerText = "Location detected. Loading details…";
  }

  // NOW it is safe to do async work
  enrichLocation(lat, lon);
}

/* =================================================
   PERMISSION DENIED
================================================== */
function onPermissionDenied(error) {
  console.error("Permission denied:", error);

  const locationEl = document.getElementById("location-text");
  if (locationEl) {
    locationEl.innerText =
      "Location access denied. Please allow location to continue.";
  }

  alert(
    "Location permission is required.\n\n" +
    "Please enable it in browser settings and reload."
  );
}

/* =================================================
   LAYER 2: REVERSE GEOCODING (SAFE, AFTER PERMISSION)
================================================== */
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
    console.warn("Reverse geocoding failed");
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

  // Continue to prayer API
  loadPrayerDefaults(lat, lon);
}

/* =================================================
   PRAYER API DEFAULTS (AFTER LOCATION)
================================================== */
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

  document.getElementById("method-label").innerText = meta.method.name;
  document.getElementById("asr-label").innerText =
    meta.school === 1 ? "Hanafi" : "Shafi";

  document.getElementById("next-btn").classList.remove("hidden");
}
