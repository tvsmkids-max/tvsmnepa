import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import ClassIcon from "@mui/icons-material/Class";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import ClassHeader from "./components/ClassHeader";
import ClassFilterBar from "./components/ClassFilterBar";
import ClassTable from "./components/ClassTable";
import ClassFormDialog from "./ClassFormDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";

import useAuth from "../../hooks/useAuth";
import useSessions from "../../hooks/useSessions";
import useDebounce from "../../hooks/useDebounce";
import {
  useClassList,
  useDeleteClass,
  useArchiveClass,
} from "../../hooks/useClasses";
import classApi from "../../api/classApi";

const DEFAULT_FILTERS = {
  search: "",
  session: "",
  isArchived: "false",
};

// ═══════════════════════════════════════════════════════════════════
//  5-DIGIT PIN RESET DIALOG
// ═══════════════════════════════════════════════════════════════════
const PasswordResetDialog = ({ open, cls, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setShowPin(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(pin)) {
      enqueueSnackbar("Class PIN must be exactly 5 digits", {
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      await classApi.resetPassword(cls._id, pin);
      enqueueSnackbar(`PIN updated for ${cls.name}-${cls.section}`, {
        variant: "success",
      });
      onClose();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to reset PIN", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle fontWeight={800}>Reset Class PIN</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Set a new 5-digit login PIN for the{" "}
            <strong>
              {cls?.name}-{cls?.section}
            </strong>{" "}
            account.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="5-Digit PIN"
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d{0,5}$/.test(v)) setPin(v);
            }}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 5,
              autoComplete: "one-time-code",
              style: { letterSpacing: "0.2em", fontWeight: "bold" },
            }}
            required
            helperText="Exactly 5 digits (0–9). Default after create: 88898"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPin((s) => !s)}
                    edge="end"
                    tabIndex={-1}
                  >
                    {showPin ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || pin.length !== 5}
          >
            {saving ? "Saving..." : "Update PIN"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ClassListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { sessions, activeSession } = useSessions();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 400);

  useEffect(() => {
    if (activeSession?._id && !filters.session) {
      const timer = setTimeout(
        () => setFilters((prev) => ({ ...prev, session: activeSession._id })),
        0,
      );
      return () => clearTimeout(timer);
    }
  }, [activeSession, filters.session]);

  const queryParams = useMemo(
    () => ({
      session: filters.session,
      isArchived: filters.isArchived === "true",
      limit: 500,
    }),
    [filters.session, filters.isArchived],
  );

  const {
    data: classesData,
    isLoading,
    isFetching,
    refetch,
  } = useClassList(queryParams, {
    enabled: !!filters.session,
  });

  const allClasses = classesData?.data || [];

  const filteredClasses = useMemo(() => {
    if (!debouncedSearch) return allClasses;
    const s = debouncedSearch.toLowerCase();
    return allClasses.filter(
      (cls) =>
        cls.name?.toLowerCase().includes(s) ||
        cls.section?.toLowerCase().includes(s) ||
        cls.teacherLabel?.toLowerCase().includes(s),
    );
  }, [allClasses, debouncedSearch]);

  const deleteMutation = useDeleteClass();
  const archiveMutation = useArchiveClass();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [resetPasswordClass, setResetPasswordClass] = useState(null);

  const handleFilterChange = useCallback(
    (newFilters) => setFilters(newFilters),
    [],
  );

  const handleResetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, session: activeSession?._id || "" });
  }, [activeSession]);

  const handleSaved = useCallback(() => {
    setFormOpen(false);
    setEditingClass(null);
    refetch();
  }, [refetch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      setConfirmDelete(null);
    } catch {
      // Error handled by hook
    }
  }, [confirmDelete, deleteMutation]);

  const handleConfirmArchive = useCallback(async () => {
    if (!confirmArchive) return;
    try {
      await archiveMutation.mutateAsync({
        id: confirmArchive._id,
        isArchived: !confirmArchive.isArchived,
      });
      setConfirmArchive(null);
    } catch {
      // Error handled by hook
    }
  }, [confirmArchive, archiveMutation]);

  const handleEdit = useCallback((cls) => {
    setEditingClass(cls);
    setFormOpen(true);
  }, []);

  const handleArchive = useCallback((cls) => setConfirmArchive(cls), []);
  const handleDelete = useCallback((cls) => setConfirmDelete(cls), []);
  const handleResetPassword = useCallback(
    (cls) => setResetPasswordClass(cls),
    [],
  );
  const handleViewStudents = useCallback(
    (cls) => navigate(`/students?class=${cls._id}`),
    [navigate],
  );

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <ClassHeader
        total={filteredClasses.length}
        isAdmin={isAdmin}
        onAdd={() => {
          setEditingClass(null);
          setFormOpen(true);
        }}
      />

      <ClassFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        sessions={sessions || []}
      />

      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading classes...
          </Typography>
        </Paper>
      ) : filteredClasses.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<ClassIcon sx={{ fontSize: 64 }} />}
            title="No classes found"
            message={
              filters.search
                ? "Try adjusting your search"
                : filters.isArchived === "true"
                  ? "No archived classes"
                  : "Create your first class to get started"
            }
            actionLabel={
              isAdmin && !filters.search && filters.isArchived !== "true"
                ? "Add Class"
                : filters.search
                  ? "Clear Search"
                  : null
            }
            onAction={
              isAdmin && !filters.search && filters.isArchived !== "true"
                ? () => {
                    setEditingClass(null);
                    setFormOpen(true);
                  }
                : filters.search
                  ? () => handleFilterChange({ ...filters, search: "" })
                  : null
            }
          />
        </Paper>
      ) : (
        <>
          {isFetching && !isLoading && (
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                justifyContent: "center",
                mb: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  px: 2,
                  py: 0.4,
                  borderRadius: 2,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  boxShadow: "0 4px 12px rgba(13,27,62,0.2)",
                }}
              >
                <CircularProgress size={10} sx={{ color: "white" }} />
                Refreshing...
              </Box>
            </Box>
          )}

          {/* Unified Table View for all screen sizes */}
          <ClassTable
            classes={filteredClasses}
            isAdmin={isAdmin}
            onViewStudents={handleViewStudents}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
          />

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{filteredClasses.length}</strong> class
              {filteredClasses.length !== 1 ? "es" : ""}
              {debouncedSearch && (
                <>
                  {" "}
                  matching "<strong>{debouncedSearch}</strong>"
                </>
              )}
            </Typography>
          </Box>
        </>
      )}

      {/* ─── DIALOGS ─── */}
      <ClassFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingClass(null);
        }}
        onSaved={handleSaved}
        editingClass={editingClass}
        sessions={sessions || []}
        activeSession={activeSession}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Class"
        message={`Delete "${confirmDelete?.name} - ${confirmDelete?.section}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmArchive}
        title={confirmArchive?.isArchived ? "Unarchive Class" : "Archive Class"}
        message={
          confirmArchive?.isArchived
            ? `Unarchive "${confirmArchive?.name} - ${confirmArchive?.section}"? It will become active again.`
            : `Archive "${confirmArchive?.name} - ${confirmArchive?.section}"? It will be hidden from active classes.`
        }
        confirmText={confirmArchive?.isArchived ? "Unarchive" : "Archive"}
        severity="warning"
        loading={archiveMutation.isPending}
        onConfirm={handleConfirmArchive}
        onClose={() => setConfirmArchive(null)}
      />
      <PasswordResetDialog
        open={!!resetPasswordClass}
        cls={resetPasswordClass}
        onClose={() => setResetPasswordClass(null)}
      />
    </Box>
  );
};

export default ClassListPage;
