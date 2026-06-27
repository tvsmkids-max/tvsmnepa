import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme, Toolbar } from "@mui/material";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Topbar onMenuClick={() => setCollapsed((c) => !c)} />

      {/* Sidebar — ONLY on Desktop, not on Mobile */}
      {!isMobile && (
        <Sidebar
          drawerWidth={sidebarWidth}
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed((c) => !c)}
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: { md: `calc(100% - ${sidebarWidth}px)` },
          transition: theme.transitions.create(["width"]),
        }}
      >
        <Toolbar sx={{ minHeight: "70px !important" }} />
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            pb: { xs: 10, md: 3 }, // Extra padding for mobile bottom nav
            overflow: "auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile Bottom Navigation — Only on Mobile */}
      <MobileBottomNav />
    </Box>
  );
};

export default DashboardLayout;
