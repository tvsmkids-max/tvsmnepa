import React from "react";
import { Box, Typography, Button, Paper, Stack, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useThemeMode();

  // Determine dashboard path based on role
  const dashboardPath =
    user?.role === "admin"
      ? "/dashboard"
      : user?.role === "teacher"
        ? "/teacher/dashboard"
        : "/login";

  // Dynamic button label based on user role
  const dashboardButtonLabel =
    user?.role === "teacher" ? "Go to Teacher Dashboard" : "Go to My Dashboard";

  const handleSwitchUser = async () => {
    try {
      await logout();
    } catch {
      // Ignore silent errors
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
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          borderRadius: "16px",
          border: "1px solid",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          bgcolor: isDark ? "#1E293B" : "#FFFFFF",
        }}
      >
        {/* Friendly Security Lock Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: isDark ? alpha("#F59E0B", 0.15) : alpha("#FFFBEB", 1),
            border: "1px solid",
            borderColor: isDark ? alpha("#F59E0B", 0.3) : alpha("#FDE68A", 0.6),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          }}
        >
          <LockOutlinedIcon
            sx={{
              fontSize: 40,
              color: isDark ? "#FBBF24" : "#D97706",
            }}
          />
        </Box>

        {/* Brand Heading */}
        <Typography
          variant="h5"
          fontWeight={900}
          letterSpacing="-0.5px"
          sx={{ mb: 1.5, color: isDark ? "#F1F5F9" : "#0F172A" }}
        >
          Admin Access Required
        </Typography>

        {/* Clear Role Explanation */}
        <Typography
          variant="body2"
          sx={{
            color: isDark ? "#94A3B8" : "#64748B",
            mb: 4,
            lineHeight: 1.6,
            maxWidth: "380px",
            mx: "auto",
          }}
        >
          This section is only available to Admin users. You are currently
          signed in as a Teacher and cannot view this page.
        </Typography>

        {/* Simplified User Metadata Card */}
        {isAuthenticated && user && (
          <Box
            sx={{
              p: 2.5,
              mb: 4,
              borderRadius: "12px",
              bgcolor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.04)",
              textAlign: "left",
            }}
          >
            <Stack spacing={1.5}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  Signed in as:
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color="text.primary"
                >
                  {user.name}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  Current Role:
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{
                    color: isDark ? "#FBBF24" : "#D97706",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  {user.role}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Optimized Action Buttons */}
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<HomeOutlinedIcon />}
            onClick={() => navigate(dashboardPath)}
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              color: "#FFFFFF",
              fontWeight: 800,
              textTransform: "none",
              py: 1.3,
              borderRadius: "10px",
              boxShadow: "none",
              "&:hover": {
                background: "linear-gradient(135deg, #0A1430 0%, #173E7A 100%)",
                boxShadow: "none",
              },
            }}
          >
            {dashboardButtonLabel}
          </Button>

          <Button
            variant="outlined"
            size="medium"
            fullWidth
            startIcon={<LogoutOutlinedIcon />}
            onClick={handleSwitchUser}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "10px",
              py: 1.1,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": {
                borderColor: "text.primary",
                bgcolor: "transparent",
              },
            }}
          >
            Switch User
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;
