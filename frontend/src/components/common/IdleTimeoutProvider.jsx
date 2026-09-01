import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useIdleTimer from "../../hooks/useIdleTimer";
import IdleWarningDialog from "./IdleWarningDialog";

/**
 * Idle timer + warning dialog.
 * Must wrap protected layout (DashboardLayout).
 *
 * Settings (expected keys):
 *   sessionIdleEnabled  boolean
 *   sessionIdleTimeout  minutes (e.g. 1, 15)
 *   sessionIdleWarning  seconds (e.g. 60) — clamped if >= idle timeout
 */
const IdleTimeoutProvider = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const { settings } = useSettings();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [warningOpen, setWarningOpen] = useState(false);
  const [countdownEnd, setCountdownEnd] = useState(null);

  const idleEnabled =
    Boolean(isAuthenticated) && (settings?.sessionIdleEnabled ?? true);

  // Minutes → ms (fallback 15 min)
  const rawTimeoutMin = Number(settings?.sessionIdleTimeout);
  const idleTimeoutMs =
    (Number.isFinite(rawTimeoutMin) && rawTimeoutMin > 0 ? rawTimeoutMin : 15) *
    60 *
    1000;

  // Warning: settings in SECONDS (fallback 60). Clamp vs idle length.
  const rawWarnSec = Number(settings?.sessionIdleWarning);
  let warningMs =
    (Number.isFinite(rawWarnSec) && rawWarnSec > 0 ? rawWarnSec : 60) * 1000;

  // e.g. idle 1 min + warn 60s → force warn to half of idle (30s)
  warningMs = Math.min(warningMs, Math.floor(idleTimeoutMs * 0.5));
  warningMs = Math.max(3000, Math.min(warningMs, idleTimeoutMs - 2000));

  const handleWarn = useCallback((endTimestamp) => {
    setCountdownEnd(endTimestamp);
    setWarningOpen(true);
  }, []);

  const handleIdle = useCallback(async () => {
    setWarningOpen(false);
    setCountdownEnd(null);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      enqueueSnackbar("You have been logged out due to inactivity", {
        variant: "warning",
        autoHideDuration: 6000,
      });
      navigate("/login?reason=idle", { replace: true });
    }
  }, [logout, enqueueSnackbar, navigate]);

  const { reset } = useIdleTimer({
    enabled: idleEnabled,
    idleTimeoutMs,
    warningMs,
    onWarn: handleWarn,
    onIdle: handleIdle,
  });

  const handleStayLoggedIn = useCallback(() => {
    setWarningOpen(false);
    setCountdownEnd(null);
    reset();
  }, [reset]);

  const handleLogoutNow = useCallback(async () => {
    setWarningOpen(false);
    setCountdownEnd(null);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      navigate("/login?reason=logged-out", { replace: true });
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (!idleEnabled && warningOpen) {
      setWarningOpen(false);
      setCountdownEnd(null);
    }
  }, [idleEnabled, warningOpen]);

  // Debug helper (remove later): log effective timings once settings load
  useEffect(() => {
    if (!idleEnabled || !settings) return;
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[IdleTimeout]", {
        enabled: idleEnabled,
        timeoutMin: idleTimeoutMs / 60000,
        warningSec: warningMs / 1000,
        settingsTimeout: settings.sessionIdleTimeout,
        settingsWarning: settings.sessionIdleWarning,
        settingsEnabled: settings.sessionIdleEnabled,
      });
    }
  }, [idleEnabled, idleTimeoutMs, warningMs, settings]);

  return (
    <>
      {children}
      {idleEnabled && (
        <IdleWarningDialog
          open={warningOpen}
          countdownEnd={countdownEnd}
          totalWarningMs={warningMs}
          onStayLoggedIn={handleStayLoggedIn}
          onLogoutNow={handleLogoutNow}
        />
      )}
    </>
  );
};

export default IdleTimeoutProvider;
