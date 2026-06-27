import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
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

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

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

  const login = useCallback(async (credentials) => {
    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await authApi.login(credentials);
      const { user, accessToken, refreshToken } = res.data.data;
      storage.setToken(accessToken);
      storage.setRefreshToken(refreshToken);
      storage.setUser(user);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { success: true, user };
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      dispatch({ type: "SET_ERROR", payload: msg });
      return { success: false, message: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = storage.getRefreshToken();
      await authApi.logout(rt);
    } catch {
    } finally {
      storage.clearAuth();
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  const updateUser = useCallback((data) => {
    dispatch({ type: "UPDATE_USER", payload: data });
    storage.setUser({ ...storage.getUser(), ...data });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAdmin: state.user?.role === "admin",
        isTeacher: state.user?.role === "teacher",
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
