// tracking.js
import { getRoute } from './map.js';
import { renderSteps, safeUpdate, showToast, updateStatus, updateControls } from './ui.js';
import { logTrip } from './log.js';

let tracking = false;
let tripStatus = 'idle';
let tripStart = null;
let tripEnd = null;
let trackingInterval = null;
let pauseStartTime = null;
let totalPauseDuration = 0;

function startTracking() {
  tripStatus = 'tracking';
  navigator.geolocation.getCurrentPosition(pos => {
    tripStart = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };
    console.log("📍 Trip Start:", tripStart.latitude, tripStart.longitude);

    tracking = true;
    totalPauseDuration = 0;
    updateStatus("Tracking");
    showToast("🚀 Trip started!");
    updateControls();
  }, () => showToast("⚠️ Unable to access GPS", "error"));
}

function pauseTracking() {
  tripStatus = 'paused';
  clearInterval(trackingInterval);
  trackingInterval = null;
  pauseStartTime = Date.now();
  updateStatus("Paused");
  showToast("⏸️ Trip paused");
  updateControls();
}

function resumeTracking() {
  tripStatus = 'resumed';
  trackingInterval = setInterval(() => {
    // fallback location polling logic here if needed
  }, 10000);
  if (pauseStartTime) {
    totalPauseDuration += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }
  updateStatus("Tracking");
  showToast("▶️ Trip resumed");
  updateControls();
}

async function endTracking() {
  tripStatus = 'idle';
  navigator.geolocation.getCurrentPosition(async pos => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };
    console.log("📍 Trip End:", tripEnd.latitude, tripEnd.longitude);

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
        const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
        const durationMin = Math.round(leg.duration.value / 60);
        const pausedMin = Math.round(totalPauseDuration / 60000);
        const startAddress = leg.start_address;
        const endAddress = leg.end_address;
        const purpose = document.getElementById("trip-purpose").value || "–";
        const notes = document.getElementById("trip-notes").value || "–";

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
      showToast("❌ " + err.message, "error");
    }

    updateStatus("Trip Complete");
    updateControls();
    tripStart = tripEnd = null;
  }, () => {
    showToast("⚠️ GPS access failed", "error");
    updateStatus("Trip Complete");
  });
}

export {
  startTracking,
  pauseTracking,
  resumeTracking,
  endTracking
};
