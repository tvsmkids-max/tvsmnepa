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
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
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

  // Menu items for "More" drawer
  const adminMoreItems = [
    { divider: true, label: "Management" },
    { label: "Classes", icon: <ClassOutlinedIcon />, path: "/classes" },
    { label: "Teachers", icon: <PersonOutlinedIcon />, path: "/teachers" },
    { divider: true, label: "Reports" },
    { label: "Reports", icon: <AssessmentOutlinedIcon />, path: "/reports" },
    { label: "Analytics", icon: <AnalyticsOutlinedIcon />, path: "/analytics" },
    { divider: true, label: "Administration" },
    { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
    { label: "Sessions", icon: <SchoolOutlinedIcon />, path: "/sessions" },
    { label: "Promotions", icon: <SchoolOutlinedIcon />, path: "/promotion" }, // ← ADD THIS
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
    { label: "Settings", icon: <SettingsOutlinedIcon />, path: "/settings" },
  ];

  const teacherMoreItems = [
    { divider: true, label: "Reports" },
    { label: "Reports", icon: <AssessmentOutlinedIcon />, path: "/reports" },
  ];

  const moreItems = isAdmin ? adminMoreItems : teacherMoreItems;

  const isActivePath = (path) =>
    location.pathname === path || location.pathname.startsWith(path);

  return (
    <>
      {/* Bottom Navigation */}
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          display: { xs: "block", md: "none" },
          borderTop: "1px solid",
          borderColor: "rgba(0,0,0,0.06)",
          borderRadius: 0,
        }}
        elevation={0}
      >
        <BottomNavigation
          value={getCurrentValue()}
          onChange={handleChange}
          showLabels
          sx={{
            height: 60,
            bgcolor: "white",
            "& .MuiBottomNavigationAction-root": {
              minWidth: "auto",
              padding: "6px 4px",
              color: "#8E99A4",
              "&.Mui-selected": {
                color: "#0D1B3E",
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              fontWeight: 600,
              marginTop: "2px",
              "&.Mui-selected": {
                fontSize: "0.67rem",
                fontWeight: 700,
              },
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
            label="History"
            value="history"
            icon={<HistoryOutlinedIcon sx={{ fontSize: 22 }} />}
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

      {/* More Drawer — Slides up from bottom */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px 16px 0 0",
            maxHeight: "75vh",
          },
        }}
      >
        {/* Drawer Handle */}
        <Box sx={{ textAlign: "center", pt: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "#E0E0E0",
              mx: "auto",
            }}
          />
        </Box>

        {/* Header */}
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
                  bgcolor: "#0D1B3E",
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
                  sx={{ color: "#1A1D21" }}
                >
                  {user?.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#8E99A4",
                    fontSize: "0.7rem",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseOutlinedIcon sx={{ fontSize: 20, color: "#8E99A4" }} />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        {/* Menu Items */}
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
                    color: "#8E99A4",
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
                  bgcolor: active ? "#F0F1F3" : "transparent",
                  "&:active": { bgcolor: "#F0F1F3" },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: active ? "#0D1B3E" : "#8E99A4",
                  }}
                >
                  {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.88rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#0D1B3E" : "#1A1D21",
                  }}
                />
                {active && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#0D1B3E",
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>

        <Divider />

        {/* Sign Out */}
        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.2,
              color: "#DC2626",
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LogoutOutlinedIcon sx={{ fontSize: 20, color: "#DC2626" }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#DC2626",
              }}
            />
          </ListItemButton>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: "center", pb: 2 }}>
          <Typography
            variant="caption"
            sx={{ color: "#C5CAD0", fontSize: "0.62rem" }}
          >
            v{import.meta.env.VITE_APP_VERSION || "1.0.0"} • by Abhishek
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
