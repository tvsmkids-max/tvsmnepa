import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper sx={{ p: 6, maxWidth: 400, textAlign: "center", borderRadius: 3 }}>
        <LockIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          You do not have permission to view this page.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;
