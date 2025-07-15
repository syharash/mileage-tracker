import { toggleDebug, updateDebugUI } from './debug.js';
import { startTracking, pauseTracking, resumeTracking, endTracking } from './tracking.js';
import { downloadCSV, clearHistory } from './log.js';
import { toggleHelp, updateControls } from './ui.js';

window.onload = () => {
  toggleDebug(localStorage.getItem("debugMode") === "true");
  updateControls();

  const buttonHandlers = {
    startTrackingBtn: startTracking,
    pauseTrackingBtn: pauseTracking,
    resumeTrackingBtn: resumeTracking,
    endTrackingBtn: endTracking,
    downloadCSVBtn: downloadCSV,
    clearHistoryBtn: clearHistory,
    toggleHelpBtn: toggleHelp,
  };

  for (const [id, handler] of Object.entries(buttonHandlers)) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
  }
};
