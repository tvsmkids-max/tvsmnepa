import { useState, useEffect, useRef, useCallback } from "react";
import notificationApi from "../api/notificationApi";
import useAuth from "./useAuth";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const CACHE_DURATION_MS = 30 * 1000; // 30 seconds

/**
 * Hook for notification count + list management.
 * - Auto-polls every 60s
 * - Pauses when tab is hidden (battery saver)
 * - Caches count for 30s to prevent duplicate requests
 * - Auto-stops when user logs out
 */
const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const lastFetchRef = useRef(0);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Fetch count (with cache)
  const fetchCount = useCallback(
    async (force = false) => {
      if (!isAuthenticated) return;

      const now = Date.now();
      if (!force && now - lastFetchRef.current < CACHE_DURATION_MS) {
        return; // Use cached value
      }

      try {
        const res = await notificationApi.getUnreadCount();
        if (mountedRef.current) {
          setUnreadCount(res.data?.data?.count || 0);
          lastFetchRef.current = now;
        }
      } catch (err) {
        // Silent fail (don't show error toast every minute)
        if (mountedRef.current) {
          // Keep previous count
        }
      }
    },
    [isAuthenticated],
  );

  // Setup polling
  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchCount(true);

    // Start polling
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          fetchCount(true);
        }
      }, POLL_INTERVAL_MS);
    };

    startPolling();

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchCount(true); // Immediate fetch when tab becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAuthenticated, fetchCount]);

  // Fetch full list (for dropdown)
  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return [];
    setLoading(true);
    try {
      const res = await notificationApi.list();
      return res.data?.data || [];
    } catch {
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isAuthenticated]);

  // Mark single as read
  const markAsRead = useCallback(
    async (id) => {
      try {
        await notificationApi.markAsRead(id);
        await fetchCount(true);
      } catch {
        // Silent fail
      }
    },
    [fetchCount],
  );

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      await fetchCount(true);
      return true;
    } catch {
      return false;
    }
  }, [fetchCount]);

  // Refresh manually
  const refresh = useCallback(() => fetchCount(true), [fetchCount]);

  return {
    unreadCount,
    loading,
    fetchList,
    markAsRead,
    markAllRead,
    refresh,
  };
};

export default useNotifications;
