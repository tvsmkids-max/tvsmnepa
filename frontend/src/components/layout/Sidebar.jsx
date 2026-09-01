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
  alpha,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const adminNav = [
  {
    type: "item",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/dashboard",
  },
  { type: "section", label: "Management" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },
  { label: "Classes", icon: <ClassOutlinedIcon />, path: "/classes" },
  {
    label: "Class / Section Shift",
    icon: <SwapHorizOutlinedIcon />,
    path: "/students/shift",
  },
  { type: "section", label: "Attendance" },
  { label: "Mark", icon: <EventNoteOutlinedIcon />, path: "/attendance/mark" },
  { type: "section", label: "Reports" },
  { label: "Daily", icon: <TodayOutlinedIcon />, path: "/reports/daily" },
  {
    label: "Monthly",
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
  { type: "section", label: "Admin" },
  { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
  { label: "Sessions", icon: <SchoolOutlinedIcon />, path: "/sessions" },
  { label: "Promotions", icon: <SchoolOutlinedIcon />, path: "/promotion" },
  {
    label: "Activity Logs",
    icon: <TimelineOutlinedIcon />,
    path: "/activity-logs",
  },
  { type: "section", label: "System" },
  { label: "Backup", icon: <StorageOutlinedIcon />, path: "/backup" },
  { label: "Settings", icon: <SettingsOutlinedIcon />, path: "/settings" },
];

// Same paths as before — still /teacher/dashboard
const teacherNav = [
  {
    type: "item",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/teacher/dashboard",
  },
  { type: "section", label: "Attendance" },
  { label: "Mark", icon: <EventNoteOutlinedIcon />, path: "/attendance/mark" },
  { type: "section", label: "Students" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },
  { type: "section", label: "Reports" },
  { label: "Daily", icon: <TodayOutlinedIcon />, path: "/reports/daily" },
  {
    label: "Monthly",
    icon: <CalendarMonthOutlinedIcon />,
    path: "/reports/monthly",
  },
  {
    label: "Register",
    icon: <ListAltOutlinedIcon />,
    path: "/reports/register",
  },
  { type: "section", label: "Info" },
  { label: "Holidays", icon: <BeachAccessOutlinedIcon />, path: "/holidays" },
];

const SidebarContent = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useThemeMode();

  const navItems = useMemo(() => {
    if (user?.role === "admin") return adminNav;
    // class role uses same teacher nav UI
    return teacherNav;
  }, [user?.role]);

  const allPaths = useMemo(
    () => navItems.filter((item) => item.path).map((item) => item.path),
    [navItems],
  );

  const isActive = (path) => {
    if (path === "/dashboard" || path === "/teacher/dashboard") {
      return location.pathname === path;
    }
    const current = location.pathname;
    if (current === path) return true;
    if (current.startsWith(path + "/")) {
      const moreSpecificExists = allPaths.some(
        (p) => p !== path && p.startsWith(path + "/") && current.startsWith(p),
      );
      return !moreSpecificExists;
    }
    return false;
  };

  const sidebarBg = isDark ? "#0B0F19" : "#FFFFFF";
  const borderColor = isDark ? "#1E293B" : "#E2E8F0";
  const headingColor = isDark ? "#64748B" : "#94A3B8";
  const itemColor = isDark ? "#94A3B8" : "#64748B";
  const itemActiveColor = isDark ? "#F8FAFC" : "#0F172A";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9";
  const activeBg = isDark ? alpha("#3B82F6", 0.12) : alpha("#0F172A", 0.06);
  const activeBar = isDark ? "#3B82F6" : "#0F172A";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: sidebarBg,
        overflow: "hidden",
        borderRight: `1px solid ${borderColor}`,
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pt: 1.5,
          pb: 2,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: isDark ? "#334155" : "#CBD5E1",
            borderRadius: 2,
          },
        }}
      >
        <List dense disablePadding>
          {navItems.map((item, idx) => {
            if (item.type === "section") {
              return (
                <Box key={`section-${idx}`} sx={{ mt: 2, mb: 0.5 }}>
                  {!collapsed ? (
                    <Typography
                      sx={{
                        px: 2.5,
                        py: 0.5,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: headingColor,
                        userSelect: "none",
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Divider sx={{ borderColor, mx: 1.5 }} />
                  )}
                </Box>
              );
            }

            const active = isActive(item.path);
            const isDashboard = item.type === "item";

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
                    py: isDashboard ? 1 : 0.75,
                    pl: collapsed ? 1.25 : isDashboard ? 1.5 : 2.25,
                    pr: 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    minHeight: isDashboard ? 42 : 38,
                    color: active ? itemActiveColor : itemColor,
                    bgcolor: active ? activeBg : "transparent",
                    borderLeft: "3px solid",
                    borderLeftColor: active ? activeBar : "transparent",
                    "&:hover": {
                      bgcolor: hoverBg,
                      color: itemActiveColor,
                    },
                    transition: "all 0.15s ease",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: active ? itemActiveColor : itemColor,
                      minWidth: collapsed ? "unset" : 34,
                      "& svg": {
                        fontSize: isDashboard ? "1.25rem" : "1.15rem",
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: isDashboard ? "0.88rem" : "0.84rem",
                        fontWeight: active ? 700 : 500,
                        letterSpacing: "-0.01em",
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
        top: 64,
        height: "calc(100vh - 64px)",
      },
    }}
  >
    <SidebarContent collapsed={collapsed} />
  </Drawer>
);

export default Sidebar;
