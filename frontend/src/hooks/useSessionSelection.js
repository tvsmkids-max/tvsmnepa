import { useCallback, useEffect, useMemo, useState } from "react";
import sessionApi from "../api/sessionApi";
import useSettings from "./useSettings";

export const SESSION_PICK_KEY = "sams_picked_session";

const readPick = () => {
  try {
    return sessionStorage.getItem(SESSION_PICK_KEY) || "";
  } catch {
    return "";
  }
};

/**
 * Session dropdown state shared by every page that has one.
 * - Opens on the system's ACTIVE session (Settings.activeSession, falling back
 *   to the session flagged active, then the first one).
 * - If the user picks another session it is remembered for the rest of this
 *   login (tab), so pages stay in step; it is cleared on logout.
 * Returns { sessions, sessionId, setSessionId, activeSessionId, loaded }.
 */
export default function useSessionSelection(onError) {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [picked, setPicked] = useState(readPick);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await sessionApi.list();
        if (!cancelled) setSessions(res.data?.data || []);
      } catch {
        if (!cancelled && onError) onError("Failed to load sessions");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settingsActive = settings?.activeSession?._id || settings?.activeSession || "";
  const activeSessionId = useMemo(() => {
    if (sessions.some((s) => s._id === settingsActive)) return settingsActive;
    return (sessions.find((s) => s.isActive) || sessions[0])?._id || "";
  }, [sessions, settingsActive]);

  const sessionId = sessions.some((s) => s._id === picked) ? picked : activeSessionId;

  const setSessionId = useCallback((id) => {
    setPicked(id);
    try {
      sessionStorage.setItem(SESSION_PICK_KEY, id);
    } catch {
      /* storage unavailable: selection just isn't remembered */
    }
  }, []);

  return { sessions, sessionId, setSessionId, activeSessionId, loaded };
}
