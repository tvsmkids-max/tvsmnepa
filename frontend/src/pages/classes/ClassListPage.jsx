import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import ClassIcon from "@mui/icons-material/Class";

import ClassHeader from "./components/ClassHeader";
import ClassFilterBar from "./components/ClassFilterBar";
import ClassCard from "./components/ClassCard";

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

const DEFAULT_FILTERS = {
  search: "",
  session: "",
  isArchived: "false",
};

const ClassListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const { sessions, activeSession } = useSessions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ─── FILTERS ───
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 400);

  // Set active session as default when sessions load
  useEffect(() => {
    if (activeSession?._id && !filters.session) {
      const timer = setTimeout(
        () => setFilters((prev) => ({ ...prev, session: activeSession._id })),
        0,
      );
      return () => clearTimeout(timer);
    }
  }, [activeSession, filters.session]);

  // Build query params for API
  const queryParams = useMemo(
    () => ({
      session: filters.session,
      isArchived: filters.isArchived === "true",
      limit: 500,
    }),
    [filters.session, filters.isArchived],
  );

  // ─── TANSTACK QUERY ───
  const {
    data: classesData,
    isLoading,
    isFetching,
    refetch,
  } = useClassList(queryParams, {
    enabled: !!filters.session,
  });

  const allClasses = classesData?.data || [];

  // ─── CLIENT-SIDE SEARCH FILTER ───
  const filteredClasses = useMemo(() => {
    if (!debouncedSearch) return allClasses;
    const s = debouncedSearch.toLowerCase();
    return allClasses.filter(
      (cls) =>
        cls.name?.toLowerCase().includes(s) ||
        cls.section?.toLowerCase().includes(s) ||
        cls.classTeacher?.name?.toLowerCase().includes(s),
    );
  }, [allClasses, debouncedSearch]);

  // ─── MUTATIONS ───
  const deleteMutation = useDeleteClass();
  const archiveMutation = useArchiveClass();

  // ─── DIALOG STATES ───
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  // ─── HANDLERS ───
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      session: activeSession?._id || "",
    });
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
      // Error already handled by mutation
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
      // Error already handled
    }
  }, [confirmArchive, archiveMutation]);

  // ─── CARD ACTION HANDLERS ───
  const handleEdit = useCallback((cls) => {
    setEditingClass(cls);
    setFormOpen(true);
  }, []);

  const handleArchive = useCallback((cls) => {
    setConfirmArchive(cls);
  }, []);

  const handleDelete = useCallback((cls) => {
    setConfirmDelete(cls);
  }, []);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* HEADER */}
      <ClassHeader
        total={filteredClasses.length}
        isAdmin={isAdmin}
        onAdd={() => {
          setEditingClass(null);
          setFormOpen(true);
        }}
      />

      {/* FILTERS */}
      <ClassFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        sessions={sessions || []}
      />

      {/* BODY */}
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
          {/* Background loading indicator */}
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

          {/* CLASS GRID */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {filteredClasses.map((cls) => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={cls._id}>
                <ClassCard
                  cls={cls}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>

          {/* Count footer */}
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

      {/* DIALOGS */}
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
    </Box>
  );
};

export default ClassListPage;
