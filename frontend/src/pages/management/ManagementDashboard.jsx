import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

import DashboardHeader from "./components/DashboardHeader";
import BottomNav from "./components/BottomNav";
import AccessDenied from "./components/AccessDenied";

import TodayPage from "./pages/TodayPage";
import MonthlyPage from "./pages/MonthlyPage";
import YearlyPage from "./pages/YearlyPage";
import AlertsPage from "./pages/AlertsPage";
import RankingPage from "./pages/RankingPage";

import {
  useValidateAccess,
  useTodayOverview,
  useAlerts,
  useRefreshManagement,
} from "../../hooks/useManagement";

const ManagementDashboard = () => {
  const { secretKey } = useParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [activePage, setActivePage] = useState("today");

  // ═══════════════════════════════════════════════════════════════
  //  ✅ SAFETY: Clear any auth tokens on management page load
  //  Management pages should NEVER use logged-in user's session
  //  This prevents accidental auth-related redirects
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Set global flag (for other components/hooks to detect)
    window.__isPublicManagementPage = true;

    return () => {
      window.__isPublicManagementPage = false;
    };
  }, []);

  // ─── VALIDATE ACCESS FIRST ───
  const {
    data: validation,
    isLoading: validating,
    isError: validationError,
    error: valError,
    refetch: retryValidation,
  } = useValidateAccess(secretKey);

  // ─── FETCH DATA (only if valid) ───
  const {
    data: todayData,
    isRefetching: todayRefetching,
    dataUpdatedAt: todayUpdatedAt,
  } = useTodayOverview(secretKey, {
    enabled: !!validation?.valid,
  });

  const { data: alertsData } = useAlerts(secretKey, {
    enabled: !!validation?.valid,
  });

  const refreshAll = useRefreshManagement();

  // ─── DYNAMIC PAGE TITLE ───
  useEffect(() => {
    if (validation?.valid) {
      document.title = `Management Dashboard · TVSM School`;
    }
    return () => {
      document.title = "TVSM School";
    };
  }, [validation?.valid]);

  // ═══════════════════════════════════════════════════════════════
  //  LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════════════════

  if (validating) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: isDark ? "#0F172A" : "#F8FAFC",
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Verifying access...
        </Typography>
      </Box>
    );
  }

  if (validationError || !validation?.valid) {
    const status = valError?.response?.status;
    const reason = status === 401 || status === 404 ? "invalid" : "error";
    return <AccessDenied reason={reason} onRetry={retryValidation} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleRefresh = () => {
    refreshAll(secretKey);
  };

  const handlePrint = () => {
    window.print();
  };

  const alertCount =
    (alertsData?.counts?.criticalClasses || 0) +
    (alertsData?.counts?.pendingClasses || 0);

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  const renderPage = () => {
    const commonProps = { secretKey };
    switch (activePage) {
      case "today":
        return <TodayPage {...commonProps} />;
      case "monthly":
        return <MonthlyPage {...commonProps} />;
      case "yearly":
        return <YearlyPage {...commonProps} />;
      case "alerts":
        return <AlertsPage {...commonProps} />;
      case "ranking":
        return <RankingPage {...commonProps} />;
      default:
        return <TodayPage {...commonProps} />;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: isDark ? "#0F172A" : "#F8FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <DashboardHeader
        label={validation.label}
        lastUpdated={todayUpdatedAt}
        isRefetching={todayRefetching}
        onRefresh={handleRefresh}
        onPrint={handlePrint}
      />

      {/* PAGE CONTENT */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          pb: { xs: 9, sm: 10 },
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
        }}
        className="management-content"
      >
        {renderPage()}
      </Box>

      {/* BOTTOM NAV */}
      <BottomNav
        activePage={activePage}
        onChange={setActivePage}
        alertCount={alertCount}
      />

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .management-content {
            padding: 0 !important;
          }
          nav, header, .MuiBottomNavigation-root, .MuiPaper-root:has(.MuiBottomNavigation-root) {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default ManagementDashboard;
