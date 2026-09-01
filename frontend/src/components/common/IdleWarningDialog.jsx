import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const IdleWarningDialog = ({
  open,
  countdownEnd,
  totalWarningMs = 60000,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  const [remainingMs, setRemainingMs] = useState(totalWarningMs);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!open || !countdownEnd) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    const calc = () => {
      const diff = Math.max(0, countdownEnd - Date.now());
      setRemainingMs(diff);
      if (diff <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    calc();
    intervalRef.current = setInterval(calc, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, countdownEnd]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = Math.max(
    0,
    Math.min(100, (remainingMs / Math.max(totalWarningMs, 1)) * 100),
  );

  const color = seconds > 10 ? "warning" : "error";

  return (
    <Dialog
      open={open}
      onClose={undefined}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      keepMounted={false}
      // Above topbar / bottom nav / splash
      sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-description"
    >
      <LinearProgress
        variant="determinate"
        value={progress}
        color={color}
        sx={{ height: 6 }}
      />

      <DialogTitle
        id="idle-warning-title"
        component="div"
        sx={{ pt: 3, pb: 1, textAlign: "center" }}
      >
        <Stack alignItems="center" spacing={1.5}>
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={progress}
              color={color}
              size={88}
              thickness={4}
              sx={{
                "& .MuiCircularProgress-circle": {
                  strokeLinecap: "round",
                  transition: "stroke-dashoffset 0.3s linear",
                },
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h4"
                fontWeight={900}
                color={`${color}.dark`}
                sx={{ lineHeight: 1 }}
              >
                {seconds}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.65rem", mt: 0.3 }}
              >
                seconds
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <TimerOutlinedIcon sx={{ color: `${color}.main` }} />
            <Typography variant="h6" fontWeight={800} component="div">
              Session Timing Out
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pb: 1, textAlign: "center" }}>
        <Typography
          id="idle-warning-description"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1 }}
        >
          You&apos;ve been inactive for a while. For your security, you will be{" "}
          <strong>automatically logged out</strong> in {seconds} second
          {seconds !== 1 ? "s" : ""}.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Click &quot;Stay Logged In&quot; to continue your session.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onLogoutNow}
          color="inherit"
          startIcon={<LogoutIcon />}
          sx={{ fontWeight: 700 }}
        >
          Logout Now
        </Button>
        <Button
          onClick={onStayLoggedIn}
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<CheckCircleOutlineIcon />}
          autoFocus
          sx={{
            fontWeight: 800,
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            py: 1.2,
          }}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IdleWarningDialog;
