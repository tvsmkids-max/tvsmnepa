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
 * Tracks user inactivity and triggers warning + logout callbacks.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Master switch
 * @param {number} options.idleTimeoutMs - Total idle time before logout (ms)
 * @param {number} options.warningMs - Warning duration before logout (ms)
 * @param {Function} options.onWarn - Called when warning should appear (receives countdown end timestamp)
 * @param {Function} options.onIdle - Called when user must be logged out
 * @param {Function} options.onActivity - Called whenever activity detected (optional)
 *
 * @returns {Object} { reset, lastActivity }
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

  // Clear all timers
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

  // Schedule warning + logout
  const scheduleTimers = useCallback(() => {
    clearTimers();

    if (!enabled) return;

    const warningDelay = Math.max(0, idleTimeoutMs - warningMs);

    // Schedule warning
    warnTimerRef.current = setTimeout(() => {
      isWarningActiveRef.current = true;
      if (typeof onWarn === "function") {
        onWarn(Date.now() + warningMs);
      }
    }, warningDelay);

    // Schedule logout
    idleTimerRef.current = setTimeout(() => {
      isWarningActiveRef.current = false;
      if (typeof onIdle === "function") {
        onIdle();
      }
    }, idleTimeoutMs);
  }, [enabled, idleTimeoutMs, warningMs, onWarn, onIdle, clearTimers]);

  // Reset timer + record activity
  const reset = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivity(now);
    storage.setLastActivity(now);
    isWarningActiveRef.current = false;
    scheduleTimers();
    if (typeof onActivity === "function") onActivity();
  }, [enabled, scheduleTimers, onActivity]);

  // Activity handler (throttled for mousemove)
  const handleActivity = useCallback(
    (event) => {
      if (!enabled) return;

      // Throttle mousemove
      if (event && event.type === "mousemove") {
        const now = Date.now();
        if (now - lastMouseMoveRef.current < MOUSE_THROTTLE_MS) return;
        lastMouseMoveRef.current = now;
      }

      reset();
    },
    [enabled, reset],
  );

  // Setup activity listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial activity record
    reset();

    // Attach listeners
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

  // Cross-tab activity sync
  // If another tab records activity, we update our timer too
  useEffect(() => {
    if (!enabled) return;

    const syncInterval = setInterval(() => {
      const storedActivity = storage.getLastActivity();
      if (!storedActivity) return;

      // Another tab had more recent activity → sync
      if (storedActivity > lastActivityRef.current) {
        lastActivityRef.current = storedActivity;
        setLastActivity(storedActivity);
        if (isWarningActiveRef.current) {
          // Cancel warning since another tab was active
          isWarningActiveRef.current = false;
        }
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
