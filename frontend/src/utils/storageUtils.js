const TOKEN_KEY = "sams_access_token";
const REFRESH_TOKEN_KEY = "sams_refresh_token";
const USER_KEY = "sams_user";
const IDLE_LAST_ACTIVITY_KEY = "sams_last_activity";
const IDLE_LOGOUT_EVENT_KEY = "sams_logout_event";
const THEME_MODE_KEY = "sams_theme_mode";
const PWA_INSTALL_DISMISSED_KEY = "sams_pwa_install_dismissed";

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
    // Note: theme preference is NOT cleared on logout (user pref persists)
    // Note: PWA dismiss is NOT cleared on logout (user pref persists)
  },

  // ─── IDLE TIMER STORAGE ───
  getLastActivity: () => {
    const t = localStorage.getItem(IDLE_LAST_ACTIVITY_KEY);
    return t ? parseInt(t, 10) : null;
  },
  setLastActivity: (timestamp = Date.now()) =>
    localStorage.setItem(IDLE_LAST_ACTIVITY_KEY, String(timestamp)),
  clearLastActivity: () => localStorage.removeItem(IDLE_LAST_ACTIVITY_KEY),

  broadcastLogout: () =>
    localStorage.setItem(IDLE_LOGOUT_EVENT_KEY, String(Date.now())),

  // ─── THEME MODE STORAGE ───
  getThemeMode: () => {
    try {
      return localStorage.getItem(THEME_MODE_KEY);
    } catch {
      return null;
    }
  },
  setThemeMode: (mode) => {
    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      // localStorage may be unavailable
    }
  },
  clearThemeMode: () => {
    try {
      localStorage.removeItem(THEME_MODE_KEY);
    } catch {
      // ignore
    }
  },

  // ─── PWA INSTALL DISMISSAL ───
  getPwaInstallDismissed: () => {
    try {
      const ts = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
      return ts ? parseInt(ts, 10) : null;
    } catch {
      return null;
    }
  },
  setPwaInstallDismissed: () => {
    try {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  },
  clearPwaInstallDismissed: () => {
    try {
      localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
    } catch {
      // ignore
    }
  },

  IDLE_LAST_ACTIVITY_KEY,
  IDLE_LOGOUT_EVENT_KEY,
  THEME_MODE_KEY,
};
