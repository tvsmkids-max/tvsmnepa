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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import usePWA from "../../hooks/usePWA";
import useAuth from "../../hooks/useAuth";
import { storage } from "../../utils/storageUtils";

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SlideTransition = (props) => <Slide {...props} direction="up" />;

const PWAInstallPrompt = () => {
  const { canInstall, promptInstall, isStandalone } = usePWA();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if:
    // - Not authenticated
    // - Already installed (standalone)
    // - Can't install (no prompt available)
    // - Recently dismissed (within 7 days)
    if (!isAuthenticated || !canInstall || isStandalone) {
      setShow(false);
      return;
    }

    const dismissedAt = storage.getPwaInstallDismissed();
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
      setShow(false);
      return;
    }

    // Show after a short delay (better UX)
    const timer = setTimeout(() => {
      setShow(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, canInstall, isStandalone]);

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result.outcome === "accepted") {
      setShow(false);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShow(false);
    storage.setPwaInstallDismissed();
  };

  if (!show) return null;

  return (
    <Snackbar
      open={show}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: isMobile ? "center" : "right",
      }}
      TransitionComponent={SlideTransition}
      sx={{
        bottom: { xs: 80, sm: 24 }, // Above mobile bottom nav
        maxWidth: { xs: "calc(100% - 24px)", sm: 400 },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "white",
          borderRadius: 3,
          p: 2,
          boxShadow: "0 12px 32px rgba(13,27,62,0.4)",
          border: "1px solid rgba(255,255,255,0.1)",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blob */}
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,166,35,0.2) 0%, transparent 70%)",
          }}
        />

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ position: "relative" }}
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: "white",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <SchoolOutlinedIcon sx={{ color: "#0D1B3E", fontSize: 24 }} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              fontWeight={800}
              sx={{ fontSize: "0.95rem", lineHeight: 1.2, mb: 0.5 }}
            >
              Install TVSM School App
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.78rem",
                display: "block",
                mb: 1.5,
                lineHeight: 1.4,
              }}
            >
              Add to home screen for quick access and offline support
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<GetAppIcon sx={{ fontSize: 16 }} />}
                onClick={handleInstall}
                sx={{
                  bgcolor: "#F5A623",
                  color: "#0D1B3E",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  textTransform: "none",
                  px: 1.8,
                  "&:hover": {
                    bgcolor: "#E8920F",
                  },
                }}
              >
                Install
              </Button>
              <Button
                size="small"
                onClick={handleDismiss}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                Not now
              </Button>
            </Stack>
          </Box>

          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              color: "rgba(255,255,255,0.6)",
              p: 0.4,
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.1)",
                color: "white",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>
    </Snackbar>
  );
};

export default PWAInstallPrompt;
