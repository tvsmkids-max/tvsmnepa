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
import AnalyticsIcon from "@mui/icons-material/Analytics";
import StorageIcon from "@mui/icons-material/Storage";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TimelineIcon from "@mui/icons-material/Timeline";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";

const adminNav = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { divider: true, label: "Management" },
  { label: "Students", icon: <PeopleIcon />, path: "/students" },
  { label: "Section Shift", icon: <SwapHorizIcon />, path: "/students/shift" },
  { label: "Classes", icon: <ClassIcon />, path: "/classes" },
  { label: "Teachers", icon: <PersonIcon />, path: "/teachers" },
  { divider: true, label: "Attendance" },
  { label: "Mark", icon: <EventNoteIcon />, path: "/attendance/mark" },
  { label: "History", icon: <HistoryIcon />, path: "/attendance/history" },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentIcon />, path: "/reports" },
  { label: "Analytics", icon: <AnalyticsIcon />, path: "/analytics" },
  { divider: true, label: "Admin" },
  { label: "Holidays", icon: <BeachAccessIcon />, path: "/holidays" },
  { label: "Sessions", icon: <SchoolIcon />, path: "/sessions" },
  { label: "Promotions", icon: <SchoolIcon />, path: "/promotion" },
  {
    label: "Notifications",
    icon: <NotificationsIcon />,
    path: "/notifications",
  },
  { label: "Activity Logs", icon: <TimelineIcon />, path: "/activity-logs" },
  { divider: true, label: "System" },
  { label: "Backup", icon: <StorageIcon />, path: "/backup" },
  { label: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

const teacherNav = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/teacher/dashboard" },
  { divider: true, label: "Attendance" },
  { label: "Mark", icon: <EventNoteIcon />, path: "/attendance/mark" },
  { label: "History", icon: <HistoryIcon />, path: "/attendance/history" },
  { divider: true, label: "Students" },
  { label: "Students", icon: <PeopleIcon />, path: "/students" },
  { divider: true, label: "Reports" },
  { label: "Reports", icon: <AssessmentIcon />, path: "/reports" },
];

const principalNav = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/principal/dashboard" },
  { divider: true, label: "School" },
  { label: "Holidays", icon: <BeachAccessIcon />, path: "/holidays" },
];

const SidebarContent = ({ collapsed, onCollapseToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useThemeMode();

  const navItems = useMemo(() => {
    if (user?.role === "admin") return adminNav;
    if (user?.role === "principal") return principalNav;
    return teacherNav;
  }, [user?.role]);

  const isActive = (path) => {
    if (
      path === "/dashboard" ||
      path === "/teacher/dashboard" ||
      path === "/principal/dashboard"
    ) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // ─── THEME-AWARE COLORS ───
  const sidebarBg = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#111827";
  const borderColor = isDark ? "#1F2937" : "#E5E7EB";
  const labelColor = isDark ? "#6B7280" : "#9CA3AF";
  const itemColor = isDark ? "#9CA3AF" : "#6B7280";
  const itemActiveColor = isDark ? "#F9FAFB" : "#111827";
  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const activeBg = isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)";
  const activeIndicator = isDark ? "#3B82F6" : "#3B82F6";
  const scrollbarThumb = isDark ? "#374151" : "#D1D5DB";
  const userRoleColor = isDark ? "#6B7280" : "#9CA3AF";
  const avatarBg = isDark ? "#3B82F6" : "#3B82F6";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: sidebarBg,
        color: textColor,
        overflow: "hidden",
        transition: "background-color 0.3s ease",
        borderRight: `1px solid ${borderColor}`,
      }}
    >
      {/* Collapse Toggle */}
      <Box
        sx={{
          px: 1,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          minHeight: 40,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <IconButton
          onClick={onCollapseToggle}
          size="small"
          sx={{
            color: itemColor,
            "&:hover": { bgcolor: hoverBg },
            width: 28,
            height: 28,
          }}
        >
          {collapsed ? (
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          ) : (
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </Box>

      {/* Nav Items */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          py: 0.5,
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
                        pt: idx === 0 ? 0.5 : 1.5,
                        pb: 0.3,
                        display: "block",
                        color: labelColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontSize: "0.58rem",
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Divider
                      sx={{
                        borderColor,
                        my: 0.5,
                        mx: 1,
                      }}
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
                      color: active ? activeIndicator : "inherit",
                      minWidth: collapsed ? "unset" : 32,
                      "& svg": { fontSize: "1.15rem" },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.82rem",
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
          p: 1,
          borderTop: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: avatarBg,
            fontSize: "0.75rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {user?.name?.[0]?.toUpperCase()}
        </Avatar>
        {!collapsed && (
          <Box sx={{ overflow: "hidden" }}>
            <Typography
              variant="caption"
              fontWeight={600}
              noWrap
              sx={{
                color: textColor,
                lineHeight: 1.2,
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              {user?.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: userRoleColor,
                textTransform: "capitalize",
                fontSize: "0.62rem",
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
        transition: "width 0.2s ease",
        overflow: "hidden",
        top: 55,
        height: "calc(100vh - 55px)",
      },
    }}
  >
    <SidebarContent collapsed={collapsed} onCollapseToggle={onCollapseToggle} />
  </Drawer>
);

export default Sidebar;
