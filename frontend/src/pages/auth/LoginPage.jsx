import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || "TVSM School";
const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "2.0.1";

const schema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { login, isAuthenticated, isLoading, error, clearError, user } =
    useAuth();
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ══════════════════════════════════════════════════════════
  //  Alerts & Redirects
  // ══════════════════════════════════════════════════════════
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
        user.role === "admin"
          ? "/dashboard"
          : user.role === "principal"
            ? "/principal/dashboard"
            : "/teacher/dashboard";

      const targetRoute =
        from && from !== "/login" && from !== "/unauthorized"
          ? from
          : defaultRoute;
      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  useEffect(() => () => clearError(), []);

  // ══════════════════════════════════════════════════════════
  //  Form Handling
  // ══════════════════════════════════════════════════════════
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    clearError();
    await login(data); // Redirect is handled by the useEffect above
    setSubmitting(false);
  };

  if (isLoading) return null;

  // ══════════════════════════════════════════════════════════
  //  Visual Theme Values (Glassmorphism & Animations)
  // ══════════════════════════════════════════════════════════
  const bgGradient = isDark
    ? "linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)"
    : "linear-gradient(135deg, #E0E7FF 0%, #F1F5F9 50%, #DBEAFE 100%)";

  const glassBg = isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)";
  const glassBorder = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(255, 255, 255, 0.6)";
  const inputBg = isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.7)";

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
      {/* ─── ANIMATED BACKGROUND BLOBS ─── */}
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
          "@keyframes blob1": {
            "0%": { transform: "translate(0px, 0px) scale(1)" },
            "33%": { transform: "translate(50px, -50px) scale(1.1)" },
            "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
            "100%": { transform: "translate(0px, 0px) scale(1)" },
          },
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
          "@keyframes blob2": {
            "0%": { transform: "translate(0px, 0px) scale(1)" },
            "33%": { transform: "translate(-50px, 50px) scale(1.2)" },
            "66%": { transform: "translate(20px, -20px) scale(0.8)" },
            "100%": { transform: "translate(0px, 0px) scale(1)" },
          },
        }}
      />

      {/* ─── GLASSMORPHISM CARD ─── */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          zIndex: 1,
          animation: "fadeInUp 0.6s ease-out forwards",
          "@keyframes fadeInUp": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box
          sx={{
            bgcolor: glassBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${glassBorder}`,
            borderRadius: 4, // Modern large radius
            boxShadow: isDark
              ? "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 24px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
            p: { xs: 3.5, sm: 5 },
            textAlign: "center",
          }}
        >
          {/* Logo */}
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
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 4, fontWeight: 500 }}
          >
            Enter your credentials to access {SCHOOL_NAME}
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

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ textAlign: "left" }}
          >
            <TextField
              {...register("email")}
              placeholder="Email Address"
              type="email"
              fullWidth
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  bgcolor: inputBg,
                  borderRadius: 2.5,
                  "& fieldset": { border: "none" }, // Clean rimless look
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,1)",
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
                    <EmailOutlinedIcon sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register("password")}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                mb: 4,
                "& .MuiOutlinedInput-root": {
                  bgcolor: inputBg,
                  borderRadius: 2.5,
                  "& fieldset": { border: "none" },
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,1)",
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
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
              ) : (
                "Sign in"
              )}
            </Button>
          </Box>
        </Box>

        {/* Floating Footer */}
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
