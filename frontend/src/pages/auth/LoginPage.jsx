import React, { useState, useEffect, useRef } from "react";
import "@fontsource/great-vibes/400.css";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ClassIcon from "@mui/icons-material/Class";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import authApi from "../../api/authApi";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME ||
  "Thakur Virendra Singh Memorial School";
const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { login, isAuthenticated, isLoading, error, clearError, user } =
    useAuth();

  const [loginOptions, setLoginOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState(""); // Used for Admin
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── PIN State (For Class Login) ───
  const [pinDigits, setPinDigits] = useState(["", "", "", "", ""]);
  const pinRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await authApi.getLoginOptions();
        if (!cancelled) {
          const options = res.data?.data || [];
          setLoginOptions(options);
          if (options.length > 0) {
            setSelectedUserId(options[0]._id);
          }
          setLoadingOptions(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingOptions(false);
          enqueueSnackbar("Failed to load login accounts", {
            variant: "error",
          });
        }
      }
    };
    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (!reason) return;

    const messages = {
      idle: { text: "⏰ Logged out due to inactivity.", variant: "warning" },
      "session-expired": {
        text: "🔒 Session expired. Please log in again.",
        variant: "warning",
      },
      "logged-out": { text: "✅ Logged out successfully.", variant: "info" },
      unauthorized: {
        text: "🚫 Please log in to access that page.",
        variant: "info",
      },
    };

    if (messages[reason]) {
      enqueueSnackbar(messages[reason].text, {
        variant: messages[reason].variant,
        autoHideDuration: 5000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, enqueueSnackbar]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      const defaultRoute =
        user.role === "admin" ? "/dashboard" : "/teacher/dashboard";

      let targetRoute = defaultRoute;
      if (
        from &&
        from !== "/login" &&
        from !== "/unauthorized" &&
        !(user.role === "class" && from === "/dashboard") &&
        !(user.role === "admin" && from === "/teacher/dashboard")
      ) {
        targetRoute = from;
      }

      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  useEffect(() => () => clearError(), [clearError]);

  // Reset fields when switching accounts
  useEffect(() => {
    setPassword("");
    setPinDigits(["", "", "", "", ""]);
  }, [selectedUserId]);

  const selectedUserObj = loginOptions.find((o) => o._id === selectedUserId);
  const isAdminLogin = selectedUserObj?.role === "admin";
  const isClassLogin = selectedUserObj?.role === "class";

  const classPin = pinDigits.join("");

  // ─── PIN Handlers ───
  const handlePinChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    // Auto-advance
    if (digit && index < 4) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 5);
    if (!pasted) return;

    const next = ["", "", "", "", ""];
    pasted.split("").forEach((ch, idx) => {
      next[idx] = ch;
    });
    setPinDigits(next);

    // Focus the next empty box or the last box
    const focusIndex = Math.min(pasted.length, 4);
    pinRefs.current[focusIndex]?.focus();
  };

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      enqueueSnackbar("Please select an account to log in", {
        variant: "warning",
      });
      return;
    }

    if (isAdminLogin) {
      if (!password) {
        enqueueSnackbar("Please enter password", { variant: "warning" });
        return;
      }
      setSubmitting(true);
      clearError();
      await login({ userId: selectedUserId, password });
      setSubmitting(false);
      return;
    }

    if (isClassLogin) {
      if (!/^\d{5}$/.test(classPin)) {
        enqueueSnackbar("Enter all 5 digits of the PIN", {
          variant: "warning",
        });
        return;
      }
      setSubmitting(true);
      clearError();
      await login({ userId: selectedUserId, password: classPin }); // PIN is sent in password field
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  const inputBg = "#FFFFFF";

  const labelSx = {
    color: "#475569",
    mb: 0.75,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "0.68rem",
    fontWeight: 800,
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        p: 0,
        background:
          "radial-gradient(ellipse at 18% 15%, rgba(147,197,253,.55), transparent 32%), radial-gradient(ellipse at 88% 85%, rgba(96,165,250,.45), transparent 34%), linear-gradient(135deg, #0B1B43 0%, #1749A2 48%, #8DBBFF 100%)",
        color: "#101B38",
        overflow: "auto",
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: { xs: "auto", sm: "100vh" },
          px: { xs: 2.5, sm: 5, lg: 8 },
          py: { xs: 1.5, sm: 4, lg: 6 },
          overflow: "hidden",
          color: "#FFFFFF",
          background:
            "radial-gradient(ellipse at 75% 18%, rgba(37,99,235,.4), transparent 32%), radial-gradient(ellipse at 12% 90%, rgba(29,78,216,.32), transparent 30%), #07142F",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.18,
            backgroundImage:
              "radial-gradient(rgba(191,219,254,.7) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          },
          "@media (max-width:599px)": {
            minHeight: 0,
            py: 1.5,
            gap: 0.75,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1.25, sm: 1.75 }}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Avatar
            src={SCHOOL_LOGO}
            alt={`${SCHOOL_NAME} logo`}
            variant="rounded"
            sx={{
              width: { xs: 42, sm: 58 },
              height: { xs: 42, sm: 58 },
              bgcolor: "#FFFFFF",
              border: "2px solid rgba(255,255,255,.75)",
              boxShadow: "0 8px 24px rgba(0,0,0,.25)",
              "& img": { objectFit: "contain", p: 0.5 },
            }}
          />
          <Box>
       
            <Typography
              sx={{
                mt: 0.25,
                color: "rgba(226,232,240,.78)",
                fontSize: { xs: "0.7rem", sm: "0.78rem" },
                display: { xs: "none", sm: "block" },
              }}
            >
              Attendance Management System
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            maxWidth: 650,
            py: { xs: 0, sm: 5 },
          }}
        >
          <Typography
            sx={{
              display: { xs: "block", sm: "none" },
              color: "#BFDBFE",
              fontSize: "0.77rem",
              fontWeight: 750,
              letterSpacing: "0.02em",
            }}
          >
            Attendance, made simpler.
          </Typography>
          <Typography
            sx={{
              display: { xs: "none", sm: "block" },
              color: "#93C5FD",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              mb: 2,
            }}
          >
            School attendance, made simpler
          </Typography>
          <Typography
            component="h1"
            sx={{
              display: { xs: "none", sm: "block" },
              maxWidth: 600,
              fontSize: { xs: "2rem", sm: "2.6rem", lg: "4.2rem" },
              lineHeight: { xs: 1.12, lg: 1.03 },
              letterSpacing: "-0.055em",
              fontWeight: 850,
            }}
          >
            Every school day,
            <Box
              component="span"
              sx={{
                display: { xs: "inline", sm: "block" },
                color: "#79A9FF",
              }}
            >
              {" "}in clear focus.
            </Box>
          </Typography>
          <Box
            sx={{
              display: { xs: "none", sm: "block" },
              width: "72%",
              maxWidth: 360,
              height: 2,
              mt: 3,
              mb: 2,
              background:
                "linear-gradient(90deg, #60A5FA 0%, rgba(96,165,250,.08) 100%)",
            }}
          />
          <Typography
            sx={{
              display: { xs: "none", sm: "block" },
              maxWidth: 450,
              color: "rgba(226,232,240,.8)",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              lineHeight: 1.75,
            }}
          >
            Keep attendance, student records, and school reports together in
            one clear workspace.
          </Typography>

          <Box
            sx={{
              mt: { xs: 3, sm: 5 },
              display: { xs: "none", sm: "grid" },
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 1.25,
              maxWidth: 590,
            }}
          >
            {[
              {
                icon: <ClassIcon />,
                title: "Attendance",
                detail: "Daily class records",
              },
              {
                icon: <AdminPanelSettingsIcon />,
                title: "School records",
                detail: "Students and teachers",
              },
              {
                icon: <ArrowForwardIcon />,
                title: "Reports",
                detail: "A clearer overview",
              },
            ].map((feature) => (
              <Box
                key={feature.title}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  minWidth: 0,
                  p: { xs: 1.25, sm: 1.5 },
                  borderRadius: 2.5,
                  border: "1px solid rgba(191,219,254,.18)",
                  bgcolor: "rgba(255,255,255,.055)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    borderRadius: 2,
                    color: "#BFDBFE",
                    bgcolor: "rgba(59,130,246,.2)",
                    "& svg": { fontSize: 19 },
                  }}
                >
                  {feature.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 750 }}>
                    {feature.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(203,213,225,.72)",
                      fontSize: "0.65rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {feature.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography
          sx={{
            display: { xs: "none", sm: "block" },
            position: "relative",
            zIndex: 1,
            color: "rgba(203,213,225,.65)",
            fontSize: "0.7rem",
            borderTop: "1px solid rgba(148,163,184,.18)",
            pt: 2,
          }}
        >
          A focused workspace for {SCHOOL_NAME}
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          maxWidth: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, sm: 0 },
          py: { xs: 2, sm: 4 },
          zIndex: 1,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 470 }}>
        <Box
          sx={{
            bgcolor: "rgba(255,255,255,.96)",
            border: "1px solid rgba(255,255,255,.95)",
            borderRadius: { xs: 3, sm: 4 },
            boxShadow:
              "0 28px 70px rgba(30,64,175,.12), 0 4px 12px rgba(15,23,42,.04)",
            p: { xs: 2.5, sm: 4.5 },
            textAlign: "left",
          }}
        >
          <Stack alignItems="center" sx={{ mb: 2.5 }}>
            <Avatar
              src={SCHOOL_LOGO}
              alt={`${SCHOOL_NAME} logo`}
              sx={{
                width: 62,
                height: 62,
                mb: 0.75,
                bgcolor: "#FFFFFF",
                boxShadow: "0 6px 18px rgba(30,64,175,.14)",
                "& img": { objectFit: "contain", p: 0.5 },
              }}
            />
            <Typography
              component="p"
              sx={{
                color: "#173B82",
                fontFamily: '"Great Vibes", "Segoe Script", cursive',
                fontSize: { xs: "1.5rem", sm: "1.9rem" },
                lineHeight: 1.25,
                textAlign: "center",
              }}
            >
              {SCHOOL_NAME}
            </Typography>
          </Stack>
          <Typography
            sx={{
              color: "#2563EB",
              fontSize: "0.68rem",
              fontWeight: 850,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              mb: 0.8,
              textAlign: "center",
            }}
          >
            TVSM School
          </Typography>
          <Typography
            component="h2"
            sx={{
              color: "#101B38",
              fontWeight: 850,
              fontSize: { xs: "1.8rem", sm: "2.1rem" },
              lineHeight: 1.15,
              letterSpacing: "-0.045em",
              mb: 0.8,
              textAlign: "center",
            }}
          >
            Welcome back
          </Typography>
          {error && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mb: 2.5, borderRadius: 2, textAlign: "left" }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ textAlign: "left" }}
          >
            <Typography variant="caption" fontWeight={700} sx={labelSx}>
              Select account
            </Typography>
            <FormControl
              fullWidth
              size="medium"
              sx={{ mb: 1.75 }}
              disabled={loadingOptions}
            >
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                displayEmpty
                sx={{
                  bgcolor: inputBg,
                  borderRadius: 2.5,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#D5DFEF",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#93B4EA",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2563EB",
                    borderWidth: 1.5,
                  },
                  "& .MuiSelect-select": {
                    py: 1.6,
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  },
                }}
              >
                {loadingOptions ? (
                  <MenuItem disabled value="">
                    Loading accounts...
                  </MenuItem>
                ) : (
                  loginOptions.map((opt) => (
                    <MenuItem
                      key={opt._id}
                      value={opt._id}
                      sx={{
                        py: 1.2,
                        fontWeight: opt.role === "admin" ? 800 : 700,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        {opt.role === "admin" ? (
                          <AdminPanelSettingsIcon
                            color="primary"
                            fontSize="small"
                          />
                        ) : (
                          <ClassIcon color="action" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          fontWeight={opt.role === "admin" ? 800 : 700}
                        >
                          {opt.displayName}
                        </Typography>
                      </Stack>
                      {opt.role === "admin" && (
                        <Chip
                          label="Admin"
                          size="small"
                          color="primary"
                          sx={{
                            height: 20,
                            fontSize: "0.62rem",
                            fontWeight: 800,
                          }}
                        />
                      )}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* ─── CONDITIONAL CREDENTIAL FIELD ─── */}
            {isAdminLogin ? (
              <>
                <Typography variant="caption" fontWeight={700} sx={labelSx}>
                  Password
                </Typography>
                <TextField
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    mb: { xs: 1.75, sm: 2.5 },
                    "& .MuiOutlinedInput-root": {
                      bgcolor: inputBg,
                      borderRadius: 2.5,
                      "& fieldset": { borderColor: "#D5DFEF" },
                      "&:hover fieldset": { borderColor: "#93B4EA" },
                      "&.Mui-focused fieldset": {
                        borderColor: "#2563EB",
                        borderWidth: 1.5,
                      },
                    },
                    "& .MuiInputBase-input": { py: 1.7, fontSize: "0.9rem" },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: "#7183A0", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                          size="small"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          sx={{ color: "#64748B" }}
                        >
                          {showPassword ? (
                            <VisibilityOffOutlinedIcon fontSize="small" />
                          ) : (
                            <VisibilityOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            ) : (
              <>
                <Typography variant="caption" fontWeight={700} sx={labelSx}>
                  5-Digit PIN
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent="space-between"
                  sx={{ mb: 2.5 }}
                >
                  {pinDigits.map((digit, i) => (
                    <TextField
                      key={i}
                      inputRef={(el) => (pinRefs.current[i] = el)}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      onPaste={i === 0 ? handlePinPaste : undefined}
                      type={showPassword ? "text" : "password"}
                      inputProps={{
                        inputMode: "numeric", // ✅ Triggers number pad on mobile
                        pattern: "[0-9]*",
                        maxLength: 1,
                        autoComplete: "one-time-code",
                        style: {
                          textAlign: "center",
                          fontSize: "1.3rem",
                          fontWeight: 800,
                          padding: "12px 0",
                        },
                      }}
                      sx={{
                        width: { xs: 48, sm: 58 },
                        "& .MuiOutlinedInput-root": {
                          bgcolor: inputBg,
                          borderRadius: 2,
                          "& fieldset": { borderColor: "#D5DFEF" },
                          "&.Mui-focused fieldset": { borderColor: "#2563EB" },
                        },
                      }}
                    />
                  ))}
                </Stack>
                {/* Optional: Add eye button below PIN for class if needed */}
                <Box textAlign="right" sx={{ mt: -2, mb: 2 }}>
                  <Button
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{
                      color: "#52647F",
                      textTransform: "none",
                      fontSize: "0.7rem",
                    }}
                    endIcon={
                      showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )
                    }
                  >
                    {showPassword ? "Hide PIN" : "Show PIN"}
                  </Button>
                </Box>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={
                submitting ||
                loadingOptions ||
                (isClassLogin && classPin.length !== 5)
              }
              endIcon={!submitting && <ArrowForwardIcon />}
              sx={{
                py: 1.55,
                fontSize: "0.95rem",
                fontWeight: 800,
                borderRadius: 2.5,
                background:
                  "linear-gradient(110deg, #1D4ED8 0%, #2563EB 58%, #3478E8 100%)",
                boxShadow: "0 12px 24px rgba(37,99,235,.23)",
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  background:
                    "linear-gradient(110deg, #1E40AF 0%, #1D4ED8 100%)",
                  boxShadow: "0 15px 28px rgba(37,99,235,.3)",
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              {submitting ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : isAdminLogin ? (
                "Sign in"
              ) : (
                "Enter Class"
              )}
            </Button>
          </Box>
          <Box
            sx={{
              mt: 2.25,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              borderRadius: 2.5,
              bgcolor: "#EFF5FF",
              color: "#51627E",
            }}
          >
            <LockOutlinedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
            <Typography sx={{ fontSize: "0.72rem", lineHeight: 1.5 }}>
              Contact the school administrator for account details.
            </Typography>
          </Box>
        </Box>

        <Stack
          alignItems="center"
          direction="row"
          spacing={1.5}
          sx={{
            display: "none",
            mt: { xs: 1.25, sm: 1.75 },
            px: { xs: 1.5, sm: 2 },
            py: { xs: 1.1, sm: 1.5 },
            bgcolor: "rgba(255,255,255,.74)",
            border: "1px solid rgba(255,255,255,.9)",
            borderRadius: 3,
            boxShadow: "0 10px 25px rgba(30,64,175,.07)",
          }}
        >
          <Avatar
            sx={{
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              bgcolor: "#1D4ED8",
              fontSize: "0.85rem",
              fontWeight: 800,
            }}
          >
            AW
          </Avatar>
          <Box>
          <Typography
            sx={{
              display: "none",
              color: "#71809A",
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Designed and built by
          </Typography>
            <Typography
              sx={{ color: "#1E2B47", fontSize: "0.85rem", fontWeight: 800 }}
            >
              Abhishek Wani
            </Typography>
            <Typography sx={{ color: "#2563EB", fontSize: "0.68rem" }}>
              TVSM School Attendance System · v{APP_VERSION}
            </Typography>
          </Box>
        </Stack>
        <Typography
          sx={{
            display: "none",
            mt: { xs: 1, sm: 1.5 },
            color: "#71809A",
            fontSize: "0.67rem",
            textAlign: "center",
          }}
        >
          {SCHOOL_NAME}
        </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
