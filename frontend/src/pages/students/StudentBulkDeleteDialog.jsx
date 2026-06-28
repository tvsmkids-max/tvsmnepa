import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  AlertTitle,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Divider,
  Chip,
  LinearProgress,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useSnackbar } from "notistack";
import studentApi from "../../api/studentApi";

const StudentBulkDeleteDialog = ({
  open,
  selectedStudents = [],
  onClose,
  onDeleted,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const [mode, setMode] = useState("soft");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setMode("soft");
      setConfirmText("");
      setLoading(false);
    }
  }, [open]);

  const count = selectedStudents.length;
  const isHard = mode === "hard";
  const canConfirm = isHard ? confirmText === "DELETE" : true;

  const handleConfirm = async () => {
    if (count === 0) return;
    if (isHard && confirmText !== "DELETE") {
      enqueueSnackbar('Please type "DELETE" to confirm', { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const ids = selectedStudents.map((s) => s._id);
      const res = await studentApi.bulkDelete(ids, mode);

      enqueueSnackbar(
        res.data?.message ||
          (isHard
            ? `${count} students permanently deleted`
            : `${count} students marked as inactive`),
        { variant: "success" },
      );

      onDeleted?.();
      onClose?.();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Bulk delete failed", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const previewStudents = selectedStudents.slice(0, 5);
  const remainingCount = Math.max(0, count - 5);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      keepMounted={false}
      PaperProps={{ sx: { borderRadius: 3 } }}
      aria-labelledby="bulk-delete-title"
    >
      <DialogTitle id="bulk-delete-title" component="div" sx={{ pt: 3, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: isHard ? "error.light" : "warning.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isHard ? (
              <DeleteForeverIcon sx={{ color: "error.dark" }} />
            ) : (
              <WarningAmberIcon sx={{ color: "warning.dark" }} />
            )}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              Bulk Delete Students
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {count} student{count !== 1 ? "s" : ""} selected
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      {loading && <LinearProgress />}

      <DialogContent sx={{ pb: 1 }}>
        {/* Selected Students Preview */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#F8F9FB",
            mb: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
          >
            Selected Students
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
            {previewStudents.map((s) => (
              <Chip
                key={s._id}
                label={`${s.name} (${s.scholarNumber})`}
                size="small"
                sx={{ fontWeight: 600, fontSize: "0.72rem" }}
              />
            ))}
            {remainingCount > 0 && (
              <Chip
                label={`+${remainingCount} more`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, fontSize: "0.72rem" }}
              />
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Mode Selection */}
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
          Choose deletion mode:
        </Typography>

        <RadioGroup
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setConfirmText("");
          }}
        >
          {/* SOFT DELETE */}
          <Box
            sx={{
              border: "2px solid",
              borderColor: mode === "soft" ? "warning.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              mb: 1.5,
              cursor: "pointer",
              transition: "all 0.2s",
              bgcolor: mode === "soft" ? "warning.50" : "transparent",
            }}
            onClick={() => setMode("soft")}
          >
            <FormControlLabel
              value="soft"
              control={<Radio />}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <VisibilityOffIcon
                    fontSize="small"
                    sx={{ color: "warning.dark" }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={800}>
                      Soft Delete (Recommended)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Marks as Inactive • Attendance kept • Recoverable
                    </Typography>
                  </Box>
                </Stack>
              }
              sx={{ width: "100%", m: 0 }}
            />
          </Box>

          {/* HARD DELETE */}
          <Box
            sx={{
              border: "2px solid",
              borderColor: mode === "hard" ? "error.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              cursor: "pointer",
              transition: "all 0.2s",
              bgcolor: mode === "hard" ? "error.50" : "transparent",
            }}
            onClick={() => setMode("hard")}
          >
            <FormControlLabel
              value="hard"
              control={<Radio color="error" />}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DeleteForeverIcon
                    fontSize="small"
                    sx={{ color: "error.dark" }}
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color="error.dark"
                    >
                      Hard Delete (Permanent)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Removes students AND all attendance records
                    </Typography>
                  </Box>
                </Stack>
              }
              sx={{ width: "100%", m: 0 }}
            />
          </Box>
        </RadioGroup>

        {/* Hard Delete Warning + Confirmation */}
        {isHard && (
          <Alert
            severity="error"
            sx={{ mt: 2, borderRadius: 2 }}
            icon={<DeleteForeverIcon />}
          >
            <AlertTitle sx={{ fontWeight: 800 }}>
              ⚠️ This action cannot be undone!
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              All {count} students and their complete attendance history will be{" "}
              <strong>permanently deleted</strong> from the database.
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ display: "block", mb: 0.5 }}
            >
              Type{" "}
              <code
                style={{
                  background: "#fff",
                  padding: "2px 6px",
                  borderRadius: 3,
                  color: "#dc2626",
                  fontWeight: 800,
                }}
              >
                DELETE
              </code>{" "}
              to confirm:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              autoComplete="off"
              sx={{
                mt: 1,
                bgcolor: "#fff",
                borderRadius: 1,
                "& input": { fontWeight: 800, letterSpacing: 1 },
              }}
              disabled={loading}
            />
          </Alert>
        )}

        {/* Soft Delete Info */}
        {!isHard && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              Selected students will be marked as <strong>Inactive</strong>. You
              can restore them later from the Inactive list.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          color="inherit"
          sx={{ fontWeight: 700 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={isHard ? "error" : "warning"}
          disabled={loading || !canConfirm || count === 0}
          startIcon={isHard ? <DeleteForeverIcon /> : <VisibilityOffIcon />}
          sx={{ fontWeight: 800 }}
        >
          {loading
            ? "Processing..."
            : isHard
              ? `Permanently Delete ${count}`
              : `Soft Delete ${count}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentBulkDeleteDialog;
