import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || "TVSM School";
const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const schema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError, user } =
    useAuth();
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Redirect if already authenticated ──
  useEffect(() => {
    if (isAuthenticated && user) {
      const route =
        user.role === "admin"
          ? "/dashboard"
          : user.role === "principal"
            ? "/principal/dashboard"
            : "/teacher/dashboard";
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // ── Clear error on unmount ──
  useEffect(() => () => clearError(), []);

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
    const result = await login(data);
    if (result.success) {
      const route =
        result.user?.role === "admin"
          ? "/dashboard"
          : result.user?.role === "principal"
            ? "/principal/dashboard"
            : "/teacher/dashboard";
      navigate(route, { replace: true });
    }
    setSubmitting(false);
  };

  if (isLoading) return null;

  // ── Theme-aware values ──
  const rightPanelBg = isDark
    ? theme.palette.background.default // #111827
    : "#F8F9FC";

  const cardBg = isDark
    ? theme.palette.background.paper // #1F2937
    : "#FFFFFF";

  const cardBorder = isDark
    ? `1px solid ${theme.palette.divider}` // #374151
    : "1px solid rgba(0,0,0,0.04)";

  const cardShadow = isDark
    ? "0 4px 24px rgba(0,0,0,0.4)"
    : "0 4px 6px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.06)";

  const labelColor = isDark
    ? theme.palette.text.secondary // #9CA3AF
    : "#374151";

  const subtitleColor = isDark ? theme.palette.text.secondary : "#6B7B99";

  const inputBg = isDark ? alpha(theme.palette.common.white, 0.04) : "#F8F9FC";

  const inputHoverBg = isDark
    ? alpha(theme.palette.common.white, 0.07)
    : "#F1F3F9";

  const inputFocusBg = isDark
    ? alpha(theme.palette.common.white, 0.06)
    : "#FFFFFF";

  const inputBorderColor = isDark
    ? theme.palette.divider // #374151
    : "#E5E7EB";

  const inputFocusBorderColor = isDark
    ? theme.palette.primary.main // #3B82F6
    : "#0D1B3E";

  const inputFocusShadow = isDark
    ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`
    : "0 0 0 3px rgba(13,27,62,0.08)";

  const iconColor = isDark
    ? theme.palette.text.disabled // #6B7280
    : "#9CA3AF";

  const footerColor = isDark ? theme.palette.text.disabled : "#B0B8C8";

  const footerSubColor = isDark
    ? alpha(theme.palette.text.disabled, 0.7)
    : "#C8CDD8";

  const mobileLogoTextColor = isDark ? theme.palette.text.primary : "#0D1B3E";

  const mobileBg = isDark ? alpha(theme.palette.common.white, 0.05) : "#FFFFFF";

  const mobileShadow = isDark
    ? "0 4px 20px rgba(0,0,0,0.4)"
    : "0 4px 20px rgba(0,0,0,0.1)";

  // ── Shared TextField sx ──
  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: inputBg,
      borderRadius: 2.5,
      color: theme.palette.text.primary,
      "&:hover": { bgcolor: inputHoverBg },
      "&.Mui-focused": {
        bgcolor: inputFocusBg,
        boxShadow: inputFocusShadow,
      },
      "& fieldset": { borderColor: inputBorderColor },
      "&:hover fieldset": {
        borderColor: isDark ? theme.palette.text.disabled : "#C5C9D0",
      },
      "&.Mui-focused fieldset": {
        borderColor: inputFocusBorderColor,
        borderWidth: "1.5px",
      },
    },
    "& .MuiInputBase-input": {
      color: theme.palette.text.primary,
      "&::placeholder": {
        color: theme.palette.text.disabled,
        opacity: 1,
      },
    },
    "& .MuiFormHelperText-root": {
      color: theme.palette.error.main,
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        overflow: "hidden",
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        animation: "fadeIn 0.5s ease forwards",
      }}
    >
      {/* ══════════════════════════════════════════
          LEFT PANEL — Branding (always dark navy)
          ══════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "50%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "linear-gradient(145deg, #0A1628 0%, #0D1B3E 30%, #1A3A7A 70%, #1E4D98 100%)",
          color: "white",
          p: 6,
          overflow: "hidden",
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative circles */}
        <Box
          sx={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "40%",
            right: -30,
            width: 150,
            height: 150,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        />

        {/* Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: 480,
            "@keyframes slideUp": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
            animation: "slideUp 0.7s ease forwards",
          }}
        >
          {/* School Logo */}
          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 4,
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,255,255,0.08), 0 0 0 12px rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={SCHOOL_LOGO}
              alt="School Logo"
              sx={{ width: 120, height: 120, objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Box>

          {/* School Name */}
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{
              color: "white",
              letterSpacing: "0.03em",
              mb: 1,
              lineHeight: 1.25,
              textShadow: "0 2px 12px rgba(0,0,0,0.25)",
              fontSize: { md: "1.6rem", lg: "1.9rem" },
            }}
          >
            {SCHOOL_NAME}
          </Typography>

          {/* Gold accent line */}
          <Box
            sx={{
              width: 60,
              height: 3.5,
              background: "linear-gradient(90deg, #D4A017, #F5A623, #D4A017)",
              borderRadius: 2,
              mx: "auto",
              mb: 2.5,
            }}
          />

          {/* Subtitle */}
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontSize: "0.78rem",
              fontWeight: 600,
              mb: 5,
            }}
          >
            Attendance Management System
          </Typography>
        </Box>

        {/* Left Panel Footer */}
        <Stack
          spacing={0.5}
          alignItems="center"
          sx={{ position: "absolute", bottom: 20 }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.68rem",
              letterSpacing: "0.04em",
            }}
          >
            © {new Date().getFullYear()} {SCHOOL_NAME}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.2)",
              fontSize: "0.6rem",
              letterSpacing: "0.06em",
            }}
          >
            All Rights Reserved
          </Typography>
        </Stack>
      </Box>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Login Form (theme-aware)
          ══════════════════════════════════════════ */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: rightPanelBg,
          p: { xs: 2, sm: 4 },
          position: "relative",
          overflowY: "auto",
          transition: "background-color 0.3s ease",
        }}
      >
        {/* Mobile Logo — small screens only */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: mobileBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: mobileShadow,
              border: isDark ? `1px solid ${theme.palette.divider}` : "none",
              overflow: "hidden",
              mb: 1,
            }}
          >
            <Box
              component="img"
              src={SCHOOL_LOGO}
              alt="Logo"
              sx={{ width: 56, height: 56, objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Box>
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              color: mobileLogoTextColor,
              fontSize: "0.78rem",
              textAlign: "center",
            }}
          >
            TVSM School
          </Typography>
        </Box>

        {/* ── Login Card ── */}
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            bgcolor: cardBg,
            boxShadow: cardShadow,
            border: cardBorder,
            mt: { xs: 14, md: 0 },
            transition: "background-color 0.3s ease, border-color 0.3s ease",
            "@keyframes slideRight": {
              from: { opacity: 0, transform: "translateY(15px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
            animation: "slideRight 0.5s ease forwards",
          }}
        >
          {/* Card Header */}
          <Box sx={{ mb: 3.5 }}>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                color: "text.primary",
                mb: 0.5,
                fontSize: { xs: "1.4rem", sm: "1.6rem" },
              }}
            >
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: subtitleColor }}>
              Enter your credentials to continue
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* ── Form ── */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email Label */}
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: labelColor,
                mb: 0.6,
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontSize: "0.68rem",
              }}
            >
              Email Address
            </Typography>

            {/* Email Field */}
            <TextField
              {...register("email")}
              placeholder="Enter your email"
              type="email"
              fullWidth
              autoFocus
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2.5, ...textFieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon
                      sx={{ color: iconColor, fontSize: 19 }}
                    />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Label */}
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: labelColor,
                mb: 0.6,
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontSize: "0.68rem",
              }}
            >
              Password
            </Typography>

            {/* Password Field */}
            <TextField
              {...register("password")}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3.5, ...textFieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: iconColor, fontSize: 19 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      sx={{ color: iconColor }}
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

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={!submitting && <LoginOutlinedIcon fontSize="small" />}
              sx={{
                py: 1.7,
                fontSize: "0.95rem",
                fontWeight: 800,
                borderRadius: 2.5,
                // Always navy gradient — matches left panel branding
                background:
                  "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
                boxShadow: isDark
                  ? "0 6px 18px rgba(0,0,0,0.5)"
                  : "0 6px 18px rgba(13,27,62,0.35)",
                letterSpacing: "0.03em",
                textTransform: "none",
                transition: "all 0.25s ease",
                color: "white",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #0A1530 0%, #152F65 50%, #1A4085 100%)",
                  boxShadow: isDark
                    ? "0 8px 24px rgba(0,0,0,0.6)"
                    : "0 8px 24px rgba(13,27,62,0.45)",
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
                "&.Mui-disabled": {
                  background: isDark ? "#374151" : "#94A3B8",
                  color: isDark ? "#6B7280" : "white",
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          {/* ── Card Footer ── */}
          <Divider sx={{ my: 3 }} />

          <Stack spacing={0.5} alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                component="img"
                src={SCHOOL_LOGO}
                alt=""
                sx={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                  opacity: isDark ? 0.25 : 0.4,
                  filter: isDark ? "invert(1)" : "none",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: footerColor,
                  fontSize: "0.68rem",
                  letterSpacing: "0.03em",
                }}
              >
                TVSM Attendance v{APP_VERSION}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: footerSubColor,
                fontSize: "0.62rem",
                letterSpacing: "0.04em",
              }}
            >
              Designed &amp; Developed by Abhishek
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
