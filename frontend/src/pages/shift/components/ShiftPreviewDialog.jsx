import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  Typography,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  Avatar,
  CircularProgress,
  TextField,
} from "@mui/material";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";

const ShiftPreviewDialog = ({
  open,
  onClose,
  onConfirm,
  previewData,
  loading = false,
}) => {
  const [confirmText, setConfirmText] = useState("");

  React.useEffect(() => {
    if (!open) setConfirmText("");
  }, [open]);

  if (!previewData) return null;

  const { source, target, shiftable, conflicts, summary } = previewData;

  const canConfirm = confirmText === "SHIFT" && summary.canShift > 0;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: "primary.light",
            }}
          >
            <SwapHorizOutlinedIcon sx={{ color: "primary.dark" }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Confirm Shift
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review and confirm before proceeding
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Source → Target Visual */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3, mt: 1 }}
        >
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: "error.50",
              border: "1px solid",
              borderColor: "error.light",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              color="error.dark"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: "0.65rem",
              }}
            >
              FROM
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {source.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {source.totalStudents} students
            </Typography>
          </Box>

          <Box>
            <ArrowForwardOutlinedIcon
              sx={{ fontSize: 32, color: "primary.main" }}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: "success.50",
              border: "1px solid",
              borderColor: "success.light",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              color="success.dark"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: "0.65rem",
              }}
            >
              TO
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {target.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {target.existingStudents} → {target.afterShift} students
            </Typography>
          </Box>
        </Stack>

        {/* Summary */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip
            icon={<CheckCircleOutlineIcon />}
            label={`${summary.canShift} will shift`}
            color="success"
            sx={{ fontWeight: 700 }}
          />
          {summary.conflicts > 0 && (
            <Chip
              icon={<WarningAmberOutlinedIcon />}
              label={`${summary.conflicts} conflicts`}
              color="warning"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {/* Shiftable Students Preview */}
        {shiftable.length > 0 && (
          <>
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                mb: 1,
                fontSize: "0.68rem",
              }}
            >
              ✓ Students to Shift ({shiftable.length})
            </Typography>
            <Box
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                mb: 2,
              }}
            >
              {shiftable.slice(0, 20).map((s) => (
                <Stack
                  key={s._id}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: s.gender === "Female" ? "#EC4899" : "#1E4D98",
                      fontSize: "0.7rem",
                    }}
                  >
                    {s.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ fontSize: "0.82rem" }}
                      noWrap
                    >
                      {s.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.68rem" }}
                    >
                      {s.scholarNumber}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip
                      label={`Roll ${s.currentRoll}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: "error.50",
                        color: "error.dark",
                      }}
                    />
                    <ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />
                    <Chip
                      label={`Roll ${s.newRoll}`}
                      size="small"
                      color="success"
                      sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                    />
                  </Stack>
                </Stack>
              ))}
              {shiftable.length > 20 && (
                <Box sx={{ p: 1, textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    ...and {shiftable.length - 20} more
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>
              {conflicts.length} student{conflicts.length !== 1 ? "s" : ""} will
              be skipped
            </AlertTitle>
            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
              Same scholar number already exists in target class:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {conflicts.slice(0, 5).map((c) => (
                <Chip
                  key={c._id}
                  label={`${c.name} (${c.scholarNumber})`}
                  size="small"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              ))}
              {conflicts.length > 5 && (
                <Chip
                  label={`+${conflicts.length - 5} more`}
                  size="small"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                />
              )}
            </Stack>
          </Alert>
        )}

        {/* Confirmation Input */}
        {summary.canShift > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              Type <strong style={{ color: "#1E4D98" }}>SHIFT</strong> to
              confirm:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type SHIFT here"
              autoComplete="off"
              disabled={loading}
              sx={{
                "& input": {
                  fontWeight: 800,
                  letterSpacing: 1,
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={!canConfirm || loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} sx={{ color: "white" }} />
            ) : (
              <SwapHorizOutlinedIcon />
            )
          }
          sx={{
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            fontWeight: 800,
            px: 3,
          }}
        >
          {loading
            ? "Shifting..."
            : `Shift ${summary.canShift} Student${summary.canShift !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShiftPreviewDialog;
