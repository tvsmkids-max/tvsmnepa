import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
  Tooltip,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import ClassIcon from "@mui/icons-material/Class";
import PersonIcon from "@mui/icons-material/Person";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SchoolIcon from "@mui/icons-material/School";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import useAuth from "../../hooks/useAuth";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";

const adminNav = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { divider: true, label: "Management" },
  { label: "Students", icon: <PeopleIcon />, path: "/students" },
  { label: "Classes", icon: <ClassIcon />, path: "/classes" },
  { label: "Teachers", icon: <PersonIcon />, path: "/teachers" },
  { divider: true, label: "Attendance" },
  {
    label: "Mark Attendance",
    icon: <EventNoteIcon />,
    path: "/attendance/mark",
  },
  { label: "History", icon: <HistoryIcon />, path: "/attendance/history" },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentIcon />, path: "/reports" },
  { label: "Analytics", icon: <AnalyticsIcon />, path: "/analytics" },
  { divider: true, label: "Admin" },
  { label: "Holidays", icon: <BeachAccessIcon />, path: "/holidays" },
  { label: "Sessions", icon: <SchoolIcon />, path: "/sessions" },
  { label: "Promotions", icon: <SchoolIcon />, path: "/promotion" }, // ← Must be here
  {
    label: "Notifications",
    icon: <NotificationsIcon />,
    path: "/notifications",
  },
  { label: "Activity Logs", icon: <HistoryIcon />, path: "/activity-logs" },
  { label: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

const teacherNav = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/teacher/dashboard" },
  { divider: true, label: "Attendance" },
  {
    label: "Mark Attendance",
    icon: <EventNoteIcon />,
    path: "/attendance/mark",
  },
  { label: "History", icon: <HistoryIcon />, path: "/attendance/history" },
  { divider: true, label: "My Students" },
  { label: "Students", icon: <PeopleIcon />, path: "/students" },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentIcon />, path: "/reports" },
];

const SidebarContent = ({ collapsed, onCollapseToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = useMemo(
    () => (user?.role === "admin" ? adminNav : teacherNav),
    [user?.role],
  );

  const isActive = (path) => {
    if (path === "/dashboard" || path === "/teacher/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 52,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {!collapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MenuOpenIcon
              sx={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}
            />
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Navigation
            </Typography>
          </Box>
        )}

        <IconButton
          onClick={onCollapseToggle}
          size="small"
          sx={{
            color: "rgba(255,255,255,0.7)",
            flexShrink: 0,
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          {collapsed ? (
            <ChevronRightIcon fontSize="small" />
          ) : (
            <ChevronLeftIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      {/* Nav Items */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1 }}>
        <List dense disablePadding>
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <Box key={`div-${idx}`}>
                  {!collapsed ? (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 2.5,
                        pt: 2,
                        pb: 0.5,
                        display: "block",
                        color: "rgba(255,255,255,0.45)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Divider
                      sx={{ borderColor: "rgba(255,255,255,0.1)", my: 0.5 }}
                    />
                  )}
                </Box>
              );
            }

            const active = isActive(item.path);

            return (
              <Tooltip
                key={item.path}
                title={collapsed ? item.label : ""}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    mx: 1,
                    mb: 0.25,
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    minHeight: 40,
                    color: active ? "white" : "rgba(255,255,255,0.72)",
                    bgcolor: active ? "rgba(255,255,255,0.16)" : "transparent",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.1)",
                      color: "white",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "inherit",
                      minWidth: collapsed ? "unset" : 36,
                      "& svg": { fontSize: "1.25rem" },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.875rem",
                        fontWeight: active ? 700 : 500,
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* User Footer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: "secondary.main",
            fontSize: "0.85rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {user?.name?.[0]?.toUpperCase()}
        </Avatar>
        {!collapsed && (
          <Box sx={{ overflow: "hidden" }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ color: "white", lineHeight: 1.2 }}
            >
              {user?.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.6)",
                textTransform: "capitalize",
              }}
            >
              {user?.role}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Sidebar — Desktop only (mobile uses bottom nav)
const Sidebar = ({ drawerWidth, collapsed, onCollapseToggle }) => (
  <Drawer
    variant="permanent"
    sx={{
      display: { xs: "none", md: "block" },
      width: drawerWidth,
      flexShrink: 0,
      "& .MuiDrawer-paper": {
        width: drawerWidth,
        boxSizing: "border-box",
        border: "none",
        transition: "width 0.25s ease",
        overflow: "hidden",
        top: 70,
        height: "calc(100vh - 70px)",
      },
    }}
  >
    <SidebarContent collapsed={collapsed} onCollapseToggle={onCollapseToggle} />
  </Drawer>
);

export default Sidebar;
