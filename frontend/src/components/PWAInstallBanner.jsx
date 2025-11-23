import { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Download, Smartphone, Zap, Shield } from 'lucide-react';

export default function PWAInstallBanner() {
  const { canInstall, promptInstall, isStandalone } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissTime = localStorage.getItem('pwa-install-dismiss-time');

    // Re-show banner after 7 days
    if (dismissed && dismissTime) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        setIsDismissed(true);
      }
    } else if (dismissed) {
      setIsDismissed(true);
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
      setShowIOSInstructions(true);
    }

    // Show banner after a small delay for better UX
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [isStandalone]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsDismissed(true);
      localStorage.setItem('pwa-installed', 'true');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('pwa-install-dismiss-time', Date.now().toString());
    }, 300);
  };

  // Don't show if dismissed, already installed, or running in standalone
  if (isDismissed || isStandalone || !isVisible) {
    return null;
  }

  // iOS Instructions Banner
  if (showIOSInstructions && !canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl z-50 animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base mb-1.5">Instala SafeLine</h3>
              <p className="text-sm opacity-95 leading-relaxed">
                Toca el botón <span className="inline-flex items-center mx-1 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-md font-semibold">
                  <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                  Compartir
                </span> y luego <strong>"Agregar a inicio"</strong>
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs opacity-80">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Acceso rápido
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Modo offline
                </span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:rotate-90"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge/Samsung Install Banner
  if (canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl z-50 animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Download className="w-7 h-7 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg mb-1">Instala SafeLine</h3>
              <p className="text-sm opacity-95 leading-tight">
                Protección 24/7 contra fraudes, acceso rápido
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs opacity-80">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Ultra rápida
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 100% segura
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-opacity-90 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:rotate-90 hidden sm:block"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="sm:hidden absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-all duration-200"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
