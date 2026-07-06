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
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

// ═══════════════════════════════════════════════════════════════════
//  NAV STRUCTURE — Flat sections (NO dropdown, always visible)
// ═══════════════════════════════════════════════════════════════════

const adminNav = [
  // Dashboard — standalone
  {
    type: "item",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/dashboard",
  },

  // Management section
  { type: "section", label: "Management" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },
  {
    label: "Section Shift",
    icon: <SwapHorizOutlinedIcon />,
    path: "/students/shift",
  },
  { label: "Classes", icon: <ClassOutlinedIcon />, path: "/classes" },
  { label: "Teachers", icon: <PersonOutlinedIcon />, path: "/teachers" },

  // Attendance section
  { type: "section", label: "Attendance" },
  {
    label: "Mark",
    icon: <EventNoteOutlinedIcon />,
    path: "/attendance/mark",
  },
  {
    label: "History",
    icon: <HistoryOutlinedIcon />,
    path: "/attendance/history",
  },

  // Reports section
  { type: "section", label: "Reports" },
  {
    label: "Daily",
    icon: <TodayOutlinedIcon />,
    path: "/reports/daily",
  },
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
  {
    label: "Analytics",
    icon: <AnalyticsOutlinedIcon />,
    path: "/analytics",
  },

  // Admin section
  { type: "section", label: "Admin" },
  {
    label: "Holidays",
    icon: <BeachAccessOutlinedIcon />,
    path: "/holidays",
  },
  { label: "Sessions", icon: <SchoolOutlinedIcon />, path: "/sessions" },
  {
    label: "Promotions",
    icon: <SchoolOutlinedIcon />,
    path: "/promotion",
  },
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

  // System section
  { type: "section", label: "System" },
  { label: "Backup", icon: <StorageOutlinedIcon />, path: "/backup" },
  {
    label: "Settings",
    icon: <SettingsOutlinedIcon />,
    path: "/settings",
  },
];

const teacherNav = [
  // Dashboard — standalone
  {
    type: "item",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    path: "/teacher/dashboard",
  },

  // Attendance section
  { type: "section", label: "Attendance" },
  {
    label: "Mark",
    icon: <EventNoteOutlinedIcon />,
    path: "/attendance/mark",
  },
  {
    label: "History",
    icon: <HistoryOutlinedIcon />,
    path: "/attendance/history",
  },

  // Students section
  { type: "section", label: "Students" },
  { label: "Students", icon: <PeopleOutlinedIcon />, path: "/students" },

  // Reports section — ✅ Register REMOVED, Monthly ADDED
  { type: "section", label: "Reports" },
  {
    label: "Daily",
    icon: <TodayOutlinedIcon />,
    path: "/reports/daily",
  },
  {
    label: "Monthly", // ✅ ADDED
    icon: <CalendarMonthOutlinedIcon />,
    path: "/reports/monthly",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR CONTENT
// ═══════════════════════════════════════════════════════════════════

const SidebarContent = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useThemeMode();

  const navItems = useMemo(() => {
    if (user?.role === "admin") return adminNav;
    return teacherNav;
  }, [user?.role]);

  // ═══════════════════════════════════════════════════════
  //  Flatten all paths for active matching
  // ═══════════════════════════════════════════════════════

  const allPaths = useMemo(() => {
    return navItems.filter((item) => item.path).map((item) => item.path);
  }, [navItems]);

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

  // ═══════════════════════════════════════════════════════
  //  COLORS — 100% same as original
  // ═══════════════════════════════════════════════════════

  const sidebarBg = isDark ? "#111827" : "#FFFFFF";
  const borderColor = isDark ? "#1F2937" : "#E5E7EB";
  const scrollbarThumb = isDark ? "#374151" : "#D1D5DB";

  const mainColor = isDark ? "#F1F5F9" : "#1F2937";
  const headingColor = isDark ? "#9CA3AF" : "#6B7280";
  const iconColor = mainColor;
  const itemColor = isDark ? "#D1D5DB" : "#4B5563";
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
            // ── SECTION LABEL (flat, not clickable) ──
            if (item.type === "section") {
              return (
                <Box key={`section-${idx}`} sx={{ mt: 1.5, mb: 0.3 }}>
                  {!collapsed ? (
                    // Show label when expanded
                    <Typography
                      sx={{
                        px: 2.3,
                        py: 0.4,
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: headingColor,
                        userSelect: "none",
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    // Show divider when collapsed
                    <Divider sx={{ borderColor, mx: 1 }} />
                  )}
                </Box>
              );
            }

            // ── NAV ITEM (Dashboard + all children) ──
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
                    mx: 0.8,
                    mb: 0.15,
                    borderRadius: 1.5,
                    py: isDashboard ? 0.8 : 0.6,
                    pl: collapsed ? 1.2 : isDashboard ? 1.5 : 2.5,
                    pr: collapsed ? 1.2 : 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    minHeight: isDashboard ? 38 : 34,
                    color: active
                      ? itemActiveColor
                      : isDashboard
                        ? mainColor
                        : itemColor,
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
                      minWidth: collapsed ? "unset" : isDashboard ? 32 : 28,
                      "& svg": {
                        fontSize: isDashboard ? "1.2rem" : "1.1rem",
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: isDashboard ? "0.85rem" : "0.82rem",
                        fontWeight: active ? 700 : isDashboard ? 600 : 500,
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

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR WRAPPER — 100% same as original
// ═══════════════════════════════════════════════════════════════════

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
