import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import useAuth from "../hooks/useAuth";

const RoleRoute = ({ children, roles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Branded loader replacing raw CircularProgress during initialization checks
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Box
          component="img"
          src="/loading.png"
          alt="Loading"
          sx={{
            width: 72,
            height: 72,
            animation: "spin 1.5s linear infinite",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </Box>
    );
  }

  // Not authenticated -> redirect to login (saving requested path)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role -> redirect to access restriction screen
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
