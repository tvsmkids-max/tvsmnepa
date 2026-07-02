import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import useAuth from "../hooks/useAuth";

const RoleRoute = ({ children, roles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // ─── FIX #1: Wait for auth to finish loading ───
  // Prevents redirect flash when app is initializing
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  // ─── FIX #2: Not authenticated → login (with return URL) ───
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ─── FIX #3: Authenticated but wrong role → unauthorized ───
  if (!roles.includes(user.role)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location, requiredRoles: roles }}
        replace
      />
    );
  }

  return children;
};

export default RoleRoute;
