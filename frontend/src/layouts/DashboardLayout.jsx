import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme, Toolbar } from "@mui/material";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import IdleTimeoutProvider from "../components/common/IdleTimeoutProvider";

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <IdleTimeoutProvider>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
          // ─── PREVENT HORIZONTAL OVERFLOW ───
          overflowX: "hidden",
          maxWidth: "100vw",
        }}
      >
        <Topbar onMenuClick={() => setCollapsed((c) => !c)} />

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
            // ─── KEY FIX: Constrain width ───
            width: {
              xs: "100vw",
              md: `calc(100vw - ${sidebarWidth}px)`,
            },
            maxWidth: {
              xs: "100vw",
              md: `calc(100vw - ${sidebarWidth}px)`,
            },
            overflowX: "hidden",
            transition: theme.transitions.create(["width"]),
          }}
        >
          <Toolbar
            sx={{
              minHeight: { xs: "56px !important", md: "64px !important" },
            }}
          />

          <Box
            sx={{
              flex: 1,
              p: { xs: 2, sm: 3 },
              pb: { xs: 10, md: 3 },
              // ─── KEY FIX: Allow only y scroll, x hidden ───
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
