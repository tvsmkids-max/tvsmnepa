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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import NewReleasesOutlinedIcon from "@mui/icons-material/NewReleasesOutlined";
import usePWA from "../../hooks/usePWA";

const SlideTransition = (props) => <Slide {...props} direction="down" />;

const PWAUpdateNotification = () => {
  const { updateAvailable, applyUpdate } = usePWA();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [show, setShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      // Small delay for smooth UX
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [updateAvailable]);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => {
      applyUpdate();
    }, 500);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <Snackbar
      open={show}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      TransitionComponent={SlideTransition}
      sx={{
        top: { xs: 70, sm: 80 }, // Below topbar
        maxWidth: { xs: "calc(100% - 24px)", sm: 480 },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
          color: "white",
          borderRadius: 3,
          p: 1.8,
          boxShadow: "0 12px 32px rgba(22,163,74,0.4)",
          border: "1px solid rgba(255,255,255,0.15)",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blob */}
        <Box
          sx={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          }}
        />

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ position: "relative" }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}
          >
            <NewReleasesOutlinedIcon sx={{ color: "white", fontSize: 22 }} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{ fontSize: "0.9rem", lineHeight: 1.2 }}
            >
              {isMobile ? "Update available" : "New version available!"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.72rem",
                display: "block",
                lineHeight: 1.3,
              }}
            >
              Reload to get the latest features
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="small"
              variant="contained"
              startIcon={
                updating ? (
                  <CircularProgress size={14} sx={{ color: "white" }} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={handleUpdate}
              disabled={updating}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 800,
                fontSize: "0.78rem",
                textTransform: "none",
                px: 1.5,
                border: "1px solid rgba(255,255,255,0.3)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.3)",
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
                  color: "rgba(255,255,255,0.7)",
                  p: 0.4,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "white",
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Box>
    </Snackbar>
  );
};

export default PWAUpdateNotification;
