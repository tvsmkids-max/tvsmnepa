import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Typography,
  Alert,
} from "@mui/material";
import { useSnackbar } from "notistack";
import studentApi from "../../api/studentApi";

const StudentStatusDialog = ({ open, onClose, onSaved, student }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [statusDate, setStatusDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    const timer = setTimeout(() => {
      setStatus(student.status || "Active");
      setRemark(student.statusRemark || "");
      setStatusDate(
        student.statusDate
          ? new Date(student.statusDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [open, student]);

  const handleSubmit = async () => {
    if (status === "Inactive" && !remark.trim()) {
      enqueueSnackbar("Remark required for Inactive status", {
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.updateStatus(student._id, {
        status,
        statusRemark: remark.trim(),
        statusDate: statusDate || new Date().toISOString(),
      });
      enqueueSnackbar("Status updated", { variant: "success" });
      onSaved();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
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
        <Typography variant="h6" fontWeight={700} component="div">
          Change Student Status
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {student?.name} • {student?.scholarNumber}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {(status === "TC" || status === "Transferred") && (
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            Attendance will be blocked from the status date onwards.
          </Alert>
        )}

        <FormControl fullWidth sx={{ mb: 2, mt: 1 }} size="small">
          <InputLabel>Status *</InputLabel>
          <Select
            value={status}
            label="Status *"
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
            <MenuItem value="TC">TC (Transfer Certificate)</MenuItem>
            <MenuItem value="Transferred">Transferred</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Status Date"
          type="date"
          fullWidth
          size="small"
          value={statusDate}
          onChange={(e) => setStatusDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        <TextField
          label={status === "Inactive" ? "Remark *" : "Remark (optional)"}
          fullWidth
          multiline
          rows={3}
          size="small"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Reason for change..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={
            submitting && <CircularProgress size={16} sx={{ color: "white" }} />
          }
        >
          Update Status
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentStatusDialog;
