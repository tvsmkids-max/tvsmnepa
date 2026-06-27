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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";

const DEFAULT_SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const Topbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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

  const schoolName =
    settings?.schoolName && settings.schoolName !== "Setup Required"
      ? settings.schoolName
      : DEFAULT_SCHOOL_NAME;

  const schoolAddress = settings?.address || "";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background:
          "linear-gradient(90deg, #FFFFFF 0%, #F8FAFF 50%, #FFFFFF 100%)",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: "100%",
        boxShadow: "0 1px 3px rgba(13,27,62,0.06)",
      }}
    >
      <Toolbar
        sx={{ gap: 2, minHeight: "70px !important", px: { xs: 2, sm: 3 } }}
      >
        {/* Menu Icon — Desktop only */}
        {!isMobile && (
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{
              color: "primary.dark",
              bgcolor: "rgba(13,27,62,0.04)",
              "&:hover": { bgcolor: "rgba(13,27,62,0.08)" },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo */}
        <Avatar
          src={SCHOOL_LOGO}
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            bgcolor: "white",
            border: "2px solid",
            borderColor: "primary.main",
            boxShadow: "0 2px 8px rgba(13,27,62,0.15)",
            "& img": { objectFit: "contain", p: 0.5 },
            flexShrink: 0,
          }}
        >
          <SchoolIcon sx={{ color: "primary.main" }} />
        </Avatar>

        {/* School Name */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Typography
            variant="h6"
            fontWeight={900}
            sx={{
              background:
                "linear-gradient(90deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: {
                xs: "0.85rem",
                sm: "1.1rem",
                md: "1.25rem",
                lg: "1.4rem",
              },
              lineHeight: 1.15,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: '"Inter", sans-serif',
            }}
            title={schoolName}
          >
            {schoolName}
          </Typography>
          {schoolAddress && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.6rem", sm: "0.72rem" },
                lineHeight: 1.2,
                letterSpacing: "0.04em",
                fontWeight: 500,
                display: { xs: "none", md: "block" },
                mt: 0.2,
              }}
              noWrap
            >
              📍 {schoolAddress}
            </Typography>
          )}
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.5, sm: 1.5 }}
        >
          {/* Session Chip */}
          {sessionName && (
            <Chip
              label={sessionName}
              size="small"
              icon={<SchoolIcon sx={{ fontSize: 14 }} />}
              sx={{
                display: { xs: "none", sm: "flex" },
                fontWeight: 700,
                background: "linear-gradient(135deg, #F5A623 0%, #E8920F 100%)",
                color: "white",
                border: "none",
                boxShadow: "0 2px 6px rgba(245,166,35,0.3)",
                "& .MuiChip-icon": { color: "white" },
                px: 0.5,
              }}
            />
          )}

          {/* Avatar — Always visible */}
          <Tooltip title="Account">
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                border: "2px solid",
                borderColor: "primary.main",
                "&:hover": { borderColor: "primary.dark" },
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  bgcolor: "primary.main",
                  fontSize: { xs: "0.8rem", sm: "0.95rem" },
                  fontWeight: 800,
                  background:
                    "linear-gradient(135deg, #1E4D98 0%, #0D1B3E 100%)",
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
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
              minWidth: 240,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Box sx={{ px: 2, py: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: "primary.main",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  background:
                    "linear-gradient(135deg, #1E4D98 0%, #0D1B3E 100%)",
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ overflow: "hidden" }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {user?.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block" }}
                >
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.role}
                  size="small"
                  sx={{
                    mt: 0.5,
                    height: 18,
                    fontSize: "0.62rem",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    bgcolor: user?.role === "admin" ? "#FFF4E5" : "#E0EBFF",
                    color: user?.role === "admin" ? "#B45309" : "#1E4D98",
                  }}
                />
              </Box>
            </Stack>
          </Box>

          <Divider />

          <MenuItem
            onClick={handleMenuClose}
            sx={{ borderRadius: 1, mx: 0.5, my: 0.25, py: 1 }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            My Profile
          </MenuItem>

          {isAdmin && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate("/settings");
              }}
              sx={{ borderRadius: 1, mx: 0.5, my: 0.25, py: 1 }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              School Settings
            </MenuItem>
          )}

          <Divider />

          <MenuItem
            onClick={handleLogout}
            sx={{
              color: "error.main",
              borderRadius: 1,
              mx: 0.5,
              my: 0.25,
              py: 1,
              fontWeight: 600,
            }}
          >
            <ListItemIcon>
              <ExitToAppIcon fontSize="small" color="error" />
            </ListItemIcon>
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
