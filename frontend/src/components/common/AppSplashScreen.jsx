import React, { useEffect, useState } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * AppSplashScreen — Displays a premium, animated loading screen right after login.
 * Smoothly transitions out after a minimum delay to allow background queries to run.
 */
const AppSplashScreen = ({ user, onComplete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Hold splash screen for at least 1.2s for perceived polish,
    // then trigger fade-out animation.
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for CSS fade-out transition to finish before unmounting
      setTimeout(onComplete, 500);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!user) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: isDark
          ? "linear-gradient(135deg, #020617 0%, #0F172A 100%)"
          : "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
        opacity: isFadingOut ? 0 : 1,
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      {/* Container for intro animations */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          "@keyframes scaleIn": {
            "0%": { opacity: 0, transform: "scale(0.9)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      >
        <Avatar
          src={SCHOOL_LOGO}
          sx={{
            width: 90,
            height: 90,
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            boxShadow: isDark
              ? "0 12px 32px rgba(0,0,0,0.5)"
              : "0 12px 32px rgba(15,23,42,0.08)",
            p: 1.5,
            mb: 3,
            "& img": { objectFit: "contain" },
          }}
        />

        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: "text.primary",
            mb: 0.5,
            letterSpacing: "-0.02em",
          }}
        >
          {greetingText()}, {user.name.split(" ")[0]}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          Preparing your dashboard...
        </Typography>

        {/* Minimal 3-dot pulsing loader */}
        <Box sx={{ display: "flex", gap: 1, mt: 4 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "primary.main",
                animation: "pulse 1.2s infinite ease-in-out both",
                animationDelay: `${i * 0.16}s`,
                "@keyframes pulse": {
                  "0%, 80%, 100%": { transform: "scale(0)", opacity: 0.3 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default AppSplashScreen;
