/* ===============================
   ONBOARDING STATE MANAGEMENT
================================ */

const onboardingState = {
  step: 1,
  location: null,
  calculationMethods: [],
  selectedMethod: null,
  selectedAsr: "Hanafi",
  language: "en",
  hijriOffset: 0,
};

/* ===============================
   API ENDPOINTS
================================ */
const API = {
  prayerTimesBase: "https://api.aladhan.com/v1",
  hijriCalendar: "https://api.aladhan.com/v1/hijri",
};

/* ===============================
   DOM ELEMENTS
================================ */
const elements = {
  steps: document.querySelectorAll(".step"),
  progressFill: document.querySelector(".progress-fill"),
  locationAddress: document.getElementById("locationAddress"),
  locationTimezone: document.getElementById("locationTimezone"),
  retryLocation: document.getElementById("retryLocation"),
  methodDropdown: document.getElementById("methodDropdown"),
  methodValue: document.getElementById("methodValue"),
  methodMenu: document.getElementById("methodMenu"),
  asrDropdown: document.getElementById("asrDropdown"),
  asrValue: document.getElementById("asrValue"),
  asrMenu: document.getElementById("asrMenu"),
  seeMethodList: document.getElementById("seeMethodList"),
  step1Next: document.getElementById("step1Next"),
  languageOptions: document.querySelectorAll(".language-option"),
  step2Back: document.getElementById("step2Back"),
  step2Next: document.getElementById("step2Next"),
  hijriOffset: document.getElementById("hijriOffset"),
  step3Back: document.getElementById("step3Back"),
  step3Next: document.getElementById("step3Next"),
  loadingModal: document.getElementById("loadingModal"),
  loadingText: document.getElementById("loadingText"),
  errorModal: document.getElementById("errorModal"),
  errorText: document.getElementById("errorText"),
  errorRetry: document.getElementById("errorRetry"),
};

/* ===============================
   UTILITY FUNCTIONS
================================ */

function showLoading(text = "Loading...") {
  elements.loadingText.textContent = text;
  elements.loadingModal.style.display = "flex";
}

function hideLoading() {
  elements.loadingModal.style.display = "none";
}

function showError(text, retryCallback = null) {
  elements.errorText.textContent = text;
  elements.errorModal.style.display = "flex";
  if (retryCallback) {
    elements.errorRetry.onclick = retryCallback;
  }
}

function hideError() {
  elements.errorModal.style.display = "none";
}

function goToStep(stepNumber) {
  onboardingState.step = stepNumber;
  elements.steps.forEach((step) => step.classList.remove("active"));
  document.querySelector(`.step-${stepNumber}`).classList.add("active");
  updateProgress();
  window.scrollTo(0, 0);
}

function updateProgress() {
  const progress = (onboardingState.step / 3) * 100;
  elements.progressFill.style.width = progress + "%";
}

/* ===============================
   STEP 1: CONTEXT (LOCATION)
================================ */

async function initStep1() {
  showLoading("Detecting your location...");
  try {
    const coords = await getGeolocation();
    onboardingState.location = coords;
    await fetchPrayerCalculationMethods(coords);
    hideLoading();
    updateLocationDisplay(coords);
    elements.step1Next.disabled = false;
  } catch (error) {
    hideLoading();
    showError(
      "Unable to access location. Please enable location services.",
      initStep1
    );
    elements.retryLocation.style.display = "inline-flex";
    elements.retryLocation.onclick = initStep1;
  }
}

function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true }
    );
  });
}

