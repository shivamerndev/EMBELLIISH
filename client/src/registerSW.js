/**
 * Service Worker Registration for Embellish Home ERP PWA
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // In development mode, unregister any existing service worker to prevent
    // caching Vite dev assets and breaking HMR WebSocket connection.
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered successfully with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA] New app update is available. Refresh to activate.');
                } else {
                  console.log('[PWA] Embellish ERP is ready for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[PWA] ServiceWorker registration failed:', error);
        });
    });
  }
}
