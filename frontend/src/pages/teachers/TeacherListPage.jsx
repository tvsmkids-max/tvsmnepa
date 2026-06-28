import React, { useState, useCallback, useMemo } from "react";
import { Box, Paper, Grid, CircularProgress, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

import TeacherHeader from "./components/TeacherHeader";
import TeacherFilterBar from "./components/TeacherFilterBar";
import TeacherCard from "./components/TeacherCard";

import TeacherFormDialog from "./TeacherFormDialog";
import TeacherResetPasswordDialog from "./TeacherResetPasswordDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";

import useDebounce from "../../hooks/useDebounce";
import { useTeacherList, useDeleteTeacher } from "../../hooks/useTeachers";

const DEFAULT_FILTERS = {
  search: "",
  status: "all",
  gender: "",
};

const TeacherListPage = () => {
  // ─── FILTERS ───
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 400);

  // Build query params
  const queryParams = useMemo(
    () => ({
      search: debouncedSearch,
      limit: 100,
    }),
    [debouncedSearch],
  );

  // ─── TANSTACK QUERY ───
  const {
    data: teachersData,
    isLoading,
    isFetching,
    refetch,
  } = useTeacherList(queryParams);

  const allTeachers = teachersData?.data || [];

  // ─── CLIENT-SIDE FILTERING (status + gender) ───
  const filteredTeachers = useMemo(() => {
    return allTeachers.filter((t) => {
      // Status filter
      if (filters.status === "active" && !t.isActive) return false;
      if (filters.status === "inactive" && t.isActive) return false;

      // Gender filter
      if (filters.gender && t.gender !== filters.gender) return false;

      return true;
    });
  }, [allTeachers, filters.status, filters.gender]);

  // ─── MUTATIONS ───
  const deleteMutation = useDeleteTeacher();

  // ─── DIALOG STATES ───
  const [formOpen, setFormOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [resetTeacher, setResetTeacher] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── HANDLERS ───
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleSaved = useCallback(() => {
    setFormOpen(false);
    setEditingTeacher(null);
    refetch();
  }, [refetch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      setConfirmDelete(null);
    } catch {
      // Error already handled
    }
  }, [confirmDelete, deleteMutation]);

  const handleResetSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  // Card actions
  const handleEdit = useCallback((teacher) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  }, []);

  const handleResetPassword = useCallback((teacher) => {
    setResetTeacher(teacher);
    setResetOpen(true);
  }, []);

  const handleDelete = useCallback((teacher) => {
    setConfirmDelete(teacher);
  }, []);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* HEADER */}
      <TeacherHeader
        total={filteredTeachers.length}
        onAdd={() => {
          setEditingTeacher(null);
          setFormOpen(true);
        }}
      />

      {/* FILTERS */}
      <TeacherFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* BODY */}
      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading teachers...
          </Typography>
        </Paper>
      ) : filteredTeachers.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<PersonIcon sx={{ fontSize: 64 }} />}
            title="No teachers found"
            message={
              filters.search || filters.status !== "all" || filters.gender
                ? "Try adjusting your filters"
                : "Add your first teacher to get started"
            }
            actionLabel={
              !filters.search && filters.status === "all" && !filters.gender
                ? "Add Teacher"
                : "Reset Filters"
            }
            onAction={() => {
              if (
                !filters.search &&
                filters.status === "all" &&
                !filters.gender
              ) {
                setEditingTeacher(null);
                setFormOpen(true);
              } else {
                handleResetFilters();
              }
            }}
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

          {/* TEACHER GRID */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {filteredTeachers.map((teacher) => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={teacher._id}>
                <TeacherCard
                  teacher={teacher}
                  onEdit={handleEdit}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>

          {/* Count footer */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{filteredTeachers.length}</strong> teacher
              {filteredTeachers.length !== 1 ? "s" : ""}
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
      <TeacherFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTeacher(null);
        }}
        onSaved={handleSaved}
        editingTeacher={editingTeacher}
      />

      <TeacherResetPasswordDialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetTeacher(null);
        }}
        teacher={resetTeacher}
        onSuccess={handleResetSuccess}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Teacher"
        message={`Delete ${confirmDelete?.name}? User account will also be deleted permanently. This cannot be undone.`}
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
};

export default TeacherListPage;