async function fetchPrayerCalculationMethods(coords) {
  try {
    // Fetch current prayer times to get method and timezone info
    const response = await fetch(
      `${API.prayerTimesBase}/currentDate?latitude=${coords.latitude}&longitude=${coords.longitude}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch prayer data");
    }

    const data = await response.json();
    const prayerData = data.data;

    // Extract calculation methods (from Aladhan documentation)
    const methods = [
      { id: 0, name: "Shia Ithna Ashari" },
      { id: 1, name: "University of Islamic Sciences, Karachi" },
      { id: 2, name: "Islamic Society of North America (ISNA)" },
      { id: 3, name: "Muslim World League (MWL)" },
      { id: 4, name: "Umm Al-Qura University, Makkah" },
      { id: 5, name: "Egyptian General Authority of Survey" },
      { id: 7, name: "Institute of Geophysics, University of Tehran" },
      { id: 8, name: "Gulf Region" },
      { id: 9, name: "Kuwait" },
      { id: 10, name: "Qatar" },
      { id: 11, name: "Majlis Ugama Islam Singapura, Singapore" },
      { id: 12, name: "Union Organization clergyman of Iran" },
      { id: 13, name: "Diyanet İşleri, Turkey" },
      { id: 14, name: "Spiritual Administration of Muslims of Russia" },
      { id: 15, name: "Moonsighting Commitee Worldwide" },
      { id: 16, name: "Morocco" },
      { id: 17, name: "JAKIM, Malaysia" },
      { id: 18, name: "Bangladesh" },
      { id: 19, name: "Al Jamiat Al Islamia" },
      { id: 20, name: "University of Malaya" },
      { id: 21, name: "Karachi (University of Islamic Sciences)" },
      { id: 99, name: "Custom" },
    ];

    onboardingState.calculationMethods = methods;

    // Get detected method (usually method 1 for Karachi)
    const detectedMethod = prayerData.method || methods[1];
    onboardingState.selectedMethod = detectedMethod;

    // Get timezone from the response metadata
    const timezone = prayerData.meta?.timezone || "UTC";
    const address = await getAddressFromCoords(coords);

    onboardingState.location.address = address;
    onboardingState.location.timezone = timezone;

    updateMethodMenu();
    updateAsr();
  } catch (error) {
    console.error("Error fetching prayer methods:", error);
    throw error;
  }
}

async function getAddressFromCoords(coords) {
  try {
    // Using reverse geocoding API (OpenStreetMap's Nominatim)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
    );
    const data = await response.json();
    return (
      data.address?.country_code?.toUpperCase() +
      " - " +
      (data.address?.country || "Unknown")
    );
  } catch (error) {
    console.error("Error fetching address:", error);
    return `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
  }
}

function updateLocationDisplay(coords) {
  const address = onboardingState.location.address || "Detecting...";
  const timezone = onboardingState.location.timezone || "UTC";

  elements.locationAddress.textContent = address;
  elements.locationTimezone.textContent = `Time Zone: ${timezone}`;
}

function updateMethodMenu() {
  elements.methodMenu.innerHTML = "";
  onboardingState.calculationMethods.forEach((method) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    if (
      onboardingState.selectedMethod &&
      onboardingState.selectedMethod.id === method.id
    ) {
      item.classList.add("selected");
    }
    item.textContent = method.name;
    item.onclick = () => {
      onboardingState.selectedMethod = method;
      updateMethodDisplay();
    };
    elements.methodMenu.appendChild(item);
  });
}

function updateMethodDisplay() {
  if (onboardingState.selectedMethod) {
    elements.methodValue.textContent = onboardingState.selectedMethod.name;
    elements.methodDropdown.classList.remove("active");
    elements.methodMenu.style.display = "none";
  }
}

function updateAsr() {
  const asrOptions = ["Hanafi", "Shafii"];
  elements.asrMenu.innerHTML = "";
  asrOptions.forEach((asr) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    if (asr === onboardingState.selectedAsr) {
      item.classList.add("selected");
    }
    item.textContent = asr;
    item.dataset.value = asr;
    item.onclick = () => {
      onboardingState.selectedAsr = asr;
      elements.asrValue.textContent = asr;
      elements.asrDropdown.classList.remove("active");
      elements.asrMenu.style.display = "none";
    };
    elements.asrMenu.appendChild(item);
  });
}

