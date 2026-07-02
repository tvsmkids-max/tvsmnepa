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
//  Helper: Redirect on cross-tab logout (only for protected pages)
// ═══════════════════════════════════════════════════════════════════
const redirectAfterCrossTabLogout = (reason = "session-expired") => {
  const currentPath = window.location.pathname;
  const publicPaths = ["/login", "/unauthorized"];

  // Only redirect if user is on a protected page
  if (publicPaths.includes(currentPath)) return;

  // Use location.href to force full reload (clears any stale state)
  window.location.href = `/login?reason=${reason}`;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ✅ FIX: Track if THIS tab initiated the logout
  // Prevents the storage event handler from double-firing
  const isSelfLogoutRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  //  Initial Auth Check (on app load)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
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
  //  ✅ FIX: Skip if THIS tab initiated the logout
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleStorageEvent = (event) => {
      // ✅ Skip if this tab initiated the logout
      if (isSelfLogoutRef.current) {
        isSelfLogoutRef.current = false; // Reset flag
        return;
      }

      // Only act on relevant keys
      const isIdleLogout =
        event.key === storage.IDLE_LOGOUT_EVENT_KEY && event.newValue;
      const isTokenRemoved =
        event.key === "sams_access_token" && !event.newValue;

      if (!isIdleLogout && !isTokenRemoved) return;

      // Dispatch logout in this tab
      dispatch({ type: "LOGOUT" });

      // ─── Redirect to login if on a protected page ───
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
  //  ✅ FIX: Set flag BEFORE clearing storage
  // ═══════════════════════════════════════════════════════════════
  const logout = useCallback(async () => {
    // ✅ Mark this as a self-initiated logout
    // Storage event handler will see this flag and skip
    isSelfLogoutRef.current = true;

    try {
      const rt = storage.getRefreshToken();
      await authApi.logout(rt);
    } catch {
      // ignore server errors — always logout locally
    } finally {
      storage.clearAuth();
      storage.broadcastLogout();
      dispatch({ type: "LOGOUT" });

      // ✅ Reset flag after a delay (in case storage event fires late)
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
