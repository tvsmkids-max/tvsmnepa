import React, { useState, useEffect, useRef } from "react";
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
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import authApi from "../../api/authApi";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    setPassword("");
    setPinDigits(["", "", "", "", ""]);
  }, [selectedUserId]);

  const selectedUserObj = loginOptions.find((o) => o._id === selectedUserId);
  const isAdminLogin = selectedUserObj?.role === "admin";
  const isClassLogin = selectedUserObj?.role === "class";
  const classPin = pinDigits.join("");

  const handlePinChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

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

    const focusIndex = Math.min(pasted.length, 4);
    pinRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUserId) {
      enqueueSnackbar("Please select an account to log in", {
        variant: "warning",
      });
      return;
    }

    try {
      if (isAdminLogin) {
        if (!password) {
          enqueueSnackbar("Please enter password", {
            variant: "warning",
          });
          return;
        }

        setSubmitting(true);
        clearError();
        await login({ userId: selectedUserId, password });
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
        await login({ userId: selectedUserId, password: classPin });
      }
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.message || "Login failed. Please try again.",
        { variant: "error" },
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 2,
          background:
            "radial-gradient(ellipse at top left, rgba(191,219,254,0.8), transparent 30%), radial-gradient(ellipse at bottom right, rgba(147,197,253,0.65), transparent 34%), linear-gradient(135deg, #f8fbff 0%, #edf4ff 38%, #eef6ff 100%)",
          color: "#173B82",
        }}
      >
        <Avatar
          src={SCHOOL_LOGO}
          alt={`${SCHOOL_NAME} logo`}
          sx={{
            width: { xs: 48, sm: 58, md: 68 },
            height: { xs: 48, sm: 58, md: 68 },
            bgcolor: "#FFFFFF",
            border: "1px solid rgba(37,99,235,0.14)",
            "& img": { objectFit: "contain", p: 0.5 },
          }}
        />
        <Typography
          sx={{
            fontSize: { xs: "1.15rem", sm: "1.55rem", md: "2rem" },
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          TVSM School
        </Typography>
        <CircularProgress size={28} />
        <Typography sx={{ color: "#64748B", fontSize: "0.9rem" }}>
          Loading your school portal...
        </Typography>
      </Box>
    );
  }

  const inputBg = "rgba(255,255,255,0.82)";

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
          "linear-gradient(145deg, #eef5ff 0%, #e7f0ff 48%, #f7faff 100%)",
        color: "#101B38",
        overflow: "auto",
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 0, sm: 3 },
          py: { xs: 0, sm: 4 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            minHeight: { xs: "100vh", sm: "auto" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 1.25, sm: 1.75 },
              mb: { xs: 2, sm: 2.5 },
              px: 1,
              width: "100%",
              minWidth: 0,
            }}
          >
            <Avatar
              src={SCHOOL_LOGO}
              alt={`${SCHOOL_NAME} logo`}
              variant="circular"
              sx={{
                width: { xs: 48, sm: 58, md: 68 },
                height: { xs: 48, sm: 58, md: 68 },
                flexShrink: 0,
                bgcolor: "#FFFFFF",
                border: "1px solid rgba(37,99,235,0.14)",
                boxShadow: "0 6px 20px rgba(30,64,175,0.09)",
                "& img": {
                  objectFit: "contain",
                  p: { xs: 0.4, sm: 0.6 },
                },
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#173B82",
                  fontFamily:
                    '"Segoe UI", "Poppins", "Trebuchet MS", sans-serif',
                  fontSize: {
                    xs: "1.15rem",
                    sm: "1.55rem",
                    md: "2rem",
                  },
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: {
                    xs: "0.01em",
                    sm: "0.025em",
                    md: "0.035em",
                  },
                  whiteSpace: "nowrap",
                }}
              >
                TVSM School
              </Typography>
              <Typography
                sx={{
                  mt: 0.4,
                  color: "#64748B",
                  fontSize: {
                    xs: "0.55rem",
                    sm: "0.65rem",
                    md: "0.7rem",
                  },
                  fontWeight: 600,
                  letterSpacing: { xs: "0.08em", sm: "0.12em" },
                  whiteSpace: "nowrap",
                }}
              >
                SCHOOL MANAGEMENT PORTAL
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: { xs: "block", sm: "none" },
              width: "100%",
              height: "58vh",
              minHeight: 390,
              maxHeight: 520,
              flexShrink: 0,
              backgroundColor: "#12316f",
              backgroundImage:
                "url('/mobile-login-illustration.png'), linear-gradient(180deg, #12316f 0%, #0b2150 100%)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center top",
              backgroundSize: "100% auto",
            }}
          />

          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "none", sm: 980 },
              minHeight: { xs: "auto", sm: 520 },
              mt: { xs: -4, sm: 0 },
              bgcolor: "#FFFFFF",
              borderRadius: { xs: "32px 32px 0 0", sm: 5 },
              boxShadow: {
                xs: "none",
                sm: "0 28px 70px rgba(30,64,175,0.18), 0 8px 24px rgba(15,23,42,0.08)",
              },
              overflow: "hidden",
              display: { xs: "block", md: "grid" },
              gridTemplateColumns: "1fr 430px",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                minHeight: 520,
                position: "relative",
                overflow: "hidden",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 5,
                color: "#FFFFFF",
                background:
                  "linear-gradient(145deg, #173F86 0%, #1D4ED8 58%, #2563EB 100%)",
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    opacity: 0.78,
                  }}
                >
                  TVSM School
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    mt: 1.4,
                    maxWidth: 390,
                    fontSize: "2.55rem",
                    fontWeight: 850,
                    lineHeight: 1.08,
                    letterSpacing: "-0.035em",
                  }}
                >
                  School attendance, made simple.
                </Typography>
                <Typography
                  sx={{
                    mt: 2,
                    maxWidth: 380,
                    color: "rgba(255,255,255,0.78)",
                    lineHeight: 1.65,
                  }}
                >
                  A secure, easy-to-use portal for administrators and classes.
                </Typography>
                <Typography
                  sx={{
                    mt: 2,
                    maxWidth: 380,
                    color: "rgba(255,255,255,0.78)",
                    lineHeight: 1.65,
                  }}
                >
                  Developed by{" "}
                  <a
                    href="https://www.linkedin.com/in/abhishekwani18/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#E0E7FF", textDecoration: "underline" }}
                  >
                    Abhishek Wani
                  </a>{" "}
                  | Version {APP_VERSION}
                </Typography>
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.16,
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, #fff 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, #fff 0 2px, transparent 3px)",
                  backgroundSize: "36px 36px, 44px 44px",
                }}
              />
              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  height: 190,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    width: 235,
                    height: 160,
                    bgcolor: "#FFFFFF",
                    borderRadius: 3,
                    boxShadow: "0 24px 50px rgba(6,32,82,0.28)",
                    position: "relative",
                    transform: "rotate(-2deg)",
                    p: 2,
                  }}
                >
                  <CalendarMonthOutlinedIcon
                    sx={{ color: "#2563EB", fontSize: 38 }}
                  />
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <Box
                      key={item}
                      sx={{
                        position: "absolute",
                        left: item % 2 === 0 ? 24 : 104,
                        top: 58 + Math.floor(item / 2) * 31,
                        width: 62,
                        height: 18,
                        borderRadius: 1,
                        bgcolor: item === 5 ? "#60A5FA" : "#E7EFFC",
                        "&::after":
                          item === 5
                            ? {
                                content: '"✓"',
                                position: "absolute",
                                right: 5,
                                top: -2,
                                color: "#fff",
                                fontWeight: 900,
                              }
                            : {},
                      }}
                    />
                  ))}
                  <SchoolOutlinedIcon
                    sx={{
                      position: "absolute",
                      right: -24,
                      bottom: -22,
                      width: 72,
                      height: 72,
                      p: 1.2,
                      bgcolor: "#60A5FA",
                      borderRadius: "50%",
                      border: "8px solid rgba(255,255,255,0.95)",
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ p: { xs: 2.25, sm: 4, md: 4.5 }, textAlign: "left" }}>
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  color: "#2563EB",
                  fontSize: "0.68rem",
                  fontWeight: 850,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 0.8,
                }}
              >
                Welcome
              </Typography>
              <Typography
                component="h2"
                sx={{
                  color: "#101B38",
                  fontWeight: 850,
                  fontSize: { xs: "1.7rem", sm: "2rem" },
                  lineHeight: 1.12,
                  letterSpacing: "-0.045em",
                  mb: { xs: 2.2, md: 1.75 },
                }}
              >
                Sign in to your account
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  onClose={clearError}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Typography variant="caption" fontWeight={700} sx={labelSx}>
                  Select account
                </Typography>

                <FormControl
                  fullWidth
                  size="medium"
                  sx={{ mb: 1.4 }}
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
                        borderColor: "rgba(148,163,184,0.7)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(59,130,246,0.75)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#2563EB",
                        borderWidth: 1.5,
                      },
                      "& .MuiSelect-select": {
                        py: 1.4,
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
                            py: 1.1,
                            fontWeight: opt.role === "admin" ? 800 : 700,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                          >
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
                        mb: { xs: 1.5, sm: 2 },
                        "& .MuiOutlinedInput-root": {
                          bgcolor: inputBg,
                          borderRadius: 2.5,
                          "& fieldset": {
                            borderColor: "rgba(148,163,184,0.7)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(59,130,246,0.75)",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#2563EB",
                            borderWidth: 1.5,
                          },
                        },
                        "& .MuiInputBase-input": {
                          py: 1.5,
                          fontSize: "0.9rem",
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon
                              sx={{ color: "#7183A0", fontSize: 20 }}
                            />
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
                      spacing={1.2}
                      justifyContent="space-between"
                      sx={{ mb: 1.6 }}
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
                            inputMode: "numeric",
                            pattern: "[0-9]*",
                            maxLength: 1,
                            autoComplete: "one-time-code",
                            style: {
                              textAlign: "center",
                              fontSize: "1.2rem",
                              fontWeight: 800,
                              padding: "11px 0",
                            },
                          }}
                          sx={{
                            width: { xs: 46, sm: 56 },
                            "& .MuiOutlinedInput-root": {
                              bgcolor: inputBg,
                              borderRadius: 2,
                              "& fieldset": {
                                borderColor: "rgba(148,163,184,0.7)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#2563EB",
                              },
                            },
                          }}
                        />
                      ))}
                    </Stack>

                    <Box textAlign="right" sx={{ mt: -1, mb: 1.8 }}>
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
                    py: 1.45,
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    borderRadius: 2.5,
                    background:
                      "linear-gradient(110deg, #1D4ED8 0%, #2563EB 58%, #3478E8 100%)",
                    boxShadow: "0 14px 26px rgba(37,99,235,.22)",
                    textTransform: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background:
                        "linear-gradient(110deg, #1E40AF 0%, #1D4ED8 100%)",
                      boxShadow: "0 16px 28px rgba(37,99,235,.28)",
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
                  mt: 1.9,
                  p: 1.3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.1,
                  borderRadius: 2.5,
                  bgcolor: "rgba(239,245,255,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  color: "#51627E",
                }}
              >
                <LockOutlinedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                <Typography sx={{ fontSize: "0.72rem", lineHeight: 1.5 }}>
                  Contact the school administrator for account details.
                </Typography>
              </Box>

              <Typography
                sx={{
                  display: { xs: "block", md: "none" },
                  mt: 2,
                  color: "#94A3B8",
                  textAlign: "center",
                  fontSize: "0.68rem",
                  lineHeight: 1.5,
                }}
              >
                Developed by{" "}
                <a
                  href="https://www.linkedin.com/in/abhishekwani18/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563EB", textDecoration: "underline" }}
                >
                  Abhishek Wani
                </a>{" "}
                | Version {APP_VERSION}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
