const TOKEN_KEY = "sams_access_token";
const REFRESH_TOKEN_KEY = "sams_refresh_token";
const USER_KEY = "sams_user";
const IDLE_LAST_ACTIVITY_KEY = "sams_last_activity";
const IDLE_LOGOUT_EVENT_KEY = "sams_logout_event";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(REFRESH_TOKEN_KEY),

  getUser: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IDLE_LAST_ACTIVITY_KEY);
  },

  // ─── IDLE TIMER STORAGE ───
  getLastActivity: () => {
    const t = localStorage.getItem(IDLE_LAST_ACTIVITY_KEY);
    return t ? parseInt(t, 10) : null;
  },
  setLastActivity: (timestamp = Date.now()) =>
    localStorage.setItem(IDLE_LAST_ACTIVITY_KEY, String(timestamp)),
  clearLastActivity: () => localStorage.removeItem(IDLE_LAST_ACTIVITY_KEY),

  // Cross-tab logout broadcast
  broadcastLogout: () =>
    localStorage.setItem(IDLE_LOGOUT_EVENT_KEY, String(Date.now())),

  IDLE_LAST_ACTIVITY_KEY,
  IDLE_LOGOUT_EVENT_KEY,
};
