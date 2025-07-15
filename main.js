// main.js

import { toggleDebug, syncDebugUI } from './debug.js';
import {
  startTracking,
  pauseTracking,
  resumeTracking,
  endTracking
} from './tracking.js';
import { downloadCSV, clearHistory } from './log.js';
import { toggleHelp, updateStatus, updateControls, showToast } from './ui.js';
import { initMapServices, clearDirections } from './map.js';

// Optional: preload interface
window.onload = () => {
  // Sync debug mode from localStorage
  syncDebugUI();

  // Initialize map services and UI state
  initMapServices();
  clearDirections();
  updateStatus("Idle");
  updateControls();
  showToast("🧭 Mileage Tracker Ready");

  // Button binding map
  const buttonHandlers = {
    startTrackingBtn: startTracking,
    pauseTrackingBtn: pauseTracking,
    resumeTrackingBtn: resumeTracking,
    endTrackingBtn: endTracking,
    downloadCSVBtn: downloadCSV,
    clearHistoryBtn: clearHistory,
    toggleHelpBtn: toggleHelp,
    enableDebugBtn: () => {
      const active = localStorage.getItem("debugMode") === "true";
      toggleDebug(!active);
    }
  };

  for (const [id, handler] of Object.entries(buttonHandlers)) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
    else console.warn(`🔍 Button not found: ${id}`);
  }

  // Reset fields on load
  const purposeField = document.getElementById("trip-purpose");
  const notesField = document.getElementById("trip-notes");
  if (purposeField) purposeField.value = "";
  if (notesField) notesField.value = "";

  // Toast existence check
  if (!document.getElementById("toast")) {
    console.warn("🚨 Toast element missing");
  }
};
