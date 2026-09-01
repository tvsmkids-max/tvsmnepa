import { useEffect, useRef, useCallback, useState } from "react";
import { storage } from "../utils/storageUtils";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

const MOUSE_THROTTLE_MS = 1000;
const STORAGE_SYNC_INTERVAL_MS = 1000;

/**
 * Tracks user inactivity → warning + logout.
 */
const useIdleTimer = ({
  enabled = true,
  idleTimeoutMs = 15 * 60 * 1000,
  warningMs = 60 * 1000,
  onWarn,
  onIdle,
  onActivity,
}) => {
  const lastActivityRef = useRef(Date.now());
  const lastMouseMoveRef = useRef(0);
  const warnTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isWarningActiveRef = useRef(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Keep latest callbacks without re-binding window listeners every render
  const onWarnRef = useRef(onWarn);
  const onIdleRef = useRef(onIdle);
  const onActivityRef = useRef(onActivity);
  const idleTimeoutRef = useRef(idleTimeoutMs);
  const warningMsRef = useRef(warningMs);

  useEffect(() => {
    onWarnRef.current = onWarn;
    onIdleRef.current = onIdle;
    onActivityRef.current = onActivity;
  }, [onWarn, onIdle, onActivity]);

  useEffect(() => {
    idleTimeoutRef.current = idleTimeoutMs;
    warningMsRef.current = warningMs;
  }, [idleTimeoutMs, warningMs]);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    if (!enabled) return;

    const idleMs = Math.max(5000, idleTimeoutRef.current || 15 * 60 * 1000);
    // Warning must be shorter than idle (e.g. 1 min idle + 60s warn was broken)
    let warnMs = warningMsRef.current || 60 * 1000;
    warnMs = Math.min(warnMs, Math.floor(idleMs * 0.5));
    warnMs = Math.max(3000, Math.min(warnMs, idleMs - 2000));

    const warningDelay = Math.max(0, idleMs - warnMs);

    warnTimerRef.current = setTimeout(() => {
      isWarningActiveRef.current = true;
      if (typeof onWarnRef.current === "function") {
        onWarnRef.current(Date.now() + warnMs);
      }
    }, warningDelay);

    idleTimerRef.current = setTimeout(() => {
      isWarningActiveRef.current = false;
      if (typeof onIdleRef.current === "function") {
        onIdleRef.current();
      }
    }, idleMs);
  }, [enabled, clearTimers]);

  const reset = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivity(now);
    try {
      storage.setLastActivity?.(now);
    } catch {
      // ignore storage errors
    }
    isWarningActiveRef.current = false;
    scheduleTimers();
    if (typeof onActivityRef.current === "function") {
      onActivityRef.current();
    }
  }, [enabled, scheduleTimers]);

  const handleActivity = useCallback(
    (event) => {
      if (!enabled) return;

      if (event?.type === "mousemove") {
        const now = Date.now();
        if (now - lastMouseMoveRef.current < MOUSE_THROTTLE_MS) return;
        lastMouseMoveRef.current = now;
      }

      // While warning is open, only explicit "Stay logged in" should reset
      // (dialog buttons call reset). Still allow keyboard/click outside dialog
      // to count as activity if user is working — standard is to reset on activity.
      reset();
    },
    [enabled, reset],
  );

  // Attach listeners once per enabled flag; schedule from reset
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return undefined;
    }

    reset();

    ACTIVITY_EVENTS.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, handleActivity, reset, clearTimers]);

  // Re-schedule when timeout settings change (without relying on unstable callbacks)
  useEffect(() => {
    if (!enabled) return;
    scheduleTimers();
  }, [enabled, idleTimeoutMs, warningMs, scheduleTimers]);

  // Cross-tab activity sync
  useEffect(() => {
    if (!enabled) return undefined;

    const syncInterval = setInterval(() => {
      let storedActivity = null;
      try {
        storedActivity = storage.getLastActivity?.();
      } catch {
        return;
      }
      if (!storedActivity) return;

      if (storedActivity > lastActivityRef.current) {
        lastActivityRef.current = storedActivity;
        setLastActivity(storedActivity);
        isWarningActiveRef.current = false;
        scheduleTimers();
      }
    }, STORAGE_SYNC_INTERVAL_MS);

    return () => clearInterval(syncInterval);
  }, [enabled, scheduleTimers]);

  return {
    reset,
    lastActivity,
  };
};

export default useIdleTimer;
