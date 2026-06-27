import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Box,
} from "@mui/material";
import { useSnackbar } from "notistack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CasinoIcon from "@mui/icons-material/Casino";
import teacherApi from "../../api/teacherApi";

const generateStrongPassword = () => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "@#$%&*";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 0; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

const TeacherResetPasswordDialog = ({ open, onClose, teacher, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setSuccess(false);
    }
  }, [open]);

  const validatePassword = () => {
    if (!newPassword) return "Password is required";
    if (newPassword.length < 8) return "Must be at least 8 characters";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    enqueueSnackbar("Strong password generated", { variant: "info" });
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    enqueueSnackbar("Password copied to clipboard", { variant: "success" });
  };

  const handleSubmit = async () => {
    const error = validatePassword();
    if (error) {
      enqueueSnackbar(error, { variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await teacherApi.resetPassword(teacher._id, newPassword);
      setSuccess(true);
      enqueueSnackbar("Password reset successfully", { variant: "success" });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to reset password",
        { variant: "error" },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "warning.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockResetIcon sx={{ color: "warning.dark" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} component="div">
              Reset Password
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {teacher?.name} • {teacher?.employeeId}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ borderRadius: 2, my: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              Password reset successfully!
            </Typography>
            <Typography variant="caption">
              Share the new password securely with {teacher?.name}.
            </Typography>
          </Alert>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2, mt: 1, borderRadius: 2 }}>
              <Typography variant="caption">
                Teacher will need to use this new password to login. Their
                existing sessions will be invalidated.
              </Typography>
            </Alert>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CasinoIcon />}
                onClick={handleGeneratePassword}
                fullWidth
              >
                Generate Strong Password
              </Button>
            </Stack>

            <TextField
              label="New Password *"
              type={showPassword ? "text" : "password"}
              fullWidth
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {newPassword && (
                      <IconButton
                        onClick={handleCopyPassword}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                        title="Copy password"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Minimum 8 characters"
            />

            <TextField
              label="Confirm New Password *"
              type={showPassword ? "text" : "password"}
              fullWidth
              size="small"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && confirmPassword !== newPassword}
              helperText={
                confirmPassword && confirmPassword !== newPassword
                  ? "Passwords do not match"
                  : " "
              }
            />

            {newPassword &&
              newPassword === confirmPassword &&
              newPassword.length >= 8 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#E6F4EA",
                    border: "1px solid",
                    borderColor: "success.light",
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      color: "success.dark",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Password ready
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mt: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "success.dark",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {showPassword
                        ? newPassword
                        : "•".repeat(newPassword.length)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyPassword}
                      sx={{ color: "success.dark" }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!success && (
          <>
            <Button onClick={onClose} disabled={submitting} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleSubmit}
              disabled={submitting || !!validatePassword()}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} sx={{ color: "white" }} />
                ) : (
                  <LockResetIcon />
                )
              }
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TeacherResetPasswordDialog;
