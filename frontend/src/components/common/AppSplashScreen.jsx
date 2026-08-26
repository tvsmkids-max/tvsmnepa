import React, { useEffect, useState } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import { getDailyQuoteForUser } from "../../utils/quoteUtils";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getTeacherSalutation = (user) => {
  const firstName = user?.name?.split(" ")?.[0] || "";
  if (!firstName) return "";
  const capitalized =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  if (user?.gender === "Female") return `${capitalized} Ma'am`;
  if (user?.gender === "Male") return `${capitalized} Sir`;

  return capitalized;
};

/**
 * AppSplashScreen — Premium, animated loading screen
 * Shows educational quotes ONLY for Teachers (hidden for Admin)
 */
const AppSplashScreen = ({ user, onComplete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Quote is active ONLY for Teachers (Not required for Admin)
  const isTeacher = user?.role === "teacher";
  const { quote, author } =
    isTeacher && user ? getDailyQuoteForUser(user) : { quote: "", author: "" };

  useEffect(() => {
    // 3.5s for Teachers so they can read the quote; 1.8s for Admin
    const duration = isTeacher ? 3500 : 1800;

    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => onComplete?.(), 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, isTeacher]);

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
        p: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 520,
          width: "100%",
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
            width: 80,
            height: 80,
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            boxShadow: isDark
              ? "0 12px 32px rgba(0,0,0,0.5)"
              : "0 12px 32px rgba(15,23,42,0.08)",
            p: 1.5,
            mb: 2.5,
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
            textAlign: "center",
          }}
        >
          {greetingText()},{" "}
          {isTeacher ? getTeacherSalutation(user) : user?.name?.split(" ")?.[0]}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            letterSpacing: "0.02em",
            mb: isTeacher ? 4 : 2,
          }}
        >
          Preparing your dashboard...
        </Typography>

        {/* ── DAILY QUOTE BOX (TEACHER ONLY) ── */}
        {isTeacher && quote && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 4,
              bgcolor: isDark ? "rgba(255,255,255,0.04)" : "white",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(13,27,62,0.08)",
              boxShadow: isDark ? "none" : "0 8px 24px rgba(13,27,62,0.04)",
              position: "relative",
              textAlign: "center",
              width: "100%",
            }}
          >
            <FormatQuoteRoundedIcon
              sx={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 28,
                color: "primary.main",
                bgcolor: isDark ? "#0F172A" : "#F8FAFC",
                px: 0.5,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                fontStyle: "italic",
                fontWeight: 600,
                lineHeight: 1.5,
                mb: 1,
                fontSize: "0.88rem",
              }}
            >
              "{quote}"
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              — {author}
            </Typography>
          </Box>
        )}

        {/* Loading Dots */}
        <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
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
