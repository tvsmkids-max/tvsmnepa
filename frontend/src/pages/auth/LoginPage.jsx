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
  Chip,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LoginIcon from "@mui/icons-material/Login";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useAuth from "../../hooks/useAuth";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "School Attendance System";
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

  useEffect(() => () => clearError(), [clearError]);

  const {
    register,
    handleSubmit,
    setValue,
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

  const fillCredentials = (email, password) => {
    setValue("email", email);
    setValue("password", password);
  };

  if (isLoading) return null;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", overflow: "hidden" }}>
      {/* LEFT PANEL */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "52%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "linear-gradient(145deg, #0D1B3E 0%, #162A5C 35%, #1A3A7A 65%, #1E4D98 100%)",
          color: "white",
          p: 6,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 350,
            height: 350,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: 460,
          }}
        >
          <Box
            sx={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 4,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={SCHOOL_LOGO}
              alt="Logo"
              sx={{ width: 112, height: 112, objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ color: "white", mb: 1.5, lineHeight: 1.3 }}
          >
            {SCHOOL_NAME}
          </Typography>
          <Box
            sx={{
              width: 60,
              height: 3,
              bgcolor: "#F5A623",
              borderRadius: 2,
              mx: "auto",
              mb: 3,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: "0.82rem",
              mb: 5,
              fontWeight: 500,
            }}
          >
            Attendance Management System
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[
              { icon: "📋", label: "Digital Attendance Tracking" },
              { icon: "📊", label: "Real-time Reports & Analytics" },
              { icon: "👨‍🏫", label: "Multi-role Access Control" },
              { icon: "📱", label: "Responsive & Mobile Friendly" },
            ].map((f) => (
              <Box
                key={f.label}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 1.4,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography fontSize="1.2rem">{f.icon}</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.88)" }}
                >
                  {f.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 20,
            color: "rgba(255,255,255,0.3)",
            fontSize: "0.68rem",
          }}
        >
          © {new Date().getFullYear()} {SCHOOL_NAME}. All rights reserved.
        </Typography>
      </Box>

      {/* RIGHT PANEL */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F8F9FC",
          p: { xs: 2, sm: 4 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              overflow: "hidden",
              mb: 0.75,
            }}
          >
            <Box
              component="img"
              src={SCHOOL_LOGO}
              alt="Logo"
              sx={{ width: 50, height: 50, objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Box>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: "#0D1B3E", fontSize: "0.75rem" }}
          >
            {SCHOOL_NAME}
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            bgcolor: "white",
            boxShadow: "0 12px 40px rgba(0,0,0,0.07)",
            border: "1px solid rgba(0,0,0,0.05)",
            mt: { xs: 14, md: 0 },
          }}
        >
          <Box sx={{ mb: 3.5 }}>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ color: "#0D1B3E", mb: 0.5 }}
            >
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B7B99" }}>
              Sign in to access your dashboard
            </Typography>
          </Box>

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
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: "#374151",
                mb: 0.6,
                display: "block",
                textTransform: "uppercase",
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
                py: 1.6,
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: 2.5,
                background:
                  "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
                boxShadow: "0 4px 14px rgba(13,27,62,0.35)",
              }}
            >
              {submitting ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Chip
              label="Admin Access"
              size="small"
              sx={{ fontSize: "0.68rem", fontWeight: 600, bgcolor: "#F1F3F9" }}
            />
          </Divider>

          <Box
            role="button"
            tabIndex={0}
            onClick={() => fillCredentials("admin@school.com", "Admin@123456")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2,
              borderRadius: 2.5,
              bgcolor: "#FFFBF0",
              border: "1.5px solid #FFE4B5",
              cursor: "pointer",
              "&:hover": { bgcolor: "#FFF3D4", borderColor: "#FFCC66" },
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                background: "linear-gradient(135deg, #F5A623, #E8920F)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AdminPanelSettingsIcon sx={{ color: "white", fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ color: "#92400E", mb: 0.15 }}
              >
                Admin Login
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#B45309",
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                }}
              >
                admin@school.com • Admin@123456
              </Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: "#F5A623" }}>
              <Typography
                sx={{ color: "white", fontWeight: 800, fontSize: "0.6rem" }}
              >
                USE
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: "1px solid #F0F2F8",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#9CA3AF", fontSize: "0.68rem" }}
            >
              Attendance System v{APP_VERSION}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#C5CCD8", fontSize: "0.63rem", display: "block" }}
            >
              Teachers — contact admin for login credentials
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
