import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  alpha,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useThemeMode();

  // ─── Determine dashboard path based on user role ───
  const dashboardPath =
    user?.role === "admin"
      ? "/dashboard"
      : user?.role === "teacher"
        ? "/teacher/dashboard"
        : user?.role === "principal"
          ? "/principal/dashboard"
          : "/login";

  // ─── Required roles for context (if passed) ───
  const requiredRoles = location.state?.requiredRoles || [];

  // ─── Handle actions ───
  const handleGoBack = () => {
    // If there's history, go back; otherwise go to dashboard
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(dashboardPath);
    }
  };

  const handleLoginAsDifferent = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: isDark ? alpha("#F59E0B", 0.15) : alpha("#F59E0B", 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2.5,
          }}
        >
          <LockOutlinedIcon
            sx={{
              fontSize: 44,
              color: isDark ? "#FBBF24" : "#D97706",
            }}
          />
        </Box>

        {/* Title */}
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Access Denied
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.6 }}
        >
          You don't have permission to view this page.
        </Typography>

        {/* User context */}
        {isAuthenticated && user && (
          <Box sx={{ mb: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.75rem" }}
              >
                Logged in as:
              </Typography>
              <Chip
                label={`${user.name} (${user.role})`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 22,
                  textTransform: "capitalize",
                }}
              />
            </Stack>

            {requiredRoles.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.72rem", display: "block" }}
              >
                Required role:{" "}
                <strong style={{ textTransform: "capitalize" }}>
                  {requiredRoles.join(" or ")}
                </strong>
              </Typography>
            )}
          </Box>
        )}

        {/* ─── Action Buttons ─── */}
        <Stack spacing={1.25}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<HomeOutlinedIcon />}
            onClick={() => navigate(dashboardPath)}
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 800,
              textTransform: "none",
              py: 1.1,
            }}
          >
            Go to My Dashboard
          </Button>

          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              size="medium"
              fullWidth
              startIcon={<ArrowBackOutlinedIcon />}
              onClick={handleGoBack}
              sx={{
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Go Back
            </Button>

            <Button
              variant="outlined"
              size="medium"
              fullWidth
              startIcon={<LoginOutlinedIcon />}
              onClick={handleLoginAsDifferent}
              color="warning"
              sx={{
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              {isAuthenticated ? "Switch User" : "Login"}
            </Button>
          </Stack>
        </Stack>

        {/* Helpful hint */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            display: "block",
            mt: 3,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            fontSize: "0.7rem",
          }}
        >
          If you believe this is an error, contact your administrator.
        </Typography>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;