/* ===============================
   STEP 2: EXPRESSION (LANGUAGE)
================================ */

function setupLanguageToggle() {
  elements.languageOptions.forEach((option) => {
    option.onclick = () => {
      elements.languageOptions.forEach((o) => o.classList.remove("active"));
      option.classList.add("active");
      onboardingState.language = option.dataset.lang;
    };
  });
}

/* ===============================
   STEP 3: ALIGNMENT (HIJRI)
================================ */

function setupHijriSlider() {
  elements.hijriOffset.addEventListener("input", (e) => {
    onboardingState.hijriOffset = parseInt(e.target.value);
  });
}

/* ===============================
   EVENT LISTENERS - DROPDOWNS
================================ */

elements.methodDropdown.addEventListener("click", () => {
  const isOpen = elements.methodMenu.style.display === "flex";
  elements.methodDropdown.classList.toggle("active");
  elements.methodMenu.style.display = isOpen ? "none" : "flex";
});

elements.asrDropdown.addEventListener("click", () => {
  const isOpen = elements.asrMenu.style.display === "flex";
  elements.asrDropdown.classList.toggle("active");
  elements.asrMenu.style.display = isOpen ? "none" : "flex";
});

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".dropdown-group") &&
    !e.target.closest(".dropdown-button")
  ) {
    elements.methodDropdown.classList.remove("active");
    elements.methodMenu.style.display = "none";
    elements.asrDropdown.classList.remove("active");
    elements.asrMenu.style.display = "none";
  }
});

elements.seeMethodList.addEventListener("click", () => {
  alert(
    "Full prayer calculation method list:\n\n" +
      onboardingState.calculationMethods
        .map((m) => `${m.id}: ${m.name}`)
        .join("\n")
  );
});

/* ===============================
   EVENT LISTENERS - NAVIGATION
================================ */

elements.step1Next.addEventListener("click", () => {
  goToStep(2);
});

elements.step2Back.addEventListener("click", () => {
  goToStep(1);
});

elements.step2Next.addEventListener("click", () => {
  goToStep(3);
});

elements.step3Back.addEventListener("click", () => {
  goToStep(2);
});

elements.step3Next.addEventListener("click", async () => {
  showLoading("Saving your configuration...");
  try {
    await saveOnboardingData();
    hideLoading();
    // Redirect to home
    window.location.href = "../pages/home.html";
  } catch (error) {
    hideLoading();
    showError("Failed to save configuration. Please try again.", () => {
      elements.step3Next.click();
    });
  }
});

elements.errorRetry.addEventListener("click", () => {
  hideError();
});

/* ===============================
   SAVE ONBOARDING DATA
================================ */

async function saveOnboardingData() {
  try {
    // Get Hijri date from API for validation
    const hijriResponse = await fetch(
      `${API.hijriCalendar}?adjustment=${onboardingState.hijriOffset}`
    );
    const hijriData = await hijriResponse.json();

    const onboardingData = {
      completed: true,
      completedAt: new Date().toISOString(),
      location: onboardingState.location,
      calculationMethod: onboardingState.selectedMethod,
      asrCalculation: onboardingState.selectedAsr,
      language: onboardingState.language,
      hijriOffset: onboardingState.hijriOffset,
      hijriBase: hijriData.data, // Save the base Hijri data
    };

    localStorage.setItem(
      "onboardingCompleted",
      JSON.stringify(onboardingData)
    );
    localStorage.setItem("appLanguage", onboardingState.language);
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }
}

/* ===============================
   INITIALIZATION
================================ */

function checkOnboardingCompletion() {
  const completed = localStorage.getItem("onboardingCompleted");
  if (completed) {
    // User already onboarded, redirect to home
    window.location.href = "../pages/home.html";
  }
}

function init() {
  checkOnboardingCompletion();
  updateProgress();
  setupLanguageToggle();
  setupHijriSlider();
  initStep1();
}

// Start onboarding when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
