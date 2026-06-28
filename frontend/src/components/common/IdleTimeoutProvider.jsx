import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useIdleTimer from "../../hooks/useIdleTimer";
import IdleWarningDialog from "./IdleWarningDialog";

/**
 * Mounts the idle timer + warning dialog system.
 * Place inside protected routes (e.g., inside DashboardLayout).
 *
 * Reads idle config from Settings:
 *   - sessionIdleEnabled
 *   - sessionIdleTimeout (minutes)
 *   - sessionIdleWarning (seconds)
 */
const IdleTimeoutProvider = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const { settings } = useSettings();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [warningOpen, setWarningOpen] = useState(false);
  const [countdownEnd, setCountdownEnd] = useState(null);

  // Convert settings to ms
  const idleEnabled = isAuthenticated && (settings?.sessionIdleEnabled ?? true);
  const idleTimeoutMs = (settings?.sessionIdleTimeout ?? 15) * 60 * 1000;
  const warningMs = (settings?.sessionIdleWarning ?? 60) * 1000;

  // When warning should appear
  const handleWarn = useCallback((endTimestamp) => {
    setCountdownEnd(endTimestamp);
    setWarningOpen(true);
  }, []);

  // When user must be logged out
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

  // User clicks "Stay Logged In"
  const handleStayLoggedIn = useCallback(() => {
    setWarningOpen(false);
    setCountdownEnd(null);
    reset();
  }, [reset]);

  // User clicks "Logout Now"
  const handleLogoutNow = useCallback(async () => {
    setWarningOpen(false);
    setCountdownEnd(null);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      navigate("/login", { replace: true });
    }
  }, [logout, navigate]);

  // Close dialog if disabled mid-session
  useEffect(() => {
    if (!idleEnabled && warningOpen) {
      setWarningOpen(false);
      setCountdownEnd(null);
    }
  }, [idleEnabled, warningOpen]);

  const value = useMemo(() => ({ reset }), [reset]);

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
