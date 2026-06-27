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
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LoginIcon from "@mui/icons-material/Login";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useAuth from "../../hooks/useAuth";

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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "admin" ? "/dashboard" : "/teacher/dashboard", {
        replace: true,
      });
    }
  }, [isAuthenticated, user, navigate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      navigate(
        result.user?.role === "admin" ? "/dashboard" : "/teacher/dashboard",
        { replace: true },
      );
    }
    setSubmitting(false);
  };

  if (isLoading) return null;

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
      {/* ═══════════ LEFT PANEL — Branding ═══════════ */}
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

        {/* Decorative elements */}
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

          {/* Gold accent */}
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

        {/* Footer */}
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

      {/* ═══════════ RIGHT PANEL — Login Form ═══════════ */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F8F9FC",
          p: { xs: 2, sm: 4 },
          position: "relative",
          overflowY: "auto",
        }}
      >
        {/* Mobile Logo (shown only on small screens) */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
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
            sx={{ color: "#0D1B3E", fontSize: "0.78rem", textAlign: "center" }}
          >
            TVSM School
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            bgcolor: "white",
            boxShadow:
              "0 4px 6px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.04)",
            mt: { xs: 14, md: 0 },
            "@keyframes slideRight": {
              from: { opacity: 0, transform: "translateY(15px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
            animation: "slideRight 0.5s ease forwards",
          }}
        >
          {/* Form Header */}
          <Box sx={{ mb: 3.5 }}>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                color: "#0D1B3E",
                mb: 0.5,
                fontSize: { xs: "1.4rem", sm: "1.6rem" },
              }}
            >
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B7B99" }}>
              Enter your credentials to continue
            </Typography>
          </Box>

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: "#374151",
                mb: 0.6,
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontSize: "0.68rem",
              }}
            >
              Email Address
            </Typography>
            <TextField
              {...register("email")}
              placeholder="Enter your email"
              type="email"
              fullWidth
              autoFocus
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#F8F9FC",
                  borderRadius: 2.5,
                  "&:hover": { bgcolor: "#F1F3F9" },
                  "&.Mui-focused": {
                    bgcolor: "white",
                    boxShadow: "0 0 0 3px rgba(13,27,62,0.08)",
                  },
                  "& fieldset": { borderColor: "#E5E7EB" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0D1B3E",
                    borderWidth: "1.5px",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: "#9CA3AF", fontSize: 19 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: "#374151",
                mb: 0.6,
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontSize: "0.68rem",
              }}
            >
              Password
            </Typography>
            <TextField
              {...register("password")}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                mb: 3.5,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#F8F9FC",
                  borderRadius: 2.5,
                  "&:hover": { bgcolor: "#F1F3F9" },
                  "&.Mui-focused": {
                    bgcolor: "white",
                    boxShadow: "0 0 0 3px rgba(13,27,62,0.08)",
                  },
                  "& fieldset": { borderColor: "#E5E7EB" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0D1B3E",
                    borderWidth: "1.5px",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#9CA3AF", fontSize: 19 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      sx={{ color: "#9CA3AF" }}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
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
              startIcon={!submitting && <LoginIcon fontSize="small" />}
              sx={{
                py: 1.7,
                fontSize: "0.95rem",
                fontWeight: 800,
                borderRadius: 2.5,
                background:
                  "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
                boxShadow: "0 6px 18px rgba(13,27,62,0.35)",
                letterSpacing: "0.03em",
                textTransform: "none",
                transition: "all 0.25s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #0A1530 0%, #152F65 50%, #1A4085 100%)",
                  boxShadow: "0 8px 24px rgba(13,27,62,0.45)",
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
                "&.Mui-disabled": { background: "#94A3B8", color: "white" },
              }}
            >
              {submitting ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          {/* Footer */}
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
                  opacity: 0.4,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "#B0B8C8",
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
                color: "#C8CDD8",
                fontSize: "0.62rem",
                letterSpacing: "0.04em",
              }}
            >
              Designed & Developed by Abhishek
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
