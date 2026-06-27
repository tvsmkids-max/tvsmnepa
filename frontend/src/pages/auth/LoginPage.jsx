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
  Stack,
  Divider,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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
    .email("Enter a valid email")
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
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F6FA",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background pattern */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          background: `
            radial-gradient(circle at 20% 50%, rgba(13,27,62,0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(30,77,152,0.03) 0%, transparent 50%),
            radial-gradient(circle at 60% 80%, rgba(212,160,23,0.02) 0%, transparent 50%)
          `,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          mx: 2,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.06)",
          boxShadow: "0 8px 40px rgba(13,27,62,0.08)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top accent bar */}
        <Box
          sx={{
            height: 4,
            background: "linear-gradient(90deg, #0D1B3E, #1E4D98, #D4A017)",
          }}
        />

        {/* Header section */}
        <Box sx={{ p: { xs: 3, sm: 4 }, pb: 0 }}>
          {/* Logo + School name */}
          <Stack alignItems="center" sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "20px",
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
                border: "1px solid",
                borderColor: "rgba(0,0,0,0.08)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src={SCHOOL_LOGO}
                alt=""
                sx={{ width: 64, height: 64, objectFit: "contain" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </Box>

            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                color: "#0D1B3E",
                textAlign: "center",
                fontSize: "1rem",
                letterSpacing: "0.02em",
                lineHeight: 1.3,
              }}
            >
              {SCHOOL_NAME}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "#8E99A4",
                mt: 0.5,
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Attendance Management
            </Typography>
          </Stack>

          {/* Welcome text */}
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ color: "#1A1D21", mb: 0.5 }}
          >
            Sign in
          </Typography>
          <Typography variant="body2" sx={{ color: "#8E99A4", mb: 3 }}>
            Enter your credentials to access the portal
          </Typography>
        </Box>

        {/* Form section */}
        <Box sx={{ px: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 } }}>
          {error && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register("email")}
              label="Email"
              placeholder="your@email.com"
              type="email"
              fullWidth
              autoFocus
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#F8F9FB",
                  "&.Mui-focused": {
                    bgcolor: "white",
                  },
                  "& fieldset": { borderColor: "#E5E7EB" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0D1B3E",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#8E99A4",
                  fontWeight: 600,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon
                      sx={{ color: "#B0B8C1", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register("password")}
              label="Password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#F8F9FB",
                  "&.Mui-focused": { bgcolor: "white" },
                  "& fieldset": { borderColor: "#E5E7EB" },
                  "&.Mui-focused fieldset": { borderColor: "#0D1B3E" },
                },
                "& .MuiInputLabel-root": {
                  color: "#8E99A4",
                  fontWeight: 600,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#B0B8C1", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      sx={{ color: "#B0B8C1" }}
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
              endIcon={
                !submitting && <ArrowForwardIcon sx={{ fontSize: 18 }} />
              }
              sx={{
                py: 1.5,
                fontSize: "0.92rem",
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: "#0D1B3E",
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#1A3060",
                  boxShadow: "0 4px 12px rgba(13,27,62,0.25)",
                },
                "&:active": {
                  bgcolor: "#0A1530",
                },
                "&.Mui-disabled": {
                  bgcolor: "#C5CAD0",
                  color: "white",
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Sign in"
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: "#B0B8C1",
              mt: 2.5,
              fontSize: "0.72rem",
            }}
          >
            Contact your school administrator for access
          </Typography>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: { xs: 3, sm: 4 },
            py: 2,
            bgcolor: "#FAFBFC",
            borderTop: "1px solid",
            borderColor: "rgba(0,0,0,0.04)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="caption"
              sx={{ color: "#C5CAD0", fontSize: "0.65rem" }}
            >
              v{APP_VERSION}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#C5CAD0", fontSize: "0.65rem" }}
            >
              by Abhishek
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
