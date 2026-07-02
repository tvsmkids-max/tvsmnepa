import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme, Toolbar } from "@mui/material";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import IdleTimeoutProvider from "../components/common/IdleTimeoutProvider";

const DRAWER_WIDTH = 220;
const COLLAPSED_WIDTH = 60;

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  const toggleSidebar = () => setCollapsed((c) => !c);

  return (
    <IdleTimeoutProvider>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
          overflowX: "hidden",
          maxWidth: "100vw",
        }}
      >
        {/* Topbar — controls sidebar collapse via hamburger */}
        <Topbar onMenuClick={toggleSidebar} />

        {/* Sidebar — desktop only (no internal collapse button) */}
        {!isMobile && (
          <Sidebar drawerWidth={sidebarWidth} collapsed={collapsed} />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            width: {
              xs: "100vw",
              md: `calc(100vw - ${sidebarWidth}px)`,
            },
            maxWidth: {
              xs: "100vw",
              md: `calc(100vw - ${sidebarWidth}px)`,
            },
            overflowX: "hidden",
            bgcolor: "background.default",
            transition: theme.transitions.create(["width"]),
          }}
        >
          {/* Spacer matching topbar height */}
          <Toolbar
            sx={{
              minHeight: { xs: "50px !important", md: "55px !important" },
            }}
          />

          <Box
            sx={{
              flex: 1,
              p: { xs: 1.5, sm: 2, md: 2.5 },
              pb: { xs: 10, md: 2.5 },
              overflowX: "hidden",
              overflowY: "auto",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <Outlet />
          </Box>
        </Box>

        <MobileBottomNav />
      </Box>
    </IdleTimeoutProvider>
  );
};

export default DashboardLayout;
