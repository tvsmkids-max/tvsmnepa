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
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import sessionApi from "../../api/sessionApi";

const SessionManagePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await sessionApi.list();
        if (!cancelled) {
          setSessions(res.data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSessions([]);
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed to load", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", startDate: "", endDate: "", description: "" });
    setFormOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      startDate: s.startDate
        ? new Date(s.startDate).toISOString().slice(0, 10)
        : "",
      endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      description: s.description || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      enqueueSnackbar("Please fill all required fields", {
        variant: "warning",
      });
      return;
    }
    setActionLoading(true);
    try {
      if (editing) {
        await sessionApi.update(editing._id, form);
        enqueueSnackbar("Session updated", { variant: "success" });
      } else {
        await sessionApi.create(form);
        enqueueSnackbar("Session created", { variant: "success" });
      }
      setFormOpen(false);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await sessionApi.activate(id);
      enqueueSnackbar("Session activated", { variant: "success" });
      triggerRefresh();
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await sessionApi.delete(confirmDelete._id);
      enqueueSnackbar("Session deleted", { variant: "success" });
      setConfirmDelete(null);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Academic Sessions"
        subtitle="Manage academic year sessions"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Sessions" },
        ]}
        onAction={openCreate}
        actionLabel="Add Session"
      />

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<SchoolOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No sessions yet"
            message="Create your first academic session."
            actionLabel="Create First Session"
            onAction={openCreate}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.default",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Session
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.default",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Start Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.default",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    End Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.default",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.default",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      textAlign: "right",
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow
                    key={s._id}
                    hover
                    sx={{
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>{s.name}</TableCell>
                    <TableCell>
                      {new Date(s.startDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {new Date(s.endDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Chip
                          label="Active"
                          size="small"
                          color="success"
                          icon={<CheckCircleOutlinedIcon />}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          label="Inactive"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {!s.isActive && (
                        <Tooltip title="Set Active">
                          <Button
                            size="small"
                            color="success"
                            variant="outlined"
                            onClick={() => handleActivate(s._id)}
                            sx={{ minWidth: "auto", mr: 0.5, fontWeight: 700 }}
                          >
                            Activate
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEdit(s)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!s.isActive && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setConfirmDelete(s)}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Form Dialog ── */}
      <Dialog
        open={formOpen}
        onClose={actionLoading ? undefined : () => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div">
          <Typography variant="h6" fontWeight={700} component="div">
            {editing ? "Edit Session" : "Create New Session"}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Session Name *"
                placeholder="e.g., 2026-27"
                fullWidth
                size="small"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                helperText="Format: YYYY-YY"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Start Date *"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="End Date *"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
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
        title="Delete Session"
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

export default SessionManagePage;
