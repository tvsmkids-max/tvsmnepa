import React, { useState, useEffect } from "react";
import {
  Snackbar,
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Avatar,
  Slide,
  CircularProgress,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SystemUpdateAltOutlinedIcon from "@mui/icons-material/SystemUpdateAltOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import usePWA from "../../hooks/usePWA";

const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

const PWAUpdateNotification = () => {
  const { updateAvailable, applyUpdate } = usePWA();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  const [show, setShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      const timer = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [updateAvailable]);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => {
      applyUpdate();
    }, 400);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <Snackbar
      open={show}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: isMobile ? "center" : "right",
      }}
      TransitionComponent={SlideUpTransition}
      sx={{
        bottom: { xs: 72, sm: 24 }, // Above mobile bottom nav bar
        zIndex: 2000,
        maxWidth: { xs: "calc(100% - 24px)", sm: 420 },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "#FFFFFF",
          borderRadius: "14px",
          p: 2,
          boxShadow: isDark
            ? "0 12px 32px rgba(0,0,0,0.6)"
            : "0 12px 32px rgba(13,27,62,0.35)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background glow effect */}
        <Box
          sx={{
            position: "absolute",
            top: -24,
            right: -24,
            width: 90,
            height: 90,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
          }}
        />

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ position: "relative" }}
        >
          {/* Icon Badge */}
          <Avatar
            sx={{
              width: 42,
              height: 42,
              bgcolor: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              flexShrink: 0,
            }}
          >
            <SystemUpdateAltOutlinedIcon
              sx={{ color: "#FFFFFF", fontSize: 22 }}
            />
          </Avatar>

          {/* Text Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{ fontSize: "0.88rem", lineHeight: 1.2, color: "#FFFFFF" }}
            >
              Update Ready
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.72rem",
                display: "block",
                lineHeight: 1.3,
                mt: 0.2,
              }}
            >
              A new version of TVSM is available.
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button
              size="small"
              variant="contained"
              startIcon={
                updating ? (
                  <CircularProgress size={13} sx={{ color: "#0D1B3E" }} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 15 }} />
                )
              }
              onClick={handleUpdate}
              disabled={updating}
              sx={{
                bgcolor: "#FFFFFF",
                color: "#0D1B3E",
                fontWeight: 800,
                fontSize: "0.75rem",
                textTransform: "none",
                py: 0.6,
                px: 1.5,
                borderRadius: "8px",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#F1F5F9",
                  boxShadow: "none",
                },
              }}
            >
              {updating ? "Updating..." : "Update"}
            </Button>

            {!updating && (
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  p: 0.5,
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.15)",
                    color: "#FFFFFF",
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Box>
    </Snackbar>
  );
};

export default PWAUpdateNotification;
