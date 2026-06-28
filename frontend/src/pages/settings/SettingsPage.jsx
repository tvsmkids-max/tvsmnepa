import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Divider,
  Stack,
  FormControlLabel,
  Switch,
  Avatar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from "@mui/material";
import { useSnackbar } from "notistack";
import SchoolIcon from "@mui/icons-material/School";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import SecurityIcon from "@mui/icons-material/Security";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import PageHeader from "../../components/common/PageHeader";
import axiosInstance from "../../api/axiosInstance";
import useSettings from "../../hooks/useSettings";
import sessionApi from "../../api/sessionApi";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "America/New_York",
  "Europe/London",
];
const WORKING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SettingsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { settings, fetchSettings } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolName: "",
    address: "",
    phone: "",
    email: "",
    activeSession: "",
    attendanceOpenTime: "07:00",
    attendanceLockTime: "23:59",
    warningPercentage: 75,
    timezone: "Asia/Kolkata",
    workingDays: WORKING_DAYS.map((day) => ({
      day,
      isWorking: day !== "Sunday",
    })),
    sessionIdleEnabled: true,
    sessionIdleTimeout: 15,
    sessionIdleWarning: 60,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await sessionApi.list();
        if (!cancelled) setSessions(res.data?.data || []);
      } catch {
        if (!cancelled) setSessions([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    setForm({
      schoolName:
        settings.schoolName && settings.schoolName !== "Setup Required"
          ? settings.schoolName
          : "",
      address: settings.address || "",
      phone: settings.phone || "",
      email: settings.email || "",
      activeSession:
        settings.activeSession?._id || settings.activeSession || "",
      attendanceOpenTime: settings.attendanceOpenTime || "07:00",
      attendanceLockTime: settings.attendanceLockTime || "23:59",
      warningPercentage: settings.warningPercentage || 75,
      timezone: settings.timezone || "Asia/Kolkata",
      workingDays:
        settings.workingDays?.length > 0
          ? settings.workingDays
          : WORKING_DAYS.map((day) => ({ day, isWorking: day !== "Sunday" })),
      sessionIdleEnabled: settings.sessionIdleEnabled ?? true,
      sessionIdleTimeout: settings.sessionIdleTimeout ?? 15,
      sessionIdleWarning: settings.sessionIdleWarning ?? 60,
    });
  }, [settings]);

  const handleChange = (field, value) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleWorkingDayToggle = (day) => {
    setForm((p) => ({
      ...p,
      workingDays: p.workingDays.map((d) =>
        d.day === day ? { ...d, isWorking: !d.isWorking } : d,
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.schoolName.trim()) {
      enqueueSnackbar("School name is required", { variant: "warning" });
      return;
    }

    // Validate idle settings
    if (form.sessionIdleEnabled) {
      if (form.sessionIdleTimeout < 1 || form.sessionIdleTimeout > 240) {
        enqueueSnackbar("Idle timeout must be between 1 and 240 minutes", {
          variant: "warning",
        });
        return;
      }
      if (form.sessionIdleWarning < 10 || form.sessionIdleWarning > 300) {
        enqueueSnackbar("Warning duration must be between 10 and 300 seconds", {
          variant: "warning",
        });
        return;
      }
      const idleMs = form.sessionIdleTimeout * 60 * 1000;
      const warnMs = form.sessionIdleWarning * 1000;
      if (warnMs >= idleMs) {
        enqueueSnackbar(
          "Warning duration must be less than total idle timeout",
          { variant: "warning" },
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.activeSession) delete payload.activeSession;
      await axiosInstance.put("/settings", payload);
      enqueueSnackbar("Settings saved successfully", { variant: "success" });
      await fetchSettings();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const isFirstSetup =
    !settings?.schoolName || settings.schoolName === "Setup Required";

  return (
    <Box>
      <PageHeader
        title="School Settings"
        subtitle="Configure your school information and attendance preferences"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      {isFirstSetup && (
        <Alert
          severity="info"
          icon={<SettingsIcon />}
          sx={{ mb: 3, borderRadius: 3 }}
        >
          <Typography variant="body2" fontWeight={700}>
            Welcome! Please configure your school details below.
          </Typography>
          <Typography variant="caption">
            This is a one-time setup. All fields can be updated anytime later.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* SCHOOL INFO */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 2.5 }}
            >
              <Avatar sx={{ bgcolor: "primary.light", width: 40, height: 40 }}>
                <SchoolIcon sx={{ color: "primary.dark" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  School Information
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Basic details displayed across the app
                </Typography>
              </Box>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="School Name *"
                  fullWidth
                  size="small"
                  value={form.schoolName}
                  onChange={(e) => handleChange("schoolName", e.target.value)}
                  placeholder="e.g., Tagore Vidya Sagar Mandir"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  size="small"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  size="small"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="info@school.com"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ACADEMIC CONFIG */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Academic Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Active Session</InputLabel>
                  <Select
                    value={form.activeSession}
                    label="Active Session"
                    onChange={(e) =>
                      handleChange("activeSession", e.target.value)
                    }
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {sessions.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={form.timezone}
                    label="Timezone"
                    onChange={(e) => handleChange("timezone", e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <MenuItem key={tz} value={tz}>
                        {tz}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* ATTENDANCE RULES */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Attendance Rules
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Attendance Opens At"
                  type="time"
                  fullWidth
                  size="small"
                  value={form.attendanceOpenTime}
                  onChange={(e) =>
                    handleChange("attendanceOpenTime", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Attendance Locks At"
                  type="time"
                  fullWidth
                  size="small"
                  value={form.attendanceLockTime}
                  onChange={(e) =>
                    handleChange("attendanceLockTime", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Warning Threshold (%)"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.warningPercentage}
                  onChange={(e) =>
                    handleChange(
                      "warningPercentage",
                      parseInt(e.target.value, 10) || 0,
                    )
                  }
                  inputProps={{ min: 1, max: 100 }}
                  helperText="Students below this % flagged"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* SECURITY & SESSION */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 2.5 }}
            >
              <Avatar sx={{ bgcolor: "error.light", width: 40, height: 40 }}>
                <SecurityIcon sx={{ color: "error.dark" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Security & Session
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Auto-logout users after periods of inactivity
                </Typography>
              </Box>
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={form.sessionIdleEnabled}
                  onChange={(e) =>
                    handleChange("sessionIdleEnabled", e.target.checked)
                  }
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Enable Auto-Logout on Inactivity
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Applies to all users (admin & teachers)
                  </Typography>
                </Box>
              }
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Idle Timeout"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.sessionIdleTimeout}
                  onChange={(e) =>
                    handleChange(
                      "sessionIdleTimeout",
                      parseInt(e.target.value, 10) || 0,
                    )
                  }
                  inputProps={{ min: 1, max: 240 }}
                  disabled={!form.sessionIdleEnabled}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimerOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">minutes</InputAdornment>
                    ),
                  }}
                  helperText="1–240 minutes (default: 15)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Warning Before Logout"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.sessionIdleWarning}
                  onChange={(e) =>
                    handleChange(
                      "sessionIdleWarning",
                      parseInt(e.target.value, 10) || 0,
                    )
                  }
                  inputProps={{ min: 10, max: 300 }}
                  disabled={!form.sessionIdleEnabled}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">seconds</InputAdornment>
                    ),
                  }}
                  helperText="10–300 seconds (default: 60)"
                />
              </Grid>
            </Grid>

            {form.sessionIdleEnabled && (
              <Alert
                severity="info"
                sx={{ mt: 2, borderRadius: 2 }}
                icon={<TimerOutlinedIcon />}
              >
                <Typography variant="body2">
                  Users will be automatically logged out after{" "}
                  <strong>
                    {form.sessionIdleTimeout} minute
                    {form.sessionIdleTimeout !== 1 ? "s" : ""}
                  </strong>{" "}
                  of inactivity. A warning dialog will appear{" "}
                  <strong>
                    {form.sessionIdleWarning} second
                    {form.sessionIdleWarning !== 1 ? "s" : ""}
                  </strong>{" "}
                  before logout.
                </Typography>
              </Alert>
            )}
          </Paper>

          {/* WORKING DAYS */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Working Days
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Days when attendance is expected
            </Typography>
            <Grid container spacing={1}>
              {form.workingDays.map((d) => (
                <Grid item xs={6} sm={4} md={3} key={d.day}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={d.isWorking}
                        onChange={() => handleWorkingDayToggle(d.day)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={600}>
                        {d.day}
                      </Typography>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* SAVE PANEL */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, position: "sticky", top: 80 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Save Changes
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 2, display: "block" }}
            >
              Settings apply across the system instantly.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current School
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {form.schoolName || "— Not set —"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Active Session
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {sessions.find((s) => s._id === form.activeSession)?.name ||
                    "— None —"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Working Days/Week
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {form.workingDays.filter((d) => d.isWorking).length} days
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Auto-Logout
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={
                    form.sessionIdleEnabled ? "success.main" : "text.disabled"
                  }
                >
                  {form.sessionIdleEnabled
                    ? `After ${form.sessionIdleTimeout} min`
                    : "Disabled"}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={
                saving ? (
                  <CircularProgress size={18} sx={{ color: "white" }} />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={handleSave}
              disabled={saving}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                py: 1.4,
              }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
