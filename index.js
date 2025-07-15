// index.js

// Load the main app logic
import './main.js';

// Optional: register service worker for offline/PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('✅ Service Worker registered:', reg.scope);
    }).catch(err => {
      console.warn('⚠️ Service Worker registration failed:', err);
    });
  });
}

// Optional: handle install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // prevent default mini-infobar
  deferredPrompt = e;
  console.log('📦 Install prompt captured');

  // You can now trigger this manually (e.g., via a "Install App" button)
  // installBtn.style.display = 'block';
});

function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('👍 User accepted install');
      } else {
        console.log('👎 User dismissed install');
      }
      deferredPrompt = null;
    });
  }
}

// Optional: expose for use via custom UI
window.triggerAppInstall = triggerInstall;
