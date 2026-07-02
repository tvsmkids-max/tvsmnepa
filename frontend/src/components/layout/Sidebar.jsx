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
  Tooltip,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const adminNav = [
  { label: "Dashboard", icon: <DashboardOutlinedIcon />, path: "/dashboard" },
  { divider: true, label: "Management" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },
  {
    label: "Section Shift",
    icon: <SwapHorizOutlinedIcon />,
    path: "/students/shift",
  },
  { label: "Classes", icon: <ClassOutlinedIcon />, path: "/classes" },
  { label: "Teachers", icon: <PersonOutlinedIcon />, path: "/teachers" },
  { divider: true, label: "Attendance" },
  { label: "Mark", icon: <EventNoteOutlinedIcon />, path: "/attendance/mark" },
  {
    label: "History",
    icon: <HistoryOutlinedIcon />,
    path: "/attendance/history",
  },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentOutlinedIcon />, path: "/reports" },
  { label: "Analytics", icon: <AnalyticsOutlinedIcon />, path: "/analytics" },
  { divider: true, label: "Admin" },
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
  { label: "Backup", icon: <StorageOutlinedIcon />, path: "/backup" },
  { label: "Settings", icon: <SettingsOutlinedIcon />, path: "/settings" },
];

const teacherNav = [
  {
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/teacher/dashboard",
  },
  { divider: true, label: "Attendance" },
  { label: "Mark", icon: <EventNoteOutlinedIcon />, path: "/attendance/mark" },
  {
    label: "History",
    icon: <HistoryOutlinedIcon />,
    path: "/attendance/history",
  },
  { divider: true, label: "Students" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentOutlinedIcon />, path: "/reports" },
];

const principalNav = [
  {
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/principal/dashboard",
  },
  { divider: true, label: "School" },
  { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
];

const SidebarContent = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useThemeMode();

  const navItems = useMemo(() => {
    if (user?.role === "admin") return adminNav;
    if (user?.role === "principal") return principalNav;
    return teacherNav;
  }, [user?.role]);

  // ═══════════════════════════════════════════════════════
  //  isActive — FIXED: Most-specific match wins
  //  Prevents "/students" from highlighting when on "/students/shift"
  // ═══════════════════════════════════════════════════════
  const isActive = (path) => {
    // Exact-match routes (dashboards)
    if (
      path === "/dashboard" ||
      path === "/teacher/dashboard" ||
      path === "/principal/dashboard"
    ) {
      return location.pathname === path;
    }

    const current = location.pathname;

    // Exact match always wins
    if (current === path) return true;

    // Sub-route match (e.g., /students/123 under /students)
    if (current.startsWith(path + "/")) {
      // Check: is there a MORE SPECIFIC menu item that matches?
      // If yes, don't highlight this less-specific one
      const moreSpecificExists = navItems.some(
        (item) =>
          !item.divider &&
          item.path !== path &&
          item.path.startsWith(path + "/") &&
          current.startsWith(item.path),
      );
      return !moreSpecificExists;
    }

    return false;
  };

  // ═══════════════════════════════════════════════════════
  //  UNIFORM COLOR SCHEME
  // ═══════════════════════════════════════════════════════
  const sidebarBg = isDark ? "#111827" : "#FFFFFF";
  const borderColor = isDark ? "#1F2937" : "#E5E7EB";
  const scrollbarThumb = isDark ? "#374151" : "#D1D5DB";

  const mainColor = isDark ? "#F1F5F9" : "#1F2937";
  const headingColor = isDark ? "#F1F5F9" : "#1F2937";
  const iconColor = mainColor;
  const itemColor = mainColor;
  const itemActiveColor = isDark ? "#FFFFFF" : "#000000";

  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const activeBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
  const activeIndicator = isDark ? "#FFFFFF" : "#000000";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: sidebarBg,
        overflow: "hidden",
        transition: "background-color 0.3s ease",
        borderRight: `1px solid ${borderColor}`,
      }}
    >
      {/* ── Nav Items ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pt: 1,
          pb: 1,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: scrollbarThumb,
            borderRadius: 2,
          },
        }}
      >
        <List dense disablePadding>
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <Box key={`div-${idx}`}>
                  {!collapsed ? (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 2,
                        pt: idx === 0 ? 0.5 : 1.8,
                        pb: 0.4,
                        display: "block",
                        color: headingColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Divider sx={{ borderColor, my: 0.5, mx: 1 }} />
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
                    mx: 0.8,
                    mb: 0.2,
                    borderRadius: 1.5,
                    py: 0.7,
                    px: collapsed ? 1.2 : 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    minHeight: 36,
                    color: active ? itemActiveColor : itemColor,
                    bgcolor: active ? activeBg : "transparent",
                    borderLeft: active
                      ? `3px solid ${activeIndicator}`
                      : "3px solid transparent",
                    "&:hover": {
                      bgcolor: hoverBg,
                      color: itemActiveColor,
                    },
                    transition: "all 0.15s ease",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: active ? itemActiveColor : iconColor,
                      minWidth: collapsed ? "unset" : 32,
                      "& svg": { fontSize: "1.2rem" },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.85rem",
                        fontWeight: active ? 700 : 600,
                        noWrap: true,
                        color: "inherit",
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

const Sidebar = ({ drawerWidth, collapsed }) => (
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
        transition: "width 0.2s ease",
        overflow: "hidden",
        top: 55,
        height: "calc(100vh - 55px)",
      },
    }}
  >
    <SidebarContent collapsed={collapsed} />
  </Drawer>
);

export default Sidebar;