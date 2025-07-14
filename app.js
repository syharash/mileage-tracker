let tracking = false;
let trackingInterval = null;
let tripStart = null;
let tripEnd = null;
let pauseStartTime = null;
let totalPauseDuration = 0;
let directionsRenderer = new google.maps.DirectionsRenderer();
let tripState = "idle"; // idle | tracking | paused

const fallbackInterval = 60000;
const motionThreshold = 0.1;
const apiKey = "AIzaSyAInvy6GdRdnuYVJGlde1gX0VINpU5AsJI";

function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 38.58, lng: -121.49 },
    zoom: 12,
  });

  // 👉 Add any other map setup logic here:
  // - Marker placement
  // - Geolocation
  // - Direction services
}

function safeUpdate(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found`);
  }
}
function updateControls() {
  const startBtn = document.getElementById("startTrackingBtn");
  const pauseBtn = document.getElementById("pauseTrackingBtn");
  const resumeBtn = document.getElementById("resumeTrackingBtn");
  const endBtn = document.getElementById("endTrackingBtn");

  switch (tripState) {
    case "idle":
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      resumeBtn.disabled = true;
      endBtn.disabled = true;
      break;

    case "tracking":
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      resumeBtn.disabled = true;
      endBtn.disabled = false;
      break;

    case "paused":
      startBtn.disabled = true;
      pauseBtn.disabled = true;
      resumeBtn.disabled = false;
      endBtn.disabled = false;
      break;
  }
}
function startTracking() {
  navigator.geolocation.getCurrentPosition(pos => {
    tripStart = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };

    tracking = true;
    tripState = "tracking";
    trackingInterval = setInterval(() => {
      // polling logic
    }, 10000);

    updateStatus("Tracking");
    showToast("🚗 Trip started");
    updateControls();
  }, () => {
    showToast("⚠️ GPS access failed", "error");
  });
}

function pauseTracking() {
  clearInterval(trackingInterval);
  trackingInterval = null;
  pauseStartTime = Date.now();
  tripState = "paused";
  updateStatus("Paused");
  showToast("⏸️ Trip paused");
  updateControls();
}

function resumeTracking() {
  trackingInterval = setInterval(() => {
    // polling logic
  }, 10000);

  if (pauseStartTime) {
    totalPauseDuration += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }

  tripState = "tracking";
  updateStatus("Tracking");
  showToast("▶️ Trip resumed");
  updateControls();
}

function endTracking() {
  navigator.geolocation.getCurrentPosition(async pos => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };

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
        directionsRenderer.setDirections(result);
        localStorage.setItem("lastRoute", JSON.stringify(result));

        const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
        const durationMin = Math.round(leg.duration.value / 60);
        const pausedMin = Math.round(totalPauseDuration / 60000);
        const startAddress = leg.start_address;
        const endAddress = leg.end_address;
        const purpose = document.getElementById("trip-purpose")?.value || "–";
        const notes = document.getElementById("trip-notes")?.value || "–";

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
        directionsRenderer.setDirections(result);
        renderSteps(leg.steps);
        showToast("⚠️ Offline: showing last saved route");
      } else {
        showToast("❌ " + err.message, "error");
      }
    }

    tripState = "idle";
    tripStart = tripEnd = null;
    updateStatus("Trip Complete");
    updateControls();
  }, () => {
    showToast("⚠️ GPS access failed", "error");
    updateStatus("Trip Complete");
  });
}


