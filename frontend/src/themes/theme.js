import { createTheme } from "@mui/material/styles";

// ─── SHARED CONSTANTS ───
const TYPOGRAPHY = {
  fontFamily: '"Inter","Roboto","Helvetica","Arial",sans-serif',
  h4: { fontSize: "1.5rem", fontWeight: 700 },
  h5: { fontSize: "1.25rem", fontWeight: 600 },
  h6: { fontSize: "1rem", fontWeight: 600 },
  body1: { fontSize: "0.95rem", lineHeight: 1.6 },
  body2: { fontSize: "0.85rem", lineHeight: 1.6 },
  button: { fontWeight: 600, textTransform: "none" },
};

const SHAPE = { borderRadius: 10 };

// ─── LIGHT THEME ───
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565C0",
      light: "#1976D2",
      dark: "#0D47A1",
      contrastText: "#FFF",
    },
    secondary: {
      main: "#0097A7",
      light: "#00BCD4",
      dark: "#006064",
      contrastText: "#FFF",
    },
    success: { main: "#2E7D32", light: "#4CAF50", dark: "#1B5E20" },
    warning: { main: "#F57F17", light: "#FFA726", dark: "#E65100" },
    error: { main: "#C62828", light: "#EF5350", dark: "#B71C1C" },
    info: { main: "#0277BD", light: "#0288D1", dark: "#01579B" },
    background: {
      default: "#F5F7FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A2E",
      secondary: "#4A5568",
    },
    divider: "#E2E8F0",
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
          boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #E2E8F0",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 8 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
      },
    },
    MuiDialog: {
      defaultProps: {
        disableEnforceFocus: false,
        disableAutoFocus: false,
        disableRestoreFocus: false,
      },
    },
    MuiModal: {
      defaultProps: {
        keepMounted: false,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableAutoFocusItem: false,
      },
    },
  },
});

// ─── DARK THEME ───
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3B82F6", // Brighter blue for dark
      light: "#60A5FA",
      dark: "#1E40AF",
      contrastText: "#FFF",
    },
    secondary: {
      main: "#06B6D4",
      light: "#22D3EE",
      dark: "#0891B2",
      contrastText: "#FFF",
    },
    success: { main: "#22C55E", light: "#4ADE80", dark: "#15803D" },
    warning: { main: "#F59E0B", light: "#FBBF24", dark: "#D97706" },
    error: { main: "#EF4444", light: "#F87171", dark: "#B91C1C" },
    info: { main: "#3B82F6", light: "#60A5FA", dark: "#1E40AF" },
    background: {
      default: "#0F172A", // Deep navy
      paper: "#1E293B", // Card background
    },
    text: {
      primary: "#F1F5F9",
      secondary: "#94A3B8",
      disabled: "#64748B",
    },
    divider: "#334155",
    action: {
      hover: "rgba(255, 255, 255, 0.05)",
      selected: "rgba(59, 130, 246, 0.15)",
      disabled: "rgba(255, 255, 255, 0.3)",
      disabledBackground: "rgba(255, 255, 255, 0.08)",
    },
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
          boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.3)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          border: "1px solid #334155",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset": {
              borderColor: "#334155",
            },
            "&:hover fieldset": {
              borderColor: "#475569",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#3B82F6",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
        },
      },
      defaultProps: {
        disableEnforceFocus: false,
        disableAutoFocus: false,
        disableRestoreFocus: false,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableAutoFocusItem: false,
      },
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#334155",
        },
        head: {
          backgroundColor: "#1E293B !important",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#334155",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#334155",
          fontSize: "0.75rem",
        },
        arrow: {
          color: "#334155",
        },
      },
    },
  },
});

// ─── DEFAULT EXPORT (light for backward compat) ───
export default lightTheme;
