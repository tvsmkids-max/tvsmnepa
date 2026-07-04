import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import authApi from "../api/authApi";
import { storage } from "../utils/storageUtils";

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
};

// ═══════════════════════════════════════════════════════════════════
//  HELPER: Check if current path is a public page (no auth needed)
//  ✅ Management pages don't require login — never redirect them
// ═══════════════════════════════════════════════════════════════════
const isPublicPath = () => {
  const currentPath = window.location.pathname;
  return (
    currentPath === "/login" ||
    currentPath === "/unauthorized" ||
    currentPath.startsWith("/management/") // ✅ Management dashboard pages
  );
};

// ═══════════════════════════════════════════════════════════════════
//  Helper: Redirect on cross-tab logout (only for protected pages)
// ═══════════════════════════════════════════════════════════════════
const redirectAfterCrossTabLogout = (reason = "session-expired") => {
  // ✅ Never redirect on public pages (login, unauthorized, management)
  if (isPublicPath()) return;

  // Use location.href to force full reload (clears any stale state)
  window.location.href = `/login?reason=${reason}`;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isSelfLogoutRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  //  Initial Auth Check (on app load)
  //  ✅ Skip API call entirely on management pages
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // ✅ Skip auth check on management pages (they don't need login)
      if (isPublicPath()) {
        if (!cancelled) dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      const token = storage.getToken();
      const saved = storage.getUser();
      if (!token || !saved) {
        if (!cancelled) dispatch({ type: "SET_LOADING", payload: false });
        return;
      }
      try {
        const res = await authApi.getMe();
        if (!cancelled) {
          const u = res.data.data;
          storage.setUser(u);
          dispatch({ type: "LOGIN_SUCCESS", payload: u });
        }
      } catch {
        if (!cancelled) {
          storage.clearAuth();
          dispatch({ type: "LOGOUT" });
        }
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  MULTI-TAB LOGOUT SYNC
  //  ✅ Skip if THIS tab initiated the logout
  //  ✅ Skip on public pages (management, login, unauthorized)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleStorageEvent = (event) => {
      // ✅ Skip on public pages — they don't care about auth state
      if (isPublicPath()) return;

      // ✅ Skip if this tab initiated the logout
      if (isSelfLogoutRef.current) {
        isSelfLogoutRef.current = false;
        return;
      }

      const isIdleLogout =
        event.key === storage.IDLE_LOGOUT_EVENT_KEY && event.newValue;
      const isTokenRemoved =
        event.key === "sams_access_token" && !event.newValue;

      if (!isIdleLogout && !isTokenRemoved) return;

      dispatch({ type: "LOGOUT" });

      const reason = isIdleLogout ? "idle" : "session-expired";
      redirectAfterCrossTabLogout(reason);
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN
  // ═══════════════════════════════════════════════════════════════
  const login = useCallback(async (credentials) => {
    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await authApi.login(credentials);
      const { user, accessToken, refreshToken } = res.data.data;
      storage.setToken(accessToken);
      storage.setRefreshToken(refreshToken);
      storage.setUser(user);
      storage.setLastActivity();
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { success: true, user };
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      dispatch({ type: "SET_ERROR", payload: msg });
      return { success: false, message: msg };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  LOGOUT
  // ═══════════════════════════════════════════════════════════════
  const logout = useCallback(async () => {
    isSelfLogoutRef.current = true;

    try {
      const rt = storage.getRefreshToken();
      await authApi.logout(rt);
    } catch {
      // ignore server errors
    } finally {
      storage.clearAuth();
      storage.broadcastLogout();
      dispatch({ type: "LOGOUT" });

      setTimeout(() => {
        isSelfLogoutRef.current = false;
      }, 500);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE USER
  // ═══════════════════════════════════════════════════════════════
  const updateUser = useCallback((data) => {
    dispatch({ type: "UPDATE_USER", payload: data });
    storage.setUser({ ...storage.getUser(), ...data });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  CLEAR ERROR
  // ═══════════════════════════════════════════════════════════════
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAdmin: state.user?.role === "admin",
        isTeacher: state.user?.role === "teacher",
        isPrincipal: state.user?.role === "principal",
        login,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
