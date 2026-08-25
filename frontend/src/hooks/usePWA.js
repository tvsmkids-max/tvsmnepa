import { useState, useEffect, useCallback } from "react";

/**
 * PWA Hook - Manages install prompt and lightning-fast update detection
 */
const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  // Detect if already installed / running as standalone PWA
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

  // Listen for native install prompt
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

  // Listen for background Service Worker updates
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;

    const setupServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || !mounted) return;

        setRegistration(reg);

        // Check if there's already a waiting worker ready
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for newly installed background workers
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
        // Silent fail for non-PWA environments
      }
    };

    setupServiceWorker();

    return () => {
      mounted = false;
    };
  }, []);

  // Show native install prompt
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

  // ═════════════════════════════════════════════════════════════════
  //  LIGHTNING-FAST UPDATE HANDLER (With Guarded 400ms Failsafe)
  // ═════════════════════════════════════════════════════════════════
  const applyUpdate = useCallback(() => {
    let hasReloaded = false;

    const executeReload = () => {
      if (!hasReloaded) {
        hasReloaded = true;
        window.location.reload();
      }
    };

    if (registration?.waiting) {
      // 1. Tell waiting service worker to skip waiting immediately
      registration.waiting.postMessage({ type: "SKIP_WAITING" });

      // 2. Reload when controller changes
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        executeReload,
        {
          once: true,
        },
      );

      // 3. FAILSAFE: If controllerchange event takes longer than 400ms, force reload
      setTimeout(executeReload, 400);
    } else {
      // No waiting worker -> reload directly
      executeReload();
    }
  }, [registration]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isStandalone,
    promptInstall,
    updateAvailable,
    applyUpdate,
  };
};

export default usePWA;
