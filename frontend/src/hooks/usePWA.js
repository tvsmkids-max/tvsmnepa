import { useState, useEffect, useCallback } from "react";

/**
 * PWA Hook - manages install prompt and update detection
 */
const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  // Detect if already installed/running as standalone
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", checkStandalone);

    return () => {
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", checkStandalone);
    };
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;

    const setupServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || !mounted) return;

        setRegistration(reg);

        // Check if there's a waiting worker
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (err) {
        // Service worker not available
      }
    };

    setupServiceWorker();

    return () => {
      mounted = false;
    };
  }, []);

  // Show install prompt
  const promptInstall = useCallback(async () => {
    if (!installPrompt) return { outcome: "dismissed" };

    try {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
      return result;
    } catch {
      return { outcome: "dismissed" };
    }
  }, [installPrompt]);

  // Apply update + reload
  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }

    // Tell waiting SW to take control
    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload once new SW is active
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [registration]);

  return {
    // Install
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isStandalone,
    promptInstall,

    // Update
    updateAvailable,
    applyUpdate,
  };
};

export default usePWA;
