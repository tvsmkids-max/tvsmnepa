import React from "react";
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  alpha,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

const NAV_ITEMS = [
  {
    value: "today",
    label: "Today",
    icon: <DashboardOutlinedIcon />,
  },
  {
    value: "monthly",
    label: "Monthly",
    icon: <TrendingUpOutlinedIcon />,
  },
  {
    value: "yearly",
    label: "Yearly",
    icon: <CalendarMonthOutlinedIcon />,
  },
  {
    value: "alerts",
    label: "Alerts",
    icon: <WarningAmberOutlinedIcon />,
  },
  {
    value: "ranking",
    label: "Ranking",
    icon: <EmojiEventsOutlinedIcon />,
  },
];

const BottomNav = ({ activePage, onChange, alertCount = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: isDark ? "#0F172A" : "#FFFFFF",
        boxShadow: isDark
          ? "0 -4px 20px rgba(0,0,0,0.4)"
          : "0 -4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <BottomNavigation
        value={activePage}
        onChange={(_, newValue) => onChange(newValue)}
        showLabels
        sx={{
          height: { xs: 64, sm: 68 },
          bgcolor: "transparent",
          "& .MuiBottomNavigationAction-root": {
            minWidth: "auto",
            padding: "6px 4px 8px",
            fontWeight: 600,
            fontSize: "0.72rem",
            color: "text.secondary",
            transition: "all 0.2s",
            "&.Mui-selected": {
              color: isDark ? "#93C5FD" : "#1E4D98",
              fontWeight: 800,
              "& .MuiBottomNavigationAction-label": {
                fontWeight: 800,
                fontSize: "0.7rem",
              },
              "& .MuiSvgIcon-root": {
                transform: "scale(1.1)",
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.68rem",
              marginTop: "2px",
              transition: "all 0.2s",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.35rem",
              transition: "transform 0.2s",
            },
          },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.value}
            value={item.value}
            label={item.label}
            icon={
              item.value === "alerts" && alertCount > 0 ? (
                <BadgeIcon count={alertCount}>{item.icon}</BadgeIcon>
              ) : (
                item.icon
              )
            }
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

// ─── Small Badge helper for Alerts icon ───
const BadgeIcon = ({ children, count }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {children}
      <span
        style={{
          position: "absolute",
          top: -4,
          right: -8,
          minWidth: 16,
          height: 16,
          padding: "0 4px",
          borderRadius: 8,
          background: isDark ? "#DC2626" : "#DC2626",
          color: "#fff",
          fontSize: "0.6rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {count > 99 ? "99+" : count}
      </span>
    </div>
  );
};

export default BottomNav;
