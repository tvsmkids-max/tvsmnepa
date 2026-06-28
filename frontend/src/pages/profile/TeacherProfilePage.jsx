import React, { useState, useEffect, useCallback } from "react";
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
  Avatar,
  Chip,
  Alert,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  Card,
  CardContent,
} from "@mui/material";
import { useSnackbar } from "notistack";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ClassIcon from "@mui/icons-material/Class";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditIcon from "@mui/icons-material/Edit";
import PageHeader from "../../components/common/PageHeader";
import teacherApi from "../../api/teacherApi";
import useAuth from "../../hooks/useAuth";

const TeacherProfilePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user, updateUser } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    designation: "",
    qualification: "",
    address: "",
    dob: "",
    gender: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherApi.getMyProfile();
      const data = res.data?.data;
      if (data) {
        setProfile(data);
        setForm({
          name: data.name || "",
          mobile: data.mobile || "",
          designation: data.designation || "",
          qualification: data.qualification || "",
          address: data.address || "",
          dob: data.dob ? new Date(data.dob).toISOString().split("T")[0] : "",
          gender: data.gender || "",
        });
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to load profile", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (cancelled) return;
      await loadProfile();
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePasswordChange = (field, value) =>
    setPasswordForm((prev) => ({ ...prev, [field]: value }));

  const validateProfile = () => {
    if (!form.name?.trim()) {
      enqueueSnackbar("Name is required", { variant: "warning" });
      return false;
    }
    if (form.name.trim().length < 2) {
      enqueueSnackbar("Name must be at least 2 characters", {
        variant: "warning",
      });
      return false;
    }
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) {
      enqueueSnackbar("Invalid mobile (must be 10 digits, starting 6-9)", {
        variant: "warning",
      });
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile,
        designation: form.designation,
        qualification: form.qualification,
        address: form.address,
        dob: form.dob || null,
        gender: form.gender || null,
      };

      const res = await teacherApi.updateMyProfile(payload);
      const updatedData = res.data?.data;

      if (updatedData) {
        setProfile(updatedData);
        // Update auth context if name changed
        if (updatedData.name && updatedData.name !== user?.name) {
          updateUser({ name: updatedData.name });
        }
      }

      enqueueSnackbar("Profile updated successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to update profile",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    if (!passwordForm.currentPassword) {
      enqueueSnackbar("Current password is required", { variant: "warning" });
      return false;
    }
    if (!passwordForm.newPassword) {
      enqueueSnackbar("New password is required", { variant: "warning" });
      return false;
    }
    if (passwordForm.newPassword.length < 8) {
      enqueueSnackbar("New password must be at least 8 characters", {
        variant: "warning",
      });
      return false;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      enqueueSnackbar("New password must be different from current", {
        variant: "warning",
      });
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      enqueueSnackbar("Passwords don't match", { variant: "warning" });
      return false;
    }
    // Strong password check
    const hasUpper = /[A-Z]/.test(passwordForm.newPassword);
    const hasLower = /[a-z]/.test(passwordForm.newPassword);
    const hasNumber = /\d/.test(passwordForm.newPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      enqueueSnackbar(
        "Password must contain uppercase, lowercase, and number",
        { variant: "warning" },
      );
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setChangingPassword(true);
    try {
      await teacherApi.changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      enqueueSnackbar("Password changed successfully", { variant: "success" });

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to change password",
        { variant: "error" },
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information and password"
        breadcrumbs={[
          { label: "Dashboard", path: "/teacher/dashboard" },
          { label: "Profile" },
        ]}
      />

      {/* ─── PROFILE HERO ─── */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%)",
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "white",
              color: "primary.main",
              fontSize: "2rem",
              fontWeight: 800,
              border: "3px solid rgba(255,255,255,0.3)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            }}
          >
            {profile?.name?.[0]?.toUpperCase() ||
              user?.name?.[0]?.toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: "white", mb: 0.5, lineHeight: 1.2 }}
            >
              {profile?.name || user?.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.8)",
                mb: 1.5,
                wordBreak: "break-all",
              }}
            >
              {profile?.email || user?.email}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profile?.employeeId && (
                <Chip
                  icon={<BadgeIcon sx={{ fontSize: 14 }} />}
                  label={profile.employeeId}
                  size="small"
                  sx={{
                    height: 24,
                    bgcolor: "rgba(245,166,35,0.25)",
                    color: "#FFD580",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    border: "1px solid rgba(245,166,35,0.4)",
                    "& .MuiChip-icon": { color: "#FFD580" },
                  }}
                />
              )}
              {profile?.designation && (
                <Chip
                  icon={<WorkIcon sx={{ fontSize: 14 }} />}
                  label={profile.designation}
                  size="small"
                  sx={{
                    height: 24,
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    "& .MuiChip-icon": { color: "white" },
                  }}
                />
              )}
              <Chip
                label="TEACHER"
                size="small"
                sx={{
                  height: 24,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.65rem",
                  letterSpacing: "0.06em",
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* ─── ASSIGNED CLASSES ─── */}
      {profile?.assignedClasses?.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 1.5 }}
            >
              <Avatar sx={{ bgcolor: "info.light", width: 36, height: 36 }}>
                <ClassIcon sx={{ color: "info.dark", fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={800}>
                  Assigned Classes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile.assignedClasses.length} class
                  {profile.assignedClasses.length !== 1 ? "es" : ""}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profile.assignedClasses.map((cls) => (
                <Chip
                  key={cls._id}
                  label={`${cls.name}-${cls.section}`}
                  sx={{
                    bgcolor: "#E0EBFF",
                    color: "#1E4D98",
                    fontWeight: 800,
                    height: 32,
                    fontSize: "0.82rem",
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ─── TABS ─── */}
      <Paper sx={{ borderRadius: 3, mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": { fontWeight: 700, py: 2 },
          }}
        >
          <Tab icon={<EditIcon />} iconPosition="start" label="Edit Profile" />
          <Tab
            icon={<LockIcon />}
            iconPosition="start"
            label="Change Password"
          />
        </Tabs>
      </Paper>

      {/* ─── EDIT PROFILE TAB ─── */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 2.5 }}
          >
            <Avatar sx={{ bgcolor: "primary.light", width: 40, height: 40 }}>
              <PersonIcon sx={{ color: "primary.dark" }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Personal Information
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Update your editable details
              </Typography>
            </Box>
          </Stack>

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Employee ID and Email cannot be changed.
              Contact admin if needed.
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            {/* Read-only fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Employee ID"
                fullWidth
                size="small"
                value={profile?.employeeId || ""}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={profile?.email || ""}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
            </Grid>

            {/* Editable fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Name *"
                fullWidth
                size="small"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Mobile"
                fullWidth
                size="small"
                value={form.mobile}
                onChange={(e) =>
                  handleChange(
                    "mobile",
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="10-digit mobile"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Designation"
                fullWidth
                size="small"
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                placeholder="e.g., Senior Teacher"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Qualification"
                fullWidth
                size="small"
                value={form.qualification}
                onChange={(e) => handleChange("qualification", e.target.value)}
                placeholder="e.g., M.Sc., B.Ed."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SchoolIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                size="small"
                value={form.dob}
                onChange={(e) => handleChange("dob", e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Gender"
                fullWidth
                size="small"
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </TextField>
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
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              variant="outlined"
              onClick={loadProfile}
              disabled={saving}
              sx={{ fontWeight: 700 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={16} sx={{ color: "white" }} />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={handleSaveProfile}
              disabled={saving}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 800,
                px: 3,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ─── CHANGE PASSWORD TAB ─── */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 2.5 }}
          >
            <Avatar sx={{ bgcolor: "error.light", width: 40, height: 40 }}>
              <LockIcon sx={{ color: "error.dark" }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Change Password
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Choose a strong password to secure your account
              </Typography>
            </Box>
          </Stack>

          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              Password Requirements:
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              • At least 8 characters
              <br />
              • At least 1 uppercase letter (A–Z)
              <br />
              • At least 1 lowercase letter (a–z)
              <br />• At least 1 number (0–9)
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Current Password *"
                type={showCurrent ? "text" : "password"}
                fullWidth
                size="small"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  handlePasswordChange("currentPassword", e.target.value)
                }
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrent((p) => !p)}
                        edge="end"
                        size="small"
                      >
                        {showCurrent ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="New Password *"
                type={showNew ? "text" : "password"}
                fullWidth
                size="small"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  handlePasswordChange("newPassword", e.target.value)
                }
                autoComplete="new-password"
                helperText="Min 8 chars, with upper/lower/number"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNew((p) => !p)}
                        edge="end"
                        size="small"
                      >
                        {showNew ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm New Password *"
                type={showConfirm ? "text" : "password"}
                fullWidth
                size="small"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  handlePasswordChange("confirmPassword", e.target.value)
                }
                autoComplete="new-password"
                error={
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                helperText={
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword
                    ? "Passwords don't match"
                    : "Re-enter new password"
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirm((p) => !p)}
                        edge="end"
                        size="small"
                      >
                        {showConfirm ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              variant="outlined"
              onClick={() =>
                setPasswordForm({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                })
              }
              disabled={changingPassword}
              sx={{ fontWeight: 700 }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={
                changingPassword ? (
                  <CircularProgress size={16} sx={{ color: "white" }} />
                ) : (
                  <LockIcon />
                )
              }
              onClick={handleChangePassword}
              disabled={changingPassword}
              sx={{ fontWeight: 800, px: 3 }}
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default TeacherProfilePage;
