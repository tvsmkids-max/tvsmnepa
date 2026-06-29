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

const SHARED_COMPONENTS = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: "8px 20px",
        boxShadow: "none",
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
    defaultProps: { keepMounted: false },
  },
  MuiMenu: {
    defaultProps: { disableAutoFocusItem: false },
  },
};

// ═══════════════════════════════════════════════════════════
//  LIGHT THEME
// ═══════════════════════════════════════════════════════════
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
    success: { main: "#16A34A", light: "#22C55E", dark: "#15803D" },
    warning: { main: "#D97706", light: "#F59E0B", dark: "#B45309" },
    error: { main: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
    info: { main: "#0284C7", light: "#0EA5E9", dark: "#0369A1" },
    background: {
      default: "#F5F7FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#111827",
      secondary: "#6B7280",
      disabled: "#9CA3AF",
    },
    divider: "#E5E7EB",
    action: {
      hover: "rgba(0, 0, 0, 0.04)",
      selected: "rgba(0, 0, 0, 0.08)",
      disabled: "rgba(0, 0, 0, 0.26)",
      disabledBackground: "rgba(0, 0, 0, 0.12)",
    },
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    ...SHARED_COMPONENTS,
    MuiButton: {
      styleOverrides: {
        root: {
          ...SHARED_COMPONENTS.MuiButton.styleOverrides.root,
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid #E5E7EB",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#E5E7EB" },
        head: { backgroundColor: "#F9FAFB" },
      },
    },
  },
});

// ═══════════════════════════════════════════════════════════
//  DARK THEME (Tailwind-inspired — Professional SaaS)
// ═══════════════════════════════════════════════════════════
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#2563EB",
      contrastText: "#FFF",
    },
    secondary: {
      main: "#06B6D4",
      light: "#22D3EE",
      dark: "#0891B2",
      contrastText: "#FFF",
    },
    success: { main: "#22C55E", light: "#4ADE80", dark: "#16A34A" },
    warning: { main: "#F59E0B", light: "#FBBF24", dark: "#D97706" },
    error: { main: "#EF4444", light: "#F87171", dark: "#DC2626" },
    info: { main: "#0EA5E9", light: "#38BDF8", dark: "#0284C7" },
    background: {
      default: "#111827", // Gray-900 (content area)
      paper: "#1F2937", // Gray-800 (cards, papers)
    },
    text: {
      primary: "#F9FAFB", // Gray-50
      secondary: "#9CA3AF", // Gray-400
      disabled: "#6B7280", // Gray-500
    },
    divider: "#374151", // Gray-700 (visible borders!)
    action: {
      hover: "rgba(255, 255, 255, 0.06)",
      selected: "rgba(59, 130, 246, 0.12)",
      disabled: "rgba(255, 255, 255, 0.3)",
      disabledBackground: "rgba(255, 255, 255, 0.08)",
    },
  },
  typography: TYPOGRAPHY,
  shape: SHAPE,
  components: {
    ...SHARED_COMPONENTS,
    MuiButton: {
      styleOverrides: {
        root: {
          ...SHARED_COMPONENTS.MuiButton.styleOverrides.root,
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.3)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "none",
          border: "1px solid #374151",
          backgroundImage: "none",
          backgroundColor: "#1F2937",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1F2937",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset": { borderColor: "#374151" },
            "&:hover fieldset": { borderColor: "#4B5563" },
            "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
          },
          "& .MuiInputBase-input": { color: "#F9FAFB" },
          "& .MuiInputLabel-root": { color: "#9CA3AF" },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: "#9CA3AF" },
      },
    },
    MuiMenu: {
      defaultProps: { disableAutoFocusItem: false },
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#1F2937",
          border: "1px solid #374151",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#1F2937",
          border: "1px solid #374151",
        },
      },
      defaultProps: {
        disableEnforceFocus: false,
        disableAutoFocus: false,
        disableRestoreFocus: false,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#374151" },
        head: { backgroundColor: "#1F2937 !important" },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "#374151" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#374151",
          color: "#F9FAFB",
          fontSize: "0.75rem",
          border: "1px solid #4B5563",
        },
        arrow: { color: "#374151" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardInfo: {
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          color: "#93C5FD",
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          color: "#FCD34D",
        },
        standardError: {
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          color: "#FCA5A5",
        },
        standardSuccess: {
          backgroundColor: "rgba(34, 197, 94, 0.12)",
          color: "#86EFAC",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
        outlined: {
          borderColor: "#374151",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: "#374151",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: "#4B5563",
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: "#1F2937",
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: "#9CA3AF",
          "&.Mui-selected": {
            color: "#3B82F6",
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#9CA3AF",
          "&.Mui-selected": {
            color: "#3B82F6",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#3B82F6",
        },
      },
    },
  },
});

export default lightTheme;
