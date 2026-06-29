import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
  ButtonBase,
} from "@mui/material";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";
import SchoolInfoSheet from "./SchoolInfoSheet";
import NotificationBell from "./NotificationBell";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const DEFAULT_SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const getShortName = (fullName) => {
  if (!fullName) return "SCHOOL";
  const words = fullName.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words.join(" ").toUpperCase();
  const initials = words
    .slice(0, words.length - 1)
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

  const [anchorEl, setAnchorEl] = useState(null);
  const [schoolSheetOpen, setSchoolSheetOpen] = useState(false);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
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

  const roleStyle =
    user?.role === "admin"
      ? {
          bg: "linear-gradient(135deg, #F5A623 0%, #E8920F 100%)",
          chip: "#FFF4E5",
          text: "#B45309",
        }
      : user?.role === "principal"
        ? {
            bg: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
            chip: "#E6F4EA",
            text: "#15803D",
          }
        : {
            bg: "linear-gradient(135deg, #1E4D98 0%, #0D1B3E 100%)",
            chip: "#E0EBFF",
            text: "#1E4D98",
          };

  // ─── THEME-AWARE COLORS ───
  const topbarBg = isDark ? "#111827" : "#FFFFFF";
  const topbarText = isDark ? "#F9FAFB" : "#111827";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const hoverBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const activeBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const subtleText = isDark ? "#9CA3AF" : "#6B7280";

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: topbarBg,
          color: topbarText,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: "100%",
          borderBottom: `1px solid ${borderColor}`,
          transition: "all 0.3s ease",
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 0.8, sm: 1.5 },
            minHeight: { xs: "50px !important", md: "55px !important" },
            px: { xs: 1.2, sm: 2, md: 2.5 },
          }}
        >
          {/* Menu Toggle (Desktop) */}
          {!isMobile && (
            <IconButton
              edge="start"
              onClick={onMenuClick}
              sx={{
                color: topbarText,
                bgcolor: hoverBg,
                "&:hover": { bgcolor: activeBg },
                borderRadius: 1.5,
                width: 36,
                height: 36,
              }}
            >
              <MenuOutlinedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Logo + School Name */}
          <ButtonBase
            onClick={() => isMobile && setSchoolSheetOpen(true)}
            disabled={!isMobile}
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.8, sm: 1.2 },
              borderRadius: 1.5,
              p: 0.4,
              cursor: isMobile ? "pointer" : "default",
              "&:hover": isMobile ? { bgcolor: hoverBg } : {},
            }}
          >
            <Avatar
              src={SCHOOL_LOGO}
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                bgcolor: isDark ? "#1F2937" : "#F3F4F6",
                boxShadow: isDark
                  ? "0 2px 8px rgba(0,0,0,0.3)"
                  : "0 1px 4px rgba(0,0,0,0.08)",
                "& img": { objectFit: "contain", p: 0.3 },
                flexShrink: 0,
              }}
            >
              <SchoolOutlinedIcon
                sx={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 18 }}
              />
            </Avatar>

            <Typography
              sx={{
                color: topbarText,
                fontWeight: 800,
                fontSize: { xs: "0.78rem", sm: "0.92rem", md: "0.95rem" },
                lineHeight: 1.2,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={fullSchoolName}
            >
              {displayName}
            </Typography>

            {isMobile && (
              <ExpandMoreOutlinedIcon
                sx={{ fontSize: 14, color: subtleText, flexShrink: 0 }}
              />
            )}
          </ButtonBase>

          {/* Right Controls */}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {/* Session Badge (Desktop) */}
            {!isMobile && sessionName && (
              <Chip
                label={sessionName}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: isDark ? "rgba(245,166,35,0.12)" : "#FFF7ED",
                  color: isDark ? "#FCD34D" : "#B45309",
                  border: `1px solid ${isDark ? "rgba(245,166,35,0.2)" : "#FED7AA"}`,
                  height: 24,
                  fontSize: "0.7rem",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}

            {/* Dark Mode Toggle */}
            <Tooltip title={isDark ? "Light Mode" : "Dark Mode"}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: topbarText,
                  bgcolor: hoverBg,
                  "&:hover": { bgcolor: activeBg },
                  borderRadius: 1.5,
                  width: { xs: 34, sm: 36 },
                  height: { xs: 34, sm: 36 },
                  transition: "all 0.3s ease",
                }}
              >
                {isDark ? (
                  <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Avatar */}
            <Tooltip title="Account">
              <ButtonBase
                onClick={handleMenuOpen}
                sx={{
                  borderRadius: 8,
                  p: 0.3,
                  pr: { xs: 0.3, md: 1 },
                  bgcolor: hoverBg,
                  border: `1px solid ${borderColor}`,
                  "&:hover": { bgcolor: activeBg },
                  transition: "all 0.2s ease",
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 28, sm: 30 },
                    height: { xs: 28, sm: 30 },
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    background: roleStyle.bg,
                    color: "white",
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.2}
                    sx={{ ml: 0.6 }}
                  >
                    <Typography
                      sx={{
                        color: topbarText,
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        maxWidth: 100,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user?.name?.split(" ")[0]}
                    </Typography>
                    <KeyboardArrowDownOutlinedIcon
                      sx={{ fontSize: 16, color: subtleText }}
                    />
                  </Stack>
                )}
              </ButtonBase>
            </Tooltip>
          </Stack>

          {/* Account Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1,
                minWidth: 240,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: isDark
                  ? "0 8px 24px rgba(0,0,0,0.4)"
                  : "0 8px 24px rgba(0,0,0,0.08)",
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#F9FAFB",
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    fontSize: "1rem",
                    fontWeight: 800,
                    background: roleStyle.bg,
                    color: "white",
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ overflow: "hidden", flex: 1 }}>
                  <Typography variant="body2" fontWeight={800} noWrap>
                    {user?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block", fontSize: "0.7rem" }}
                  >
                    {user?.email}
                  </Typography>
                  <Chip
                    label={user?.role}
                    size="small"
                    sx={{
                      mt: 0.4,
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      bgcolor: roleStyle.chip,
                      color: roleStyle.text,
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 0.5 }}>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/profile");
                }}
                sx={{ borderRadius: 1.5, py: 0.9, fontSize: "0.85rem" }}
              >
                <ListItemIcon>
                  <PersonOutlinedIcon fontSize="small" />
                </ListItemIcon>
                My Profile
              </MenuItem>
              <MenuItem
                onClick={toggleTheme}
                sx={{ borderRadius: 1.5, py: 0.9, fontSize: "0.85rem" }}
              >
                <ListItemIcon>
                  {isDark ? (
                    <LightModeOutlinedIcon fontSize="small" />
                  ) : (
                    <DarkModeOutlinedIcon fontSize="small" />
                  )}
                </ListItemIcon>
                {isDark ? "Light Mode" : "Dark Mode"}
              </MenuItem>
              {isAdmin && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/settings");
                  }}
                  sx={{ borderRadius: 1.5, py: 0.9, fontSize: "0.85rem" }}
                >
                  <ListItemIcon>
                    <SettingsOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 0.5 }}>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  borderRadius: 1.5,
                  py: 0.9,
                  color: "error.main",
                  "&:hover": { bgcolor: "error.50" },
                }}
              >
                <ListItemIcon>
                  <ExitToAppOutlinedIcon fontSize="small" color="error" />
                </ListItemIcon>
                <Typography variant="body2" fontWeight={700} color="error.main">
                  Sign Out
                </Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>

      <SchoolInfoSheet
        open={schoolSheetOpen}
        onClose={() => setSchoolSheetOpen(false)}
        settings={settings}
      />
    </>
  );
};

export default Topbar;
