import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
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
} from "@mui/material";
import { useSnackbar } from "notistack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import holidayApi from "../../api/holidayApi";
import useSessions from "../../hooks/useSessions";
import useAuth from "../../hooks/useAuth";

const HOLIDAY_TYPES = ["National", "School", "Vacation"];
const TYPE_COLORS = {
  National: "#DC2626",
  School: "#1E4D98",
  Vacation: "#F5A623",
};

const HolidayManagePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const { activeSession } = useSessions();

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    name: "",
    date: "",
    endDate: "",
    type: "School",
    description: "",
    allowAttendance: false,
  });

  useEffect(() => {
    if (!activeSession?._id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await holidayApi.list({ session: activeSession._id });
        if (!cancelled) {
          setHolidays(res.data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setHolidays([]);
          setLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load holidays",
            { variant: "error" },
          );
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeSession?._id, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      date: "",
      endDate: "",
      type: "School",
      description: "",
      allowAttendance: false,
    });
    setFormOpen(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({
      name: h.name,
      date: h.date ? new Date(h.date).toISOString().slice(0, 10) : "",
      endDate: h.endDate ? new Date(h.endDate).toISOString().slice(0, 10) : "",
      type: h.type,
      description: h.description || "",
      allowAttendance: h.allowAttendance || false,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date || !form.type) {
      enqueueSnackbar("Please fill required fields", { variant: "warning" });
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        session: activeSession._id,
        endDate: form.endDate || null,
      };

      if (editing) {
        delete payload.session;
        await holidayApi.update(editing._id, payload);
        enqueueSnackbar("Holiday updated", { variant: "success" });
      } else {
        await holidayApi.create(payload);
        enqueueSnackbar("Holiday created", { variant: "success" });
      }
      setFormOpen(false);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await holidayApi.delete(confirmDelete._id);
      enqueueSnackbar("Holiday deleted", { variant: "success" });
      setConfirmDelete(null);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to delete", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!activeSession) {
    return (
      <Box>
        <PageHeader
          title="Holidays"
          subtitle="Manage school holidays and vacations"
        />
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<BeachAccessIcon sx={{ fontSize: 64 }} />}
            title="No active session"
            message="Create an active academic session first."
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Holidays"
        subtitle={`Manage holidays for ${activeSession.name}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Holidays" },
        ]}
        onAction={isAdmin ? openCreate : null}
        actionLabel="Add Holiday"
      />

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : holidays.length === 0 ? (
          <EmptyState
            icon={<BeachAccessIcon sx={{ fontSize: 64 }} />}
            title="No holidays added"
            message="Add school, national, or vacation holidays."
            actionLabel={isAdmin ? "Add First Holiday" : null}
            onAction={isAdmin ? openCreate : null}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Holiday</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
                  {isAdmin && (
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h._id} hover>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{h.name}</Box>
                      {h.description && (
                        <Box
                          sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                        >
                          {h.description}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>
                        {new Date(h.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Box>
                      {h.endDate && (
                        <Box
                          sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                        >
                          to{" "}
                          {new Date(h.endDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={h.type}
                        size="small"
                        sx={{
                          bgcolor: TYPE_COLORS[h.type] + "15",
                          color: TYPE_COLORS[h.type],
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {h.allowAttendance ? (
                        <Chip
                          label="Allowed"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Blocked"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell sx={{ textAlign: "right" }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEdit(h)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setConfirmDelete(h)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={formOpen}
        onClose={actionLoading ? undefined : () => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div">
          <Typography variant="h6" fontWeight={700} component="div">
            {editing ? "Edit Holiday" : "Add Holiday"}
          </Typography>
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date *"
                fullWidth
                size="small"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="End Date (for ranges)"
                fullWidth
                size="small"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Optional — for multi-day vacations"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select
                  value={form.type}
                  label="Type *"
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                fullWidth
                multiline
                rows={2}
                size="small"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.allowAttendance}
                    onChange={(e) =>
                      setForm({ ...form, allowAttendance: e.target.checked })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Allow attendance on this day
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enable if school operates on this holiday (e.g., make-up
                      day)
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={actionLoading}
            startIcon={
              actionLoading && (
                <CircularProgress size={16} sx={{ color: "white" }} />
              )
            }
          >
            {editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Holiday"
        message={`Delete "${confirmDelete?.name}"?`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
};

export default HolidayManagePage;
