// utils.js

// Safely remove a DOM node if it exists and is attached
function safeRemove(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

// Safely update textContent on a target element
function safeUpdate(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found`);
  }
}

// Convert meters to miles
function formatDistance(meters) {
  return (meters / 1609.34).toFixed(2); // miles
}

// Convert seconds to minutes
function formatDuration(seconds) {
  return Math.round(seconds / 60); // minutes
}

// Human-readable timestamp
function formatDateTime(ts) {
  return new Date(ts).toLocaleString();
}

export {
  safeRemove,
  safeUpdate,
  formatDistance,
  formatDuration,
  formatDateTime
};
