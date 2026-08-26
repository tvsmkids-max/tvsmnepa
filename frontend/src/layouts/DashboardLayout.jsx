import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Toolbar, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/layout/Topbar";
import Sidebar from "../components/layout/Sidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import AppSplashScreen from "../components/common/AppSplashScreen";
import useAuth from "../hooks/useAuth";

const DRAWER_WIDTH = 220;
const COLLAPSED_DRAWER_WIDTH = 60;

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);

  const { user, showSplash, dismissSplash } = useAuth();

  const handleToggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  const currentDrawerWidth = collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Global Splash Screen */}
      {showSplash && user && (
        <AppSplashScreen user={user} onComplete={dismissSplash} />
      )}

      {/* Top Header Bar */}
      <Topbar onMenuClick={handleToggleSidebar} />

      {/* Navigation Sidebar */}
      <Sidebar drawerWidth={currentDrawerWidth} collapsed={collapsed} />

      {/* Main Content Area — Double-Margin Void Fixed */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: 0, // Allows Flexbox flexGrow to distribute remaining width accurately
          px: { xs: 2, sm: 3, md: 3.5 }, // Clean 28px inner padding
          py: { xs: 2, sm: 2.5 },
          pb: { xs: 9, md: 4 },
        }}
      >
        <Toolbar sx={{ minHeight: "60px !important" }} />
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </Box>
  );
};

export default DashboardLayout;
