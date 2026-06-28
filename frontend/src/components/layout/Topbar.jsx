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
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import SchoolInfoSheet from "./SchoolInfoSheet";
import NotificationBell from "./NotificationBell";

const DEFAULT_SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const getShortName = (fullName) => {
  if (!fullName) return "SCHOOL";
  const words = fullName.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].length > 14
      ? words[0].slice(0, 14).toUpperCase() + "…"
      : words[0].toUpperCase();
  }
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

  const roleColors = {
    admin: {
      bg: "linear-gradient(135deg, #F5A623 0%, #E8920F 100%)",
      chip: "#FFF4E5",
      text: "#B45309",
    },
    teacher: {
      bg: "linear-gradient(135deg, #1E4D98 0%, #0D1B3E 100%)",
      chip: "#E0EBFF",
      text: "#1E4D98",
    },
  };
  const roleStyle = roleColors[user?.role] || roleColors.teacher;

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background:
            "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
          color: "white",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: "100%",
          boxShadow: "0 2px 12px rgba(13,27,62,0.25)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 1, sm: 2 },
            minHeight: { xs: "56px !important", md: "64px !important" },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          {/* Menu Icon — Desktop only */}
          {!isMobile && (
            <Tooltip title="Toggle sidebar">
              <IconButton
                edge="start"
                onClick={onMenuClick}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
                  borderRadius: 2,
                }}
              >
                <MenuOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* School Logo + Name */}
          <ButtonBase
            onClick={() => isMobile && setSchoolSheetOpen(true)}
            disabled={!isMobile}
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: { xs: 1.2, sm: 1.5 },
              borderRadius: 2,
              p: 0.5,
              cursor: isMobile ? "pointer" : "default",
              transition: "background 0.2s",
              "&:hover": isMobile ? { bgcolor: "rgba(255,255,255,0.06)" } : {},
              "&:active": isMobile ? { bgcolor: "rgba(255,255,255,0.12)" } : {},
            }}
          >
            <Avatar
              src={SCHOOL_LOGO}
              sx={{
                width: { xs: 38, sm: 44 },
                height: { xs: 38, sm: 44 },
                bgcolor: "white",
                boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
                "& img": { objectFit: "contain", p: 0.4 },
                flexShrink: 0,
              }}
            >
              <SchoolOutlinedIcon sx={{ color: "#0D1B3E" }} />
            </Avatar>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: 0,
                textAlign: "left",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  sx={{
                    color: "white",
                    fontWeight: 800,
                    fontSize: {
                      xs: "0.82rem",
                      sm: "1rem",
                      md: "1.05rem",
                      lg: "1.15rem",
                    },
                    lineHeight: 1.2,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: '"Inter", sans-serif',
                  }}
                  title={fullSchoolName}
                >
                  {displayName}
                </Typography>
                {isMobile && (
                  <ExpandMoreOutlinedIcon
                    sx={{
                      fontSize: 16,
                      color: "rgba(255,255,255,0.7)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </Stack>

              {!isMobile && settings?.address && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: "0.7rem",
                    lineHeight: 1.2,
                    letterSpacing: "0.04em",
                    fontWeight: 500,
                    mt: 0.2,
                  }}
                  noWrap
                >
                  {settings.address}
                </Typography>
              )}
            </Box>
          </ButtonBase>

          {/* Right Section */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1 }}
          >
            {!isMobile && sessionName && (
              <Chip
                label={sessionName}
                size="small"
                icon={<SchoolOutlinedIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontWeight: 700,
                  background:
                    "linear-gradient(135deg, #F5A623 0%, #E8920F 100%)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 2px 6px rgba(245,166,35,0.3)",
                  "& .MuiChip-icon": { color: "white" },
                  px: 0.5,
                  height: 28,
                }}
              />
            )}

            {/* ─── REAL NOTIFICATION BELL ─── */}
            <NotificationBell />

            {/* Avatar Button */}
            <Tooltip title="Account">
              <ButtonBase
                onClick={handleMenuOpen}
                sx={{
                  borderRadius: 10,
                  p: 0.4,
                  pl: { xs: 0.4, md: 0.4 },
                  pr: { xs: 0.4, md: 1.2 },
                  bgcolor: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.18)",
                    borderColor: "rgba(255,255,255,0.35)",
                  },
                  transition: "all 0.2s",
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 30, sm: 32 },
                    height: { xs: 30, sm: 32 },
                    fontSize: { xs: "0.78rem", sm: "0.85rem" },
                    fontWeight: 800,
                    background: roleStyle.bg,
                    color: "white",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.3}
                    sx={{ ml: 0.8 }}
                  >
                    <Typography
                      sx={{
                        color: "white",
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
                      sx={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}
                    />
                  </Stack>
                )}
              </ButtonBase>
            </Tooltip>
          </Stack>

          {/* Account Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1.5,
                minWidth: 260,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                overflow: "hidden",
              },
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2.5,
                background: "linear-gradient(135deg, #F8F9FF 0%, #E8EFFF 100%)",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    background: roleStyle.bg,
                    color: "white",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ overflow: "hidden", flex: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    noWrap
                    sx={{ color: "text.primary" }}
                  >
                    {user?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block", fontSize: "0.72rem" }}
                  >
                    {user?.email}
                  </Typography>
                  <Chip
                    label={user?.role}
                    size="small"
                    sx={{
                      mt: 0.6,
                      height: 20,
                      fontSize: "0.62rem",
                      textTransform: "uppercase",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      bgcolor: roleStyle.chip,
                      color: roleStyle.text,
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Box sx={{ p: 0.5 }}>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/profile");
                }}
                sx={{ borderRadius: 1.5, my: 0.25, py: 1.1 }}
              >
                <ListItemIcon>
                  <PersonOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2" fontWeight={600}>
                  My Profile
                </Typography>
              </MenuItem>

              {isAdmin && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/settings");
                  }}
                  sx={{ borderRadius: 1.5, my: 0.25, py: 1.1 }}
                >
                  <ListItemIcon>
                    <SettingsOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2" fontWeight={600}>
                    School Settings
                  </Typography>
                </MenuItem>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 0.5 }}>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  borderRadius: 1.5,
                  my: 0.25,
                  py: 1.1,
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
