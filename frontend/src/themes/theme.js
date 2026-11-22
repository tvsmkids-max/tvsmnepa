import { createTheme } from "@mui/material/styles";

// ─── SHARED TYPOGRAPHY & TOKENS ───
const TYPOGRAPHY = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.01em" },
  h5: { fontSize: "1.25rem", fontWeight: 600 },
  h6: { fontSize: "1rem", fontWeight: 600 },
  body1: { fontSize: "0.95rem", lineHeight: 1.5, letterSpacing: "-0.01em" },
  body2: { fontSize: "0.85rem", lineHeight: 1.5 },
  button: { fontWeight: 600, textTransform: "none" },
  caption: { letterSpacing: "0.02em" },
};

// Small radius: sx `borderRadius: n` multiplies this (2 => 12px, 3 => 18px).
const SHAPE = { borderRadius: 6 };

const SHARED_COMPONENTS = {
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }) => ({
        "&.MuiPaper-elevation0": { border: `1px solid ${theme.palette.divider}` },
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 6, padding: "7px 16px", boxShadow: "none" },
      contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
    },
  },
  MuiTextField: {
    styleOverrides: { root: { "& .MuiOutlinedInput-root": { borderRadius: 6 } } },
  },
  MuiChip: {
    styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } },
  },
  MuiCard: {
    styleOverrides: { root: { borderRadius: 8 } },
  },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: 10 } },
  },
  MuiTableCell: {
    styleOverrides: { head: { fontWeight: 600 } },
  },
  MuiMenu: {
    defaultProps: { disableAutoFocusItem: false },
    styleOverrides: { paper: { borderRadius: 8, padding: "4px" } },
  },
};

// ═══════════════════════════════════════════════════════════
//  LIGHT THEME (Premium SaaS Look)
// ═══════════════════════════════════════════════════════════
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0F172A", // Deep Slate (Premium Navy)
      light: "#334155",
      dark: "#020617",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#3B82F6", // Vivid Blue accent
      light: "#60A5FA",
      dark: "#2563EB",
      contrastText: "#FFFFFF",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
      contrastText: "#FFF",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#FFF",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
      contrastText: "#FFF",
    },
    info: {
      main: "#0EA5E9",
      light: "#38BDF8",
      dark: "#0284C7",
      contrastText: "#FFF",
    },
    background: {
      default: "#F8FAFC", // Off-white/slate for background depth
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A", // Slate 900
      secondary: "#64748B", // Slate 500
      disabled: "#94A3B8", // Slate 400
    },
    divider: "#E2E8F0", // Slate 200
    action: {
      hover: "#F1F5F9",
      selected: "#E2E8F0",
      disabled: "rgba(15, 23, 42, 0.26)",
      disabledBackground: "rgba(15, 23, 42, 0.08)",
    },
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    ...SHARED_COMPONENTS,
    MuiCard: {
      styleOverrides: {
        root: {
          ...SHARED_COMPONENTS.MuiCard.styleOverrides.root,
          border: "1px solid #E2E8F0",
          boxShadow: "none",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...SHARED_COMPONENTS.MuiMenu.styleOverrides.paper,
          boxShadow: "0px 6px 20px rgba(15, 23, 42, 0.10)",
          border: "1px solid #E2E8F0",
        },
      },
    },
  },
});

// ═══════════════════════════════════════════════════════════
//  DARK THEME (Sleek Slate)
// ═══════════════════════════════════════════════════════════
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#2563EB",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#0EA5E9",
      light: "#38BDF8",
      dark: "#0284C7",
      contrastText: "#FFFFFF",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
      contrastText: "#FFF",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#FFF",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
      contrastText: "#FFF",
    },
    info: {
      main: "#0EA5E9",
      light: "#38BDF8",
      dark: "#0284C7",
      contrastText: "#FFF",
    },
    background: {
      default: "#0B0F19", // Very deep premium blue-black
      paper: "#111827", // Slightly lighter for cards
    },
    text: {
      primary: "#F8FAFC",
      secondary: "#94A3B8",
      disabled: "#64748B",
    },
    divider: "#1E293B", // Visible subtle dark border
    action: {
      hover: "rgba(255, 255, 255, 0.05)",
      selected: "rgba(59, 130, 246, 0.12)",
      disabled: "rgba(255, 255, 255, 0.2)",
      disabledBackground: "rgba(255, 255, 255, 0.05)",
    },
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    ...SHARED_COMPONENTS,
    MuiCard: {
      styleOverrides: {
        root: {
          ...SHARED_COMPONENTS.MuiCard.styleOverrides.root,
          border: "1px solid #1E293B",
          boxShadow: "none",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 6,
            "& fieldset": { borderColor: "#334155" },
            "&:hover fieldset": { borderColor: "#475569" },
            "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...SHARED_COMPONENTS.MuiMenu.styleOverrides.paper,
          backgroundColor: "#111827",
          border: "1px solid #1E293B",
          boxShadow: "0px 10px 38px rgba(0,0,0,0.5)",
        },
      },
    },
  },
});
