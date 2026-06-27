import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import axiosInstance from "../api/axiosInstance";
import { AuthContext } from "./AuthContext";

export const SettingsContext = createContext(null);

const defaults = {
  schoolName: "School",
  schoolLogo: null,
  address: "",
  phone: "",
  email: "",
  activeSession: null,
  attendanceOpenTime: "07:00",
  attendanceLockTime: "23:59",
  warningPercentage: 75,
  workingDays: [],
  timezone: "Asia/Kolkata",
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaults);
  const [isLoading, setIsLoading] = useState(true);
  const authCtx = useContext(AuthContext);
  const isAuthenticated = authCtx?.isAuthenticated ?? false;
  const hasFetched = useRef(false);

  useEffect(() => {
    hasFetched.current = false;
  }, [isAuthenticated]);

  useEffect(() => {
    const run = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      if (hasFetched.current) return;
      hasFetched.current = true;
      try {
        const res = await axiosInstance.get("/settings");
        setSettings(res.data?.data || defaults);
      } catch {
        setSettings(defaults);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [isAuthenticated]);

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/settings");
      setSettings(res.data?.data || defaults);
    } catch {
      setSettings(defaults);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const updateSettings = useCallback((s) => {
    setSettings((p) => ({ ...p, ...s }));
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, isLoading, fetchSettings, updateSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
