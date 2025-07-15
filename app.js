// === GLOBAL CONFIG & STATE ===
const fallbackInterval = 60000;
const motionThreshold = 0.1;
const apiKey = "AIzaSyAInvy6GdRdnuYVJGlde1gX0VINpU5AsJI";
let tracking = false;
let tripStatus = 'idle';
let trackingInterval = null;
let tripStart = null;
let tripEnd = null;
let tripLog = [];
let pauseStartTime = null;
let totalPauseDuration = 0;
let map, directionsService, directionsRenderer;
let gpsPoller = null;

// === DEBUG MODE INIT ===
let isDebug = localStorage.getItem("debugMode") === "true";

if (isDebug) {
  const script = document.createElement("script");
  script.src = "//cdn.jsdelivr.net/npm/eruda";
  document.body.appendChild(script);
  script.onload = () => {
    eruda.init();
    console.log("🛠️ Debug mode is active (persisted)");
  };
}

// === DEBUG TOOLS ===
function toggleDebug(enable) {
    const erudaScriptId = 'eruda-script';
    const existingScript = document.getElementById(erudaScriptId);

    if (enable) {
        // Load Eruda only if not already initialized
        if (!window.eruda || !eruda._isInit) {
            const script = document.createElement('script');
            script.id = erudaScriptId;
            script.src = 'https://cdn.jsdelivr.net/npm/eruda';
            script.onload = () => {
                eruda.init();
                // Optionally: eruda.add(erudaDom);
                console.log('[Debug] Eruda initialized');
            };
            document.body.appendChild(script);
        }
    } else {
        // Defensive teardown
        if (window.eruda && typeof eruda.destroy === 'function') {
            try {
                // Optional: destroy specific tools
                const tools = ['dom', 'console', 'elements'];
                tools.forEach(tool => {
                    const instance = eruda.get(tool);
                    if (instance && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                });
                eruda.destroy(); // Safely remove Eruda UI
                console.log('[Debug] Eruda destroyed');
            } catch (err) {
                console.warn('[Debug] Eruda destroy error:', err);
            }
        }

        // Optionally remove script tag
        if (existingScript) existingScript.remove();
    }
}



// === DEBUG TOOLS: UI Toggle Logic ===

document.addEventListener('DOMContentLoaded', () => {
  const debugBtn = document.getElementById('enableDebugBtn');
  const badge = document.getElementById('debugBadge');

  if (debugBtn && badge) {
    let debugActive = localStorage.getItem("debugMode") === "true";

    // Initial UI sync
    debugBtn.textContent = debugActive ? "🛑 Disable Debug" : "👀 Enable Debug";
    badge.style.display = debugActive ? "inline-block" : "none";

    // Activate debug state immediately on load if needed
    toggleDebug(debugActive);

    debugBtn.addEventListener('click', () => {
      debugActive = !debugActive;
      localStorage.setItem("debugMode", debugActive.toString());
      toggleDebug(debugActive);
      debugBtn.textContent = debugActive ? "🛑 Disable Debug" : "👀 Enable Debug";
      badge.style.display = debugActive ? "inline-block" : "none";
    });
  }
});


// === HELPER FUNCTIONS ===
function safeUpdate(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found`);
  }
}

// Wrap in DOMContentLoaded to ensure #debugToggleBtn exists
document.addEventListener('DOMContentLoaded', () => {
  const debugBtn = document.getElementById('debugToggleBtn');

  if (debugBtn) {
    let debugActive = localStorage.getItem("debugMode") === "true";

    // Reflect initial button label
    debugBtn.textContent = debugActive ? "Disable Debug" : "Enable Debug";

    debugBtn.addEventListener('click', () => {
      debugActive = !debugActive;
      localStorage.setItem("debugMode", debugActive.toString());
      toggleDebug(debugActive);
      debugBtn.textContent = debugActive ? "Disable Debug" : "Enable Debug";
    });
  }
});


// === MAP INIT & SERVICES ===
// initMapServices(), directions setup, fallback polling

function initMapServices() {
  if (map) return;
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 38.5816, lng: -121.4944 },
    zoom: 12
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    panel: document.getElementById("directions-panel")
  });
}

// === ROUTE CALCULATION ===
// getRoute(start, end) async logic

async function getRoute(start, end) {
  if (!start || !end) {
    console.warn("Missing start or end location:", { start, end });
    alert("Route calculation failed: Missing location data.");
    return;
  }
  if (
    typeof start.latitude !== "number" || typeof start.longitude !== "number" ||
    typeof end.latitude !== "number" || typeof end.longitude !== "number"
  ) {
    console.warn("Invalid coordinates:", { start, end });
    alert("Route calculation failed: Invalid coordinates.");
    return;
  }

  try {
    const result = await new Promise((resolve, reject) => {
      directionsService.route(
        {
          origin: new google.maps.LatLng(start.latitude, start.longitude),
          destination: new google.maps.LatLng(end.latitude, end.longitude),
          travelMode: google.maps.TravelMode.DRIVING
        },
        (response, status) => {
          status === google.maps.DirectionsStatus.OK
            ? resolve(response)
            : reject(`Route request failed: ${status}`);
        }
      );
    });
    return result;
  } catch (error) {
    console.error("Route calculation error:", error);
    alert("Unable to calculate route. Please try again later.");
  }
}

// === TRACKING CONTROLS ===
// startTracking(), pauseTracking(), resumeTracking(), endTracking()

function startTracking() {
  tripStatus = 'tracking';
  initMapServices();
  navigator.geolocation.getCurrentPosition(pos => {
    tripStart = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };
    
    if (isDebug) {
    console.log("📍 Trip Start:", tripStart.latitude, tripStart.longitude);
    }
    
    tracking = true;
    totalPauseDuration = 0;
    updateStatus("Tracking");
    showToast("🚀 Trip started!");
    updateControls();
  }, () => showToast("⚠️ Unable to access GPS", "error"));
}

// === UI DISPLAY & RENDER ===
// renderSteps(), updateSummary(), updateStatus(), updateControls()

function pauseTracking() {
  // ✅ keep tracking = true
  tripStatus = 'paused';
  clearInterval(trackingInterval);
  trackingInterval = null;
  pauseStartTime = Date.now();
  updateStatus("Paused");
  showToast("⏸️ Trip paused");
  updateControls();
}
function resumeTracking() {
// ✅ keep tracking = true and resume trip
  tripStatus = 'resumed';
  trackingInterval = setInterval(() => {
    // poll location again
  }, 10000); // or your preferred interval
  if (pauseStartTime) {
    totalPauseDuration += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }
  updateStatus("Tracking");
  showToast("▶️ Trip resumed");
  updateControls();
}
function endTracking() {
  tripStatus = 'idle';
  navigator.geolocation.getCurrentPosition(async pos => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };
    
    if (isDebug) {
    console.log("📍 Trip End:", tripEnd.latitude, tripEnd.longitude);
    }
    
    if (!tripStart || !tripEnd) {
      alert("Trip cannot be ended: Missing location data.");
      console.warn("Missing tripStart or tripEnd");
      return;
    }

    clearInterval(trackingInterval);
    trackingInterval = null;
    tracking = false;

    try {
      const result = await getRoute(tripStart, tripEnd);
      if (result) {
        const leg = result.routes[0].legs[0];
        
        if (isDebug) {
        console.log("🚗 Raw Distance from Directions API:", leg.distance.value, "meters");
        }
        
        directionsRenderer.setDirections(result);
        localStorage.setItem("lastRoute", JSON.stringify(result));

        const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
        const durationMin = Math.round(leg.duration.value / 60);
        const pausedMin = Math.round(totalPauseDuration / 60000);
        const startAddress = leg.start_address;
        const endAddress = leg.end_address;
        const purpose = document.getElementById("trip-purpose").value || "–";
        const notes = document.getElementById("trip-notes").value || "–";

// === HELPER FUNCTIONS ===
// safeUpdate(), formatDistance(), formatDuration(), etc.
        
        safeUpdate("summary-purpose", purpose);
        safeUpdate("summary-notes", notes);
        safeUpdate("summary-start", startAddress);
        safeUpdate("summary-end", endAddress);
        safeUpdate("summary-distance", `${distanceMi} mi`);
        safeUpdate("summary-duration", `${durationMin} min`);
        safeUpdate("pause-summary", `${pausedMin} min`);
        safeUpdate("lastDistance", `${distanceMi} mi`);
        safeUpdate("lastDuration", `${durationMin} min`);

        renderSteps(leg.steps);
        logTrip(purpose, notes, distanceMi, durationMin, pausedMin);
        showToast(`✅ Trip complete: ${distanceMi} mi`);
      } else {
        showToast("⚠️ No route returned", "error");
      }
    } catch (err) {
      console.error("endTracking() error:", err);
      const cached = localStorage.getItem("lastRoute");
      if (cached) {
        const result = JSON.parse(cached);
        const leg = result.routes[0].legs[0];
        console.log("🚗 Raw Distance from Directions API:", leg.distance.value, "meters");
        directionsRenderer.setDirections(result);
        renderSteps(leg.steps);
        showToast("⚠️ Offline: showing last saved route");
      } else {
        showToast("❌ " + err.message, "error");
      }
    }

    updateStatus("Trip Complete");
    updateControls();
    tripStart = tripEnd = null;
  }, () => {
    showToast("⚠️ GPS access failed", "error");
    updateStatus("Trip Complete");
  });
}

function renderSteps(steps) {
  const panel = document.getElementById("directions-panel");
  panel.innerHTML = "";
  const iconMap = {
    "turn-left": "⬅️",
    "turn-right": "➡️",
    "merge": "🔀",
    "ramp-right": "↪️",
    "ramp-left": "↩️"
  };
  steps.forEach(step => {
    const div = document.createElement("div");
    const icon = iconMap[step.maneuver] || "➡️";
    div.innerHTML = `${icon} ${step.html_instructions}`;
    panel.appendChild(div);
  });
}

function logTrip(purpose, notes, distance, duration, paused) {
  const rate = parseFloat(document.getElementById("rate").value || "0");
  const reimbursement = (distance * rate).toFixed(2);
  const entry = {
    date: new Date().toLocaleString(),
    purpose,
    notes,
    miles: distance,
    duration: `${duration} min`,
    paused: `${paused} min`,
    reimbursement: `$${reimbursement}`
  };
  tripLog.push(entry);

  const li = document.createElement("li");
  li.textContent = `${entry.date} | ${entry.purpose} | ${entry.miles} mi | ${entry.reimbursement}`;
  document.getElementById("trip-log").appendChild(li);
  updateSummary();
}

function updateSummary() {
  let today = 0, week = 0;
  const todayDate = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const rate = parseFloat(document.getElementById("rate").value || "0");

  tripLog.forEach(t => {
    const d = new Date(t.date);
    const m = parseFloat(t.miles);
    if (d.toDateString() === todayDate) today += m;
    if (d.getTime() >= weekAgo) week += m;
  });

  document.getElementById("today-summary").textContent = `${today.toFixed(2)} mi | $${(today * rate).toFixed(2)}`;
  document.getElementById("today-summary").textContent = `${today.toFixed(2)} mi | $${(today * rate).toFixed(2)}`;
  document.getElementById("week-summary").textContent = `${week.toFixed(2)} mi | $${(week * rate).toFixed(2)}`;
}

function downloadCSV() {
  if (!tripLog.length) return showToast("📂 No trips to export");
  let csv = "Date,Purpose,Notes,Miles,Duration,Paused,Reimbursement\n";
  tripLog.forEach(t => {
    csv += `${t.date},${t.purpose},${t.notes},${t.miles},${t.duration},${t.paused},${t.reimbursement}\n`;
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mileage_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared");
}

function toggleHelp() {
  const h = document.getElementById("help-screen");
  h.style.display = h.style.display === "none" ? "block" : "none";
}

function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  if (!t) {
    console.warn("🚨 Toast element not found.");
    return;
  }
  t.textContent = msg;
  t.className = "show";
  t.style.backgroundColor = type === "error" ? "#B00020" : "#222";
  setTimeout(() => t.className = "", 3000);
}

function updateStatus(state) {
  const el = document.getElementById("tracking-status");
  if (el) el.textContent = state;
  document.body.classList.toggle("paused", state === "Paused");
  document.body.classList.toggle("ended", state === "Ended" || state === "Trip Complete");
}

function startMotionMonitor() {
  gpsPoller = setInterval(() => {
    // Optional fallback tracking logic could go here
  }, fallbackInterval);
}


function updateControls() {
  const startTrackingBtn = document.getElementById("startTrackingBtn");
  const pauseTrackingBtn = document.getElementById("pauseTrackingBtn");
  const resumeTrackingBtn = document.getElementById("resumeTrackingBtn");
  const endTrackingBtn = document.getElementById("endTrackingBtn");

  if (tripStatus === 'idle') {
  // Trip is idle or has ended
  startTrackingBtn.disabled = false;
  pauseTrackingBtn.disabled = true;
  resumeTrackingBtn.disabled = true;
  endTrackingBtn.disabled = true;
} else if (tripStatus === 'tracking') {
  // Actively tracking
  startTrackingBtn.disabled = true;
  pauseTrackingBtn.disabled = false;
  resumeTrackingBtn.disabled = true;
  endTrackingBtn.disabled = false;
} else if (tripStatus === 'paused') {
    //Trip has been paused
    startTrackingBtn.disabled = true;
    pauseTrackingBtn.disabled = true;
    resumeTrackingBtn.disabled = false;
    endTrackingBtn.disabled = false;
} else if (tripStatus === 'resumed') {
    //Trip has resumed after a pause
    startTrackingBtn.disabled = true;
    pauseTrackingBtn.disabled = false;
    resumeTrackingBtn.disabled = true;
    endTrackingBtn.disabled = false;
  }
}


// --- On Load ---
window.onload = function () {
  initMapServices();
  updateStatus("Idle");
  updateControls();

  const buttonHandlers = {
    startTrackingBtn: startTracking,
    pauseTrackingBtn: pauseTracking,
    resumeTrackingBtn: resumeTracking,
    endTrackingBtn: endTracking,
    downloadCSVBtn: downloadCSV,
    clearHistoryBtn: clearHistory,
    toggleHelpBtn: toggleHelp
  };

  for (const [id, handler] of Object.entries(buttonHandlers)) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
    else console.warn(`🔍 Missing button with ID: ${id}`);
  }

  document.getElementById("trip-purpose").value = "";
  document.getElementById("trip-notes").value = "";

  if (!document.getElementById("toast")) {
    console.warn("🚨 Toast element not found.");
  }

  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
    const panel = document.getElementById("directions-panel");
    if (panel) panel.innerHTML = "";
  }

const enableDebugBtn = document.getElementById("enableDebugBtn");
const debugBadge = document.getElementById("debugBadge");

function updateDebugUI() {
  if (isDebug) {
    enableDebugBtn.textContent = "🛑 Disable Debug";
    debugBadge.style.display = "inline-block";
  } else {
    enableDebugBtn.textContent = "👀 Enable Debug";
    debugBadge.style.display = "none";
  }
}

enableDebugBtn.onclick = () => {
  isDebug = !isDebug;
  localStorage.setItem("debugMode", isDebug.toString());
  updateDebugUI();

  if (isDebug && typeof eruda === "undefined") {
    const script = document.createElement("script");
    script.src = "//cdn.jsdelivr.net/npm/eruda";
    document.body.appendChild(script);
    script.onload = () => {
      eruda.init();
      console.log("🛠️ Debug mode enabled via toggle");
    };
  } else if (!isDebug) {
    if (typeof eruda !== "undefined" && typeof eruda.destroy === "function") {
      eruda.destroy();
      console.log("🔕 Debug mode disabled");
    }
  }
}
};
