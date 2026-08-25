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
  ListItemText,
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

  // ─── THEME-AWARE COLORS (Minimalist SaaS Look) ───
  const topbarBg = theme.palette.background.paper;
  const topbarText = theme.palette.text.primary;
  const borderColor = theme.palette.divider;
  const hoverBg = theme.palette.action.hover;
  const subtleText = theme.palette.text.secondary;

  const roleStyle = isAdmin
    ? { bg: theme.palette.primary.main, text: "#FFF" }
    : { bg: theme.palette.secondary.main, text: "#FFF" };

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
            minHeight: { xs: "56px !important", md: "64px !important" },
            px: { xs: 1.2, sm: 2, md: 3 },
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
                borderRadius: 1.5,
                width: 38,
                height: 38,
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
              justifyContent: "flex-start",
              gap: { xs: 1, sm: 1.5 },
              borderRadius: 1.5,
              p: 0.5,
              cursor: isMobile ? "pointer" : "default",
              "&:hover": isMobile ? { bgcolor: hoverBg } : {},
            }}
          >
            <Avatar
              src={SCHOOL_LOGO}
              sx={{
                width: { xs: 32, sm: 38 },
                height: { xs: 32, sm: 38 },
                bgcolor: "transparent",
                "& img": { objectFit: "contain" },
                flexShrink: 0,
              }}
            >
              <SchoolOutlinedIcon sx={{ color: subtleText, fontSize: 20 }} />
            </Avatar>

            <Typography
              sx={{
                color: topbarText,
                fontWeight: 800,
                fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                letterSpacing: "-0.02em",
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
                sx={{ fontSize: 16, color: subtleText, flexShrink: 0 }}
              />
            )}
          </ButtonBase>

          {/* Right Controls */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Session Badge (Sleek pill) */}
            {!isMobile && sessionName && (
              <Chip
                label={sessionName}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
                  color: isDark ? "#E2E8F0" : "#475569",
                  height: 26,
                  fontSize: "0.75rem",
                  letterSpacing: "0.02em",
                  border: "1px solid",
                  borderColor: borderColor,
                }}
              />
            )}

            <Tooltip title={isDark ? "Light Mode" : "Dark Mode"}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: subtleText,
                  bgcolor: hoverBg,
                  borderRadius: 2,
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                }}
              >
                {isDark ? (
                  <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>

            {/* User Dropdown Button */}
            <Tooltip title="Account menu">
              <ButtonBase
                onClick={handleMenuOpen}
                sx={{
                  borderRadius: 2,
                  p: 0.5,
                  pr: { xs: 0.5, md: 1.2 },
                  bgcolor: hoverBg,
                  border: `1px solid ${borderColor}`,
                  transition: "all 0.2s ease",
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    bgcolor: roleStyle.bg,
                    color: roleStyle.text,
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ ml: 1 }}
                  >
                    <Typography
                      sx={{
                        color: topbarText,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        maxWidth: 120,
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

          {/* Proper Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{
              paper: {
                sx: { mt: 1, minWidth: 220 },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={800} noWrap>
                {user?.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                noWrap
              >
                {user?.email}
              </Typography>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate("/profile");
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <PersonOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="My Profile"
                primaryTypographyProps={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              />
            </MenuItem>

            {isAdmin && (
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/settings");
                }}
                sx={{ py: 1 }}
              >
                <ListItemIcon>
                  <SettingsOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Settings"
                  primaryTypographyProps={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
              </MenuItem>
            )}

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={handleLogout}
              sx={{ py: 1, color: "error.main" }}
            >
              <ListItemIcon>
                <ExitToAppOutlinedIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Sign Out"
                primaryTypographyProps={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              />
            </MenuItem>
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
