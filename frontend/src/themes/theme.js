import { createTheme } from "@mui/material/styles";

const theme = createTheme({
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
    background: { default: "#F5F7FA", paper: "#FFFFFF" },
    text: { primary: "#1A1A2E", secondary: "#4A5568" },
    divider: "#E2E8F0",
  },
  typography: {
    fontFamily: '"Inter","Roboto","Helvetica","Arial",sans-serif',
    h4: { fontSize: "1.5rem", fontWeight: 700 },
    h5: { fontSize: "1.25rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    body1: { fontSize: "0.95rem", lineHeight: 1.6 },
    body2: { fontSize: "0.85rem", lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 10 },
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
    // ─── FIX: Accessibility for dialogs/modals ───
    MuiDialog: {
      defaultProps: {
        // Disable aria-hidden on root, use inert instead
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
        // Better keyboard navigation
        disableAutoFocusItem: false,
      },
    },
  },
});

export default theme;
