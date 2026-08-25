import React from "react";
import { Box, Typography, Button, Paper, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useThemeMode();

  // Determine role-aware dashboard path
  const dashboardPath =
    isAuthenticated && user?.role === "teacher"
      ? "/teacher/dashboard"
      : isAuthenticated && user?.role === "admin"
        ? "/dashboard"
        : "/";

  // Dynamic button label based on logged-in user role
  const dashboardButtonLabel =
    isAuthenticated && user?.role === "teacher"
      ? "Go to Teacher Dashboard"
      : "Go to Dashboard";

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
          maxWidth: 440,
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
        {/* Soft Search/Compass Icon Box */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#EFF6FF",
            border: "1px solid",
            borderColor: isDark ? alpha("#3B82F6", 0.3) : "#BFDBFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2.5,
          }}
        >
          <SearchOffOutlinedIcon
            sx={{
              fontSize: 40,
              color: isDark ? "#60A5FA" : "#2563EB",
            }}
          />
        </Box>

        {/* 404 Gradient Number */}
        <Typography
          variant="h1"
          fontWeight={900}
          sx={{
            fontSize: { xs: "3.5rem", sm: "4.25rem" },
            lineHeight: 1,
            mb: 1.5,
            letterSpacing: "-2px",
            background: isDark
              ? "linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)"
              : "linear-gradient(135deg, #0D1B3E 20%, #2563EB 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </Typography>

        {/* Friendly Heading */}
        <Typography
          variant="h6"
          fontWeight={800}
          letterSpacing="-0.5px"
          sx={{ mb: 1.5, color: isDark ? "#F1F5F9" : "#0F172A" }}
        >
          Oops! Page Not Found
        </Typography>

        {/* Simplified Description */}
        <Typography
          variant="body2"
          sx={{
            color: isDark ? "#94A3B8" : "#64748B",
            mb: 4,
            lineHeight: 1.6,
            maxWidth: "320px",
            mx: "auto",
          }}
        >
          The page you’re looking for doesn’t exist or may have been moved.
        </Typography>

        {/* Single Primary Action Button */}
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
      </Paper>
    </Box>
  );
};

export default NotFoundPage;
