import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

import DashboardHeader from "./components/DashboardHeader";
import BottomNav from "./components/BottomNav";
import AccessDenied from "./components/AccessDenied";

import TodayPage from "./pages/TodayPage";
import MonthlyPage from "./pages/MonthlyPage";

import {
  useValidateAccess,
  useRangeOverview,
  useRefreshManagement,
} from "../../hooks/useManagement";

const ManagementDashboard = () => {
  const { secretKey } = useParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [activePage, setActivePage] = useState("today");

  useEffect(() => {
    window.__isPublicManagementPage = true;
    return () => {
      window.__isPublicManagementPage = false;
    };
  }, []);

  const {
    data: validation,
    isLoading: validating,
    isError: validationError,
    error: valError,
    refetch: retryValidation,
  } = useValidateAccess(secretKey);

  // Get today's default range for live sync status
  const todayStr = new Date().toISOString().split("T")[0];
  const { isRefetching: liveSyncing } = useRangeOverview(
    secretKey,
    todayStr,
    todayStr,
    "ALL",
    { enabled: !!validation?.valid },
  );

  const refreshAll = useRefreshManagement();

  useEffect(() => {
    if (validation?.valid) {
      document.title = `Management Dashboard · TVSM School`;
    }
    return () => {
      document.title = "TVSM School";
    };
  }, [validation?.valid]);

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

  const handleRefresh = () => refreshAll(secretKey);
  const handlePrint = () => window.print();

  const renderPage = () => {
    switch (activePage) {
      case "today":
        return <TodayPage secretKey={secretKey} />;
      case "monthly":
        return <MonthlyPage secretKey={secretKey} />;
      default:
        return <TodayPage secretKey={secretKey} />;
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
      <DashboardHeader
        label={validation.label}
        isRefetching={liveSyncing}
        onRefresh={handleRefresh}
        onPrint={handlePrint}
      />

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          overflowX: "hidden",
          pb: { xs: 9, sm: 10 },
          px: { xs: 1.5, sm: 2.5, md: 4 },
          py: { xs: 2, md: 3 },
          width: "100%",
          maxWidth: "1400px",
          mx: "auto",
          boxSizing: "border-box",
        }}
        className="management-content"
      >
        {renderPage()}

        <Box
          sx={{
            mt: 4,
            pt: 2.5,
            pb: 1,
            borderTop: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "text.secondary",
              letterSpacing: "0.03em",
            }}
          >
            © {new Date().getFullYear()} · Developed by{" "}
            <Box
              component="span"
              sx={{ fontWeight: 800, color: isDark ? "#93C5FD" : "#1E4D98" }}
            >
              Abhishek
            </Box>
          </Typography>
        </Box>
      </Box>

      <BottomNav activePage={activePage} onChange={setActivePage} />

      <style>{`
        @media print {
          .management-content { padding: 0 !important; }
          nav, header, .MuiBottomNavigation-root, .MuiPaper-root:has(.MuiBottomNavigation-root) {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default ManagementDashboard;
