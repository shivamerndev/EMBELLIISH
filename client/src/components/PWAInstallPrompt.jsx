import React, { useState, useEffect } from 'react';
import { Download, X, WifiOff, Sparkles, CheckCircle2 } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Monitor online/offline state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture browser install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('[PWA] Embellish ERP successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 backdrop-blur-md shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>You are operating offline. Local data will sync automatically once connected.</span>
        </div>
      )}

      {/* PWA Installation Prompt Toast */}
      {showPrompt && !isInstalled && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 backdrop-blur-md transition-all duration-300 transform translate-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                Install Embellish ERP
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Install as a desktop & mobile app for quick access, offline work, and desktop notifications.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  Later
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowPrompt(false)}
              className="text-slate-500 hover:text-slate-300 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
