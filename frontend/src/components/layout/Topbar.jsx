import React, { useState, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";
import SchoolInfoSheet from "./SchoolInfoSheet";

// ✅ Correct quote import
import { getDailyQuoteForUser } from "../../utils/quoteUtils";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const DEFAULT_SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const getShortName = (fullName) => {
  if (!fullName) return "SCHOOL";
  const words = fullName.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words.join(" ").toUpperCase();
  const initials = words
    .slice(0, -1)
    .map((w) => w[0])
    .join("");
  return `${initials} ${words[words.length - 1]}`.toUpperCase();
};

const Topbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { isDark, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const isClassUser = user?.role === "class";

  const [schoolSheetOpen, setSchoolSheetOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sessionName =
    settings?.activeSession && typeof settings.activeSession === "object"
      ? settings.activeSession.name
      : null;

  const fullSchoolName =
    settings?.schoolName && settings.schoolName !== "Setup Required"
      ? settings.schoolName
      : DEFAULT_SCHOOL_NAME;

  const displayName = isMobile ? getShortName(fullSchoolName) : fullSchoolName;
  const classLabel = isClassUser
    ? String(user?.name || "Class").toUpperCase()
    : null;

  // ✅ Read quote using getDailyQuoteForUser and property .quote
  const dailyQuoteText = useMemo(() => {
    try {
      const q = getDailyQuoteForUser ? getDailyQuoteForUser(user) : null;
      return (
        q?.quote ||
        "Education is the most powerful weapon which you can use to change the world."
      );
    } catch {
      return "Education is the most powerful weapon which you can use to change the world.";
    }
  }, [user]);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: isDark ? alpha("#0F172A", 0.92) : alpha("#FFFFFF", 0.92),
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "text.primary",
          zIndex: (t) => t.zIndex.drawer + 1,
          width: "100%",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 0.75, sm: 1.5 },
            minHeight: "56px !important",
            px: { xs: 1.25, sm: 2, md: 2.5 },
          }}
        >
          {/* Desktop Hamburger */}
          {!isMobile && (
            <IconButton
              edge="start"
              onClick={onMenuClick}
              aria-label="Toggle menu"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
              }}
            >
              <MenuOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}

          {/* School Brand (Clickable for Admin to open Info Sheet on all screens) */}
          <Box
            onClick={isAdmin ? () => setSchoolSheetOpen(true) : undefined}
            sx={{
              flex: { xs: 1, md: "none" },
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              cursor: isAdmin ? "pointer" : "default",
              userSelect: "none",
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                bgcolor: isDark ? alpha("#fff", 0.95) : alpha("#0F172A", 0.04),
                border: "1px solid",
                borderColor: "divider",
                p: 0.4,
              }}
            >
              <Box
                component="img"
                src={SCHOOL_LOGO}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Box>

            <Box sx={{ minWidth: 0, flex: { xs: 1, md: "none" } }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "0.8rem", sm: "0.95rem" },
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </Typography>
              {classLabel && isMobile && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {classLabel}
                </Typography>
              )}
            </Box>
          </Box>

          {/* DESKTOP QUOTE (Centered in empty space) */}
          {!isMobile && (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                px: 4,
                minWidth: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                "{dailyQuoteText}"
              </Typography>
            </Box>
          )}

          {/* Right Controls */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1 }}
          >
            {sessionName && !isMobile && (
              <Chip
                label={sessionName}
                size="small"
                variant="outlined"
                sx={{
                  height: 24,
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  borderColor: "divider",
                  color: "text.secondary",
                }}
              />
            )}
            {sessionName && isMobile && (
              <Chip
                label={sessionName}
                size="small"
                sx={{
                  height: 22,
                  fontWeight: 700,
                  fontSize: "0.62rem",
                  bgcolor: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
                  color: "text.secondary",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            )}

            {/* Dark Mode Toggle */}
            <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                aria-label="Toggle theme"
                sx={{ color: "text.secondary", mr: 0.5 }}
              >
                {isDark ? (
                  <LightModeOutlinedIcon sx={{ fontSize: 20 }} />
                ) : (
                  <DarkModeOutlinedIcon sx={{ fontSize: 20 }} />
                )}
              </IconButton>
            </Tooltip>

            {/* DIRECT SIGN OUT BUTTON FOR EVERYONE (ADMIN & CLASS) */}
            <Tooltip title="Sign out">
              <IconButton
                onClick={handleLogout}
                size="small"
                aria-label="Sign out"
                sx={{
                  color: "error.main",
                  border: "1px solid",
                  borderColor: alpha(theme.palette.error.main, 0.35),
                  borderRadius: 2,
                  width: 34,
                  height: 34,
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.1) },
                }}
              >
                <ExitToAppOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      {isAdmin && (
        <SchoolInfoSheet
          open={schoolSheetOpen}
          onClose={() => setSchoolSheetOpen(false)}
          settings={settings}
        />
      )}
    </>
  );
};

export default Topbar;
