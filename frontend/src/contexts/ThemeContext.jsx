import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "../themes/theme";
import { storage } from "../utils/storageUtils";

export const ThemeContext = createContext(null);

const THEME_MODES = {
  LIGHT: "light",
  DARK: "dark",
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to light
  const [mode, setMode] = useState(() => {
    const saved = storage.getThemeMode?.();
    if (saved === THEME_MODES.DARK || saved === THEME_MODES.LIGHT) {
      return saved;
    }
    return THEME_MODES.LIGHT;
  });

  // Save to localStorage on change
  useEffect(() => {
    storage.setThemeMode?.(mode);
  }, [mode]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setMode((prev) =>
      prev === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT,
    );
  }, []);

  // Set specific theme
  const setTheme = useCallback((newMode) => {
    if (newMode === THEME_MODES.DARK || newMode === THEME_MODES.LIGHT) {
      setMode(newMode);
    }
  }, []);

  // Memoized theme object
  const theme = useMemo(
    () => (mode === THEME_MODES.DARK ? darkTheme : lightTheme),
    [mode],
  );

  const isDark = mode === THEME_MODES.DARK;

  // Apply meta theme-color for mobile browsers
  useEffect(() => {
    const themeColor = isDark ? "#0F172A" : "#1565C0";
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = "theme-color";
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", themeColor);
  }, [isDark]);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      isLight: !isDark,
      toggleTheme,
      setTheme,
    }),
    [mode, isDark, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
