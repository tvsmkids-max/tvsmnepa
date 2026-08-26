import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Stack,
  IconButton,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import useAuth from "../../hooks/useAuth";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/teacher/dashboard") return "home";
    if (path.startsWith("/attendance/mark")) return "mark";

    // Admin uses "daily", teacher uses "monthly"
    if (isAdmin && path.startsWith("/reports/daily")) return "daily";
    if (!isAdmin && path.startsWith("/reports/monthly")) return "monthly";

    if (path.startsWith("/students")) return "students";
    return false;
  };

  const handleChange = (event, newValue) => {
    if (newValue === "more") {
      setDrawerOpen(true);
      return;
    }

    const homeRoute = isAdmin ? "/dashboard" : "/teacher/dashboard";

    const routes = {
      home: homeRoute,
      mark: "/attendance/mark",
      daily: "/reports/daily",
      monthly: "/reports/monthly",
      students: "/students",
    };
    if (routes[newValue]) navigate(routes[newValue]);
  };

  const handleDrawerNav = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  // ─── ADMIN MORE ITEMS ───
  const adminMoreItems = [
    { divider: true, label: "Personal" },
    { label: "My Profile", icon: <PersonOutlinedIcon />, path: "/profile" },

    { divider: true, label: "Management" },
    { label: "Classes", icon: <ClassOutlinedIcon />, path: "/classes" },
    { label: "Teachers", icon: <PersonOutlinedIcon />, path: "/teachers" },
    {
      label: "Section Shift",
      icon: <SwapHorizOutlinedIcon />,
      path: "/students/shift",
    },

    { divider: true, label: "Reports" },
    {
      label: "Monthly Report",
      icon: <CalendarMonthOutlinedIcon />,
      path: "/reports/monthly",
    },
    {
      label: "Defaulters",
      icon: <WarningAmberOutlinedIcon />,
      path: "/reports/defaulters",
    },
    {
      label: "Register",
      icon: <ListAltOutlinedIcon />,
      path: "/reports/register",
    },
    { label: "Analytics", icon: <AnalyticsOutlinedIcon />, path: "/analytics" },

    { divider: true, label: "Administration" },
    { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
    { label: "Sessions", icon: <SchoolOutlinedIcon />, path: "/sessions" },
    { label: "Promotions", icon: <SchoolOutlinedIcon />, path: "/promotion" },
    {
      label: "Activity Logs",
      icon: <TimelineOutlinedIcon />,
      path: "/activity-logs",
    },

    { divider: true, label: "System" },
    {
      label: "Backup & Restore",
      icon: <StorageOutlinedIcon />,
      path: "/backup",
    },
    { label: "Settings", icon: <SettingsOutlinedIcon />, path: "/settings" },
  ];

  // ─── TEACHER MORE ITEMS ───
  const teacherMoreItems = [
    { divider: true, label: "Personal" },
    { label: "My Profile", icon: <PersonOutlinedIcon />, path: "/profile" },

    { divider: true, label: "Reports" },
    {
      label: "Daily Report",
      icon: <TodayOutlinedIcon />,
      path: "/reports/daily",
    },
    {
      label: "Register",
      icon: <ListAltOutlinedIcon />,
      path: "/reports/register",
    },
    { divider: true, label: "Info" },
    { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
  ];

  const moreItems = isAdmin ? adminMoreItems : teacherMoreItems;

  const isActivePath = (path) =>
    location.pathname === path || location.pathname.startsWith(path);

  return (
    <>
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          display: { xs: "block", md: "none" },
          borderTop: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
          bgcolor: "background.paper",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        elevation={0}
      >
        <BottomNavigation
          value={getCurrentValue()}
          onChange={handleChange}
          showLabels
          sx={{
            height: 60,
            bgcolor: "background.paper",
            "& .MuiBottomNavigationAction-root": {
              minWidth: "auto",
              padding: "6px 4px",
              color: "text.secondary",
              transition: "all 0.2s",
              "&.Mui-selected": {
                color: "primary.main",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "25%",
                  right: "25%",
                  height: 3,
                  borderRadius: "0 0 4px 4px",
                  bgcolor: "primary.main",
                },
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              fontWeight: 600,
              marginTop: "2px",
              "&.Mui-selected": { fontSize: "0.68rem", fontWeight: 800 },
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<HomeOutlinedIcon sx={{ fontSize: 22 }} />}
          />
          <BottomNavigationAction
            label="Mark"
            value="mark"
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 22 }} />}
          />
          {isAdmin ? (
            <BottomNavigationAction
              label="Daily"
              value="daily"
              icon={<TodayOutlinedIcon sx={{ fontSize: 22 }} />}
            />
          ) : (
            <BottomNavigationAction
              label="Monthly"
              value="monthly"
              icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />}
            />
          )}
          <BottomNavigationAction
            label="Students"
            value="students"
            icon={<PeopleOutlinedIcon sx={{ fontSize: 22 }} />}
          />
          <BottomNavigationAction
            label="More"
            value="more"
            icon={<MenuOutlinedIcon sx={{ fontSize: 22 }} />}
          />
        </BottomNavigation>
      </Paper>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px 16px 0 0",
            maxHeight: "80vh",
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        }}
      >
        <Box sx={{ textAlign: "center", pt: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "divider",
              mx: "auto",
            }}
          />
        </Box>

        <Box sx={{ px: 2.5, pb: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: isAdmin ? "primary.main" : "secondary.main",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{ color: "text.primary", letterSpacing: "-0.01em" }}
                >
                  {user?.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                  }}
                >
                  {user?.role}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={() => setDrawerOpen(false)}
              size="small"
              sx={{ bgcolor: "action.hover" }}
            >
              <CloseOutlinedIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        <List sx={{ px: 1.5, py: 1 }}>
          {moreItems.map((item, idx) => {
            if (item.divider) {
              return (
                <Typography
                  key={`div-${idx}`}
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 1.5,
                    pt: idx === 0 ? 1 : 2,
                    pb: 0.5,
                    color: "text.disabled",
                    fontWeight: 800,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.label}
                </Typography>
              );
            }

            const active = isActivePath(item.path);

            return (
              <ListItemButton
                key={item.path}
                onClick={() => handleDrawerNav(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.3,
                  py: 1.2,
                  bgcolor: active
                    ? isDark
                      ? alpha(theme.palette.primary.main, 0.12)
                      : "#F0F4FF"
                    : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: active ? "primary.main" : "text.secondary",
                  }}
                >
                  {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.88rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "primary.main" : "text.primary",
                    letterSpacing: "-0.01em",
                  }}
                />
                {active && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>

        <Divider />

        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.2,
              color: "error.main",
              "&:hover": { bgcolor: "error.50" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LogoutOutlinedIcon sx={{ fontSize: 20, color: "error.main" }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                fontSize: "0.88rem",
                fontWeight: 700,
                color: "error.main",
              }}
            />
          </ListItemButton>
        </Box>

        <Box sx={{ textAlign: "center", pb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              fontSize: "0.62rem",
              fontWeight: 600,
            }}
          >
            v{import.meta.env.VITE_APP_VERSION || "1.0.0"} • TVSM
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
