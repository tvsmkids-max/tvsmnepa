import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  Avatar,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ClassIcon from "@mui/icons-material/Class";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";
import authApi from "../../api/authApi";

const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || "TVSM School";
const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { login, isAuthenticated, isLoading, error, clearError, user } =
    useAuth();
  const theme = useTheme();
  const { isDark } = useThemeMode();

  const [loginOptions, setLoginOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState(""); // Used for Admin
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── PIN State (For Class Login) ───
  const [pinDigits, setPinDigits] = useState(["", "", "", "", ""]);
  const pinRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await authApi.getLoginOptions();
        if (!cancelled) {
          const options = res.data?.data || [];
          setLoginOptions(options);
          if (options.length > 0) {
            setSelectedUserId(options[0]._id);
          }
          setLoadingOptions(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingOptions(false);
          enqueueSnackbar("Failed to load login accounts", {
            variant: "error",
          });
        }
      }
    };
    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (!reason) return;

    const messages = {
      idle: { text: "⏰ Logged out due to inactivity.", variant: "warning" },
      "session-expired": {
        text: "🔒 Session expired. Please log in again.",
        variant: "warning",
      },
      "logged-out": { text: "✅ Logged out successfully.", variant: "info" },
      unauthorized: {
        text: "🚫 Please log in to access that page.",
        variant: "info",
      },
    };

    if (messages[reason]) {
      enqueueSnackbar(messages[reason].text, {
        variant: messages[reason].variant,
        autoHideDuration: 5000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, enqueueSnackbar]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      const defaultRoute =
        user.role === "admin" ? "/dashboard" : "/teacher/dashboard";

      let targetRoute = defaultRoute;
      if (
        from &&
        from !== "/login" &&
        from !== "/unauthorized" &&
        !(user.role === "class" && from === "/dashboard") &&
        !(user.role === "admin" && from === "/teacher/dashboard")
      ) {
        targetRoute = from;
      }

      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  useEffect(() => () => clearError(), [clearError]);

  // Reset fields when switching accounts
  useEffect(() => {
    setPassword("");
    setPinDigits(["", "", "", "", ""]);
  }, [selectedUserId]);

  const selectedUserObj = loginOptions.find((o) => o._id === selectedUserId);
  const isAdminLogin = selectedUserObj?.role === "admin";
  const isClassLogin = selectedUserObj?.role === "class";

  const classPin = pinDigits.join("");

  // ─── PIN Handlers ───
  const handlePinChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    // Auto-advance
    if (digit && index < 4) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 5);
    if (!pasted) return;

    const next = ["", "", "", "", ""];
    pasted.split("").forEach((ch, idx) => {
      next[idx] = ch;
    });
    setPinDigits(next);

    // Focus the next empty box or the last box
    const focusIndex = Math.min(pasted.length, 4);
    pinRefs.current[focusIndex]?.focus();
  };

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      enqueueSnackbar("Please select an account to log in", {
        variant: "warning",
      });
      return;
    }

    if (isAdminLogin) {
      if (!password) {
        enqueueSnackbar("Please enter password", { variant: "warning" });
        return;
      }
      setSubmitting(true);
      clearError();
      await login({ userId: selectedUserId, password });
      setSubmitting(false);
      return;
    }

    if (isClassLogin) {
      if (!/^\d{5}$/.test(classPin)) {
        enqueueSnackbar("Enter all 5 digits of the PIN", {
          variant: "warning",
        });
        return;
      }
      setSubmitting(true);
      clearError();
      await login({ userId: selectedUserId, password: classPin }); // PIN is sent in password field
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  const bgGradient = isDark
    ? "linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)"
    : "linear-gradient(135deg, #E0E7FF 0%, #F1F5F9 50%, #DBEAFE 100%)";

  const glassBg = isDark
    ? "rgba(15, 23, 42, 0.65)"
    : "rgba(255, 255, 255, 0.75)";
  const glassBorder = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(255, 255, 255, 0.8)";
  const inputBg = isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.8)";

  const labelSx = {
    color: "text.secondary",
    mb: 0.8,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontSize: "0.7rem",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bgGradient,
        position: "relative",
        overflow: "hidden",
        p: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: 400,
          height: 400,
          background: isDark ? "#3B82F6" : "#60A5FA",
          borderRadius: "50%",
          filter: "blur(120px)",
          opacity: isDark ? 0.2 : 0.4,
          animation: "blob1 15s infinite alternate",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: 350,
          height: 350,
          background: isDark ? "#8B5CF6" : "#818CF8",
          borderRadius: "50%",
          filter: "blur(120px)",
          opacity: isDark ? 0.2 : 0.4,
          animation: "blob2 20s infinite alternate",
        }}
      />

      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          zIndex: 1,
          animation: "fadeInUp 0.6s ease-out forwards",
        }}
      >
        <Box
          sx={{
            bgcolor: glassBg,
            backdropFilter: "blur(24px)",
            border: `1px solid ${glassBorder}`,
            borderRadius: 4,
            boxShadow: isDark
              ? "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 24px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
            p: { xs: 3.5, sm: 5 },
            textAlign: "center",
          }}
        >
          <Avatar
            src={SCHOOL_LOGO}
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 2,
              bgcolor: isDark ? "rgba(255,255,255,0.9)" : "white",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              "& img": { objectFit: "contain", p: 1 },
            }}
          />

          <Typography
            variant="h4"
            fontWeight={900}
            sx={{ mb: 0.5, letterSpacing: "-0.03em" }}
          >
            Welcome
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 4, fontWeight: 500 }}
          >
            Select account and enter {isAdminLogin ? "password" : "PIN"} to
            access {SCHOOL_NAME}
          </Typography>

          {error && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ textAlign: "left" }}
          >
            <Typography variant="caption" fontWeight={700} sx={labelSx}>
              Select Account
            </Typography>
            <FormControl
              fullWidth
              size="medium"
              sx={{ mb: 2.5 }}
              disabled={loadingOptions}
            >
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                displayEmpty
                sx={{
                  bgcolor: inputBg,
                  borderRadius: 2.5,
                  "& fieldset": { border: "none" },
                  "& .MuiSelect-select": {
                    py: 1.6,
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  },
                }}
              >
                {loadingOptions ? (
                  <MenuItem disabled value="">
                    Loading accounts...
                  </MenuItem>
                ) : (
                  loginOptions.map((opt) => (
                    <MenuItem
                      key={opt._id}
                      value={opt._id}
                      sx={{
                        py: 1.2,
                        fontWeight: opt.role === "admin" ? 800 : 700,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        {opt.role === "admin" ? (
                          <AdminPanelSettingsIcon
                            color="primary"
                            fontSize="small"
                          />
                        ) : (
                          <ClassIcon color="action" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          fontWeight={opt.role === "admin" ? 800 : 700}
                        >
                          {opt.displayName}
                        </Typography>
                      </Stack>
                      {opt.role === "admin" && (
                        <Chip
                          label="Admin"
                          size="small"
                          color="primary"
                          sx={{
                            height: 20,
                            fontSize: "0.62rem",
                            fontWeight: 800,
                          }}
                        />
                      )}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* ─── CONDITIONAL CREDENTIAL FIELD ─── */}
            {isAdminLogin ? (
              <>
                <Typography variant="caption" fontWeight={700} sx={labelSx}>
                  Password
                </Typography>
                <TextField
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    mb: 4,
                    "& .MuiOutlinedInput-root": {
                      bgcolor: inputBg,
                      borderRadius: 2.5,
                      "& fieldset": { border: "none" },
                      "&:hover": {
                        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
                      },
                      "&.Mui-focused": {
                        bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
                        boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
                      },
                    },
                    "& .MuiInputBase-input": { py: 1.8 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: "text.disabled" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                          sx={{ color: "text.secondary" }}
                        >
                          {showPassword ? (
                            <VisibilityOffOutlinedIcon fontSize="small" />
                          ) : (
                            <VisibilityOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            ) : (
              <>
                <Typography variant="caption" fontWeight={700} sx={labelSx}>
                  5-Digit PIN
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent="center"
                  sx={{ mb: 4 }}
                >
                  {pinDigits.map((digit, i) => (
                    <TextField
                      key={i}
                      inputRef={(el) => (pinRefs.current[i] = el)}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      onPaste={i === 0 ? handlePinPaste : undefined}
                      type={showPassword ? "text" : "password"}
                      inputProps={{
                        inputMode: "numeric", // ✅ Triggers number pad on mobile
                        pattern: "[0-9]*",
                        maxLength: 1,
                        autoComplete: "one-time-code",
                        style: {
                          textAlign: "center",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          padding: "12px 0",
                        },
                      }}
                      sx={{
                        width: 56,
                        "& .MuiOutlinedInput-root": {
                          bgcolor: inputBg,
                          borderRadius: 2,
                          "& fieldset": { border: "none" },
                          "&.Mui-focused": {
                            boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
                          },
                        },
                      }}
                    />
                  ))}
                </Stack>
                {/* Optional: Add eye button below PIN for class if needed */}
                <Box textAlign="right" sx={{ mt: -3, mb: 3 }}>
                  <Button
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{
                      color: "text.secondary",
                      textTransform: "none",
                      fontSize: "0.7rem",
                    }}
                    endIcon={
                      showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )
                    }
                  >
                    {showPassword ? "Hide PIN" : "Show PIN"}
                  </Button>
                </Box>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={
                submitting ||
                loadingOptions ||
                (isClassLogin && classPin.length !== 5)
              }
              endIcon={!submitting && <ArrowForwardIcon />}
              sx={{
                py: 1.8,
                fontSize: "1rem",
                fontWeight: 800,
                borderRadius: 2.5,
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.3)",
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)",
                  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.4)",
                  transform: "translateY(-2px)",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              {submitting ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : isAdminLogin ? (
                "Sign in"
              ) : (
                "Enter Class"
              )}
            </Button>
          </Box>
        </Box>

        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={1}
          sx={{ mt: 4 }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              fontWeight: 600,
            }}
          >
            TVSM v{APP_VERSION} • Developed by Abhishek
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default LoginPage;
