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
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import useAuth from "../../hooks/useAuth";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/teacher/dashboard") return "home";
    if (path.startsWith("/attendance/mark")) return "mark";
    if (path.startsWith("/reports/monthly")) return "monthly";
    if (path.startsWith("/attendance/history")) return "history";
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
      monthly: "/reports/monthly",
      history: "/attendance/history",
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
    { divider: true, label: "Attendance" },
    {
      label: "History",
      icon: <HistoryOutlinedIcon />,
      path: "/attendance/history",
    },
    { divider: true, label: "Reports" },
    { label: "Reports", icon: <AssessmentOutlinedIcon />, path: "/reports" },
    { label: "Analytics", icon: <AnalyticsOutlinedIcon />, path: "/analytics" },
    { divider: true, label: "Administration" },
    { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
    { label: "Sessions", icon: <SchoolOutlinedIcon />, path: "/sessions" },
    { label: "Promotions", icon: <SchoolOutlinedIcon />, path: "/promotion" },
    {
      label: "Notifications",
      icon: <NotificationsOutlinedIcon />,
      path: "/notifications",
    },
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
    {
      label: "Notifications",
      icon: <NotificationsOutlinedIcon />,
      path: "/notifications",
    },
    { divider: true, label: "Attendance" },
    {
      label: "Attendance History",
      icon: <HistoryOutlinedIcon />,
      path: "/attendance/history",
    },
    { divider: true, label: "Reports" },
    {
      label: "Daily Report",
      icon: <AssessmentOutlinedIcon />,
      path: "/reports/daily",
    },
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
              "&.Mui-selected": { color: "primary.main" },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              fontWeight: 600,
              marginTop: "2px",
              "&.Mui-selected": { fontSize: "0.67rem", fontWeight: 700 },
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
          <BottomNavigationAction
            label="Monthly"
            value="monthly"
            icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />}
          />
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
            maxHeight: "75vh",
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
                  bgcolor: "primary.main",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: "text.primary" }}
                >
                  {user?.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.7rem",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseOutlinedIcon
                sx={{ fontSize: 20, color: "text.secondary" }}
              />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        <List sx={{ px: 1, py: 1 }}>
          {moreItems.map((item, idx) => {
            if (item.divider) {
              return (
                <Typography
                  key={`div-${idx}`}
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 2,
                    pt: idx === 0 ? 1 : 2,
                    pb: 0.5,
                    color: "text.secondary",
                    fontWeight: 700,
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
                  bgcolor: active ? "action.selected" : "transparent",
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
                fontWeight: 600,
                color: "error.main",
              }}
            />
          </ListItemButton>
        </Box>

        <Box sx={{ textAlign: "center", pb: 2 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: "0.62rem" }}
          >
            v{import.meta.env.VITE_APP_VERSION || "1.0.0"} • by Abhishek
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
