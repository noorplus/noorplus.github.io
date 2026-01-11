let step = 1;

const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`)?.classList.add("active");
}

/* AUTO START LOCATION REQUEST */
window.addEventListener("load", detectLocation);

function detectLocation() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Reverse geocode (Layer 2)
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const geo = await geoRes.json();

    const city = geo.city || geo.locality || "Unknown";
    const country = geo.countryName || "Unknown";
    const timezone = geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    document.getElementById("location-text").innerText =
      `${city}, ${country}`;

    document.getElementById("timezone-text").innerText =
      `Time Zone: ${timezone}`;

    prefs.location = { lat, lon, city, country, timezone };

    // Fetch prayer defaults from API
    loadPrayerDefaults(lat, lon);
  }, () => {
    alert("Location permission is required to continue.");
  });
}

async function loadPrayerDefaults(lat, lon) {
  const res = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}`
  );
  const data = await res.json();
  const meta = data.data.meta;

  prefs.prayerMethod = meta.method.id;
  prefs.asrMethod = meta.school;

  document.getElementById("method-label").innerText = meta.method.name;
  document.getElementById("asr-label").innerText =
    meta.school === 1 ? "Hanafi" : "Shafi";

  document.getElementById("next-btn").classList.remove("hidden");

  savePrefs();
}

function savePrefs() {
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}
