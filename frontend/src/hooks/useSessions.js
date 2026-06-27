import { useState, useEffect } from "react";
import sessionApi from "../api/sessionApi";

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await sessionApi.list();
        if (!cancelled) {
          const list = res.data?.data || [];
          setSessions(list);
          setActiveSession(list.find((s) => s.isActive) || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
          setActiveSession(null);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { sessions, activeSession, loading };
};

export default useSessions;
