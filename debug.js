// debug.js

// Safely remove a DOM node if it's attached
function safeRemove(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

// Initialize Eruda debug tools
function enableDebug() {
  if (!window.eruda || !eruda._isInit) {
    const script = document.createElement("script");
    script.id = "eruda-script";
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.onload = () => {
      eruda.init();
      console.log("🛠️ Eruda initialized");
    };
    document.body.appendChild(script);
  }
}

// Destroy Eruda debug tools and remove script safely
function disableDebug() {
  try {
    if (window.eruda && typeof eruda.destroy === "function") {
      eruda.destroy();
      console.log("🔕 Eruda destroyed");
    }
    const script = document.getElementById("eruda-script");
    safeRemove(script);
  } catch (e) {
    console.warn("⚠️ Failed to remove Eruda:", e);
  }
}

// Entry point for toggling
function toggleDebug(enable) {
  localStorage.setItem("debugMode", enable.toString());
  enable ? enableDebug() : disableDebug();
  updateDebugUI(enable);
}

// Update UI elements when debug mode is toggled
function updateDebugUI(isDebug) {
  const badge = document.getElementById("debugBadge");
  const button = document.getElementById("enableDebugBtn");
  if (!badge || !button) return;
  badge.style.display = isDebug ? "inline-block" : "none";
  button.textContent = isDebug ? "🛑 Disable Debug" : "👀 Enable Debug";
}

// Sync toggle button on page load
function syncDebugUI() {
  const isDebug = localStorage.getItem("debugMode") === "true";
  updateDebugUI(isDebug);
  toggleDebug(isDebug);
}

export { toggleDebug, updateDebugUI, syncDebugUI };
