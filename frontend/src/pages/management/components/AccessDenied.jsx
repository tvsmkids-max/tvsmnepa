import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";

const AccessDenied = ({ reason = "invalid", onRetry }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const messages = {
    invalid: {
      title: "Access Denied",
      description:
        "This access link is invalid or has been revoked. Please contact your school administrator.",
    },
    expired: {
      title: "Link Expired",
      description:
        "This access link has expired. Please contact your school administrator to get a new link.",
    },
    error: {
      title: "Connection Error",
      description:
        "Unable to verify access. Please check your internet connection and try again.",
    },
  };

  const message = messages[reason] || messages.invalid;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: isDark ? "#0F172A" : "#F8FAFC",
        p: 3,
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: isDark ? alpha("#DC2626", 0.15) : alpha("#DC2626", 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2.5,
          }}
        >
          <LockOutlinedIcon
            sx={{
              fontSize: 44,
              color: isDark ? "#FCA5A5" : "#DC2626",
            }}
          />
        </Box>

        <Typography variant="h5" fontWeight={800} gutterBottom>
          {message.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3.5, lineHeight: 1.6 }}
        >
          {message.description}
        </Typography>

        <Stack spacing={1.25}>
          {reason === "error" && onRetry && (
            <Button
              variant="contained"
              fullWidth
              onClick={onRetry}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 800,
                textTransform: "none",
                py: 1.1,
              }}
            >
              Try Again
            </Button>
          )}

          <Button
            variant="outlined"
            fullWidth
            startIcon={<HomeOutlinedIcon />}
            onClick={() => (window.location.href = "/login")}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              py: 1.1,
            }}
          >
            Go to Login Page
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            display: "block",
            mt: 3,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            fontSize: "0.7rem",
          }}
        >
          If you believe this is an error, contact your school administrator for
          a valid access link.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AccessDenied;
