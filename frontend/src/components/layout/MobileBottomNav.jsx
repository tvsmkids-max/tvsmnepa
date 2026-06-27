import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import EventNoteIcon from "@mui/icons-material/EventNote";
import HistoryIcon from "@mui/icons-material/History";
import PeopleIcon from "@mui/icons-material/People";
import useAuth from "../../hooks/useAuth";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/teacher/dashboard")
      return "dashboard";
    if (path.startsWith("/attendance/mark")) return "mark";
    if (path.startsWith("/attendance/history")) return "history";
    if (path.startsWith("/students")) return "students";
    if (path === "/profile" || path === "/settings") return "profile";
    return false;
  };

  const handleChange = (event, newValue) => {
    const homeRoute = isAdmin ? "/dashboard" : "/teacher/dashboard";
    switch (newValue) {
      case "dashboard":
        navigate(homeRoute);
        break;
      case "mark":
        navigate("/attendance/mark");
        break;
      case "history":
        navigate("/attendance/history");
        break;
      case "students":
        navigate("/students");
        break;
      case "profile":
        navigate(isAdmin ? "/settings" : "/teacher/dashboard");
        break;
      default:
        break;
    }
  };

  return (
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
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
      }}
      elevation={0}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels
        sx={{
          height: 64,
          bgcolor: "background.paper",
          "& .MuiBottomNavigationAction-root": {
            minWidth: "auto",
            padding: "6px 4px",
            color: "text.secondary",
            "&.Mui-selected": {
              color: "primary.main",
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.68rem",
            fontWeight: 700,
            marginTop: "2px",
            "&.Mui-selected": {
              fontSize: "0.7rem",
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="dashboard"
          icon={<HomeIcon />}
        />
        <BottomNavigationAction
          label="Mark"
          value="mark"
          icon={
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor:
                  getCurrentValue() === "mark" ? "primary.main" : "primary.50",
                color: getCurrentValue() === "mark" ? "white" : "primary.main",
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white",
                },
              }}
            >
              <EventNoteIcon sx={{ fontSize: 20 }} />
            </Box>
          }
        />
        <BottomNavigationAction
          label="History"
          value="history"
          icon={<HistoryIcon />}
        />
        <BottomNavigationAction
          label="Students"
          value="students"
          icon={<PeopleIcon />}
        />
        <BottomNavigationAction
          label="Profile"
          value="profile"
          icon={
            <Avatar
              sx={{
                width: 26,
                height: 26,
                fontSize: "0.7rem",
                fontWeight: 800,
                bgcolor: "primary.main",
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
          }
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
