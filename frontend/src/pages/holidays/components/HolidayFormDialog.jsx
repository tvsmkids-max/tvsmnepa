import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
  Box,
  Stack,
} from "@mui/material";
import { useSnackbar } from "notistack";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";

const HOLIDAY_TYPES = ["National", "School", "Vacation"];

const DEFAULT_FORM = {
  name: "",
  date: "",
  endDate: "",
  type: "School",
  description: "",
  allowAttendance: false,
};

const HolidayFormDialog = ({
  open,
  onClose,
  onSave,
  editing,
  loading = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (editing) {
        setForm({
          name: editing.name || "",
          date: editing.date
            ? new Date(editing.date).toISOString().slice(0, 10)
            : "",
          endDate: editing.endDate
            ? new Date(editing.endDate).toISOString().slice(0, 10)
            : "",
          type: editing.type || "School",
          description: editing.description || "",
          allowAttendance: editing.allowAttendance || false,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [open, editing]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      enqueueSnackbar("Holiday name is required", { variant: "warning" });
      return;
    }
    if (!form.date) {
      enqueueSnackbar("Date is required", { variant: "warning" });
      return;
    }
    if (!form.type) {
      enqueueSnackbar("Type is required", { variant: "warning" });
      return;
    }

    // Validate end date
    if (form.endDate && new Date(form.endDate) < new Date(form.date)) {
      enqueueSnackbar("End date must be after start date", {
        variant: "warning",
      });
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      endDate: form.endDate || null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "warning.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BeachAccessOutlinedIcon sx={{ color: "warning.dark" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              {editing ? "Edit Holiday" : "Add New Holiday"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {editing
                ? "Update holiday details"
                : "Create a school, national, or vacation holiday"}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Holiday Name *"
              placeholder="e.g., Independence Day"
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              autoFocus
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="date"
              label="Start Date *"
              fullWidth
              size="small"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="date"
              label="End Date"
              fullWidth
              size="small"
              value={form.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Optional — for multi-day"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Type *</InputLabel>
              <Select
                value={form.type}
                label="Type *"
                onChange={(e) => handleChange("type", e.target.value)}
              >
                {HOLIDAY_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description"
              placeholder="Optional notes..."
              fullWidth
              multiline
              rows={2}
              size="small"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: form.allowAttendance ? "success.50" : "action.hover",
                border: "1px solid",
                borderColor: form.allowAttendance ? "success.light" : "divider",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.allowAttendance}
                    onChange={(e) =>
                      handleChange("allowAttendance", e.target.checked)
                    }
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Allow attendance on this day
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.7rem" }}
                    >
                      Enable for make-up days or special events
                    </Typography>
                  </Box>
                }
                sx={{ m: 0 }}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={
            loading && <CircularProgress size={16} sx={{ color: "white" }} />
          }
          sx={{
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            fontWeight: 700,
            textTransform: "none",
            px: 3,
          }}
        >
          {loading
            ? "Saving..."
            : editing
              ? "Update Holiday"
              : "Create Holiday"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HolidayFormDialog;
