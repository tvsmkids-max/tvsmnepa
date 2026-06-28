import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";

const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
};

export default useThemeMode;
