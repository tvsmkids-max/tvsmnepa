import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

import TeacherHeader from "./components/TeacherHeader";
import TeacherFilterBar from "./components/TeacherFilterBar";
import TeacherCard from "./components/TeacherCard";
import TeacherTable from "./components/TeacherTable";

import TeacherFormDialog from "./TeacherFormDialog";
import TeacherResetPasswordDialog from "./TeacherResetPasswordDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";

import useDebounce from "../../hooks/useDebounce";
import { useTeacherList, useDeleteTeacher } from "../../hooks/useTeachers";
import { getClassSortRank } from "../../utils/classSort";

const DEFAULT_FILTERS = {
  search: "",
  status: "all",
  gender: "",
};

const DEFAULT_SORT = { sortBy: "class", sortOrder: "asc" };

// ═══════════════════════════════════════════════════════════════════
//  PRIMARY CLASS SORTING FOR TEACHERS (Nursery -> 12th)
// ═══════════════════════════════════════════════════════════════════
const getTeacherPrimaryClassRank = (teacher) => {
  const classes = teacher.assignedClasses || [];
  if (classes.length === 0) return 9999; // Push unassigned to the bottom

  // Maps ranks and finds the highest priority class level
  const ranks = classes.map((c) => getClassSortRank(c.name));
  return Math.min(...ranks);
};

const TeacherListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ─── SORT & FILTERS ───
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT.sortBy);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT.sortOrder);
  const debouncedSearch = useDebounce(filters.search, 400);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch,
      limit: 100,
    }),
    [debouncedSearch],
  );

  const {
    data: teachersData,
    isLoading,
    isFetching,
    refetch,
  } = useTeacherList(queryParams);

  const allTeachers = teachersData?.data || [];

  // ─── ADVANCED MULTI-COLUMN SORTING & FILTERING ───
  const sortedAndFilteredTeachers = useMemo(() => {
    let list = [...allTeachers];

    // Filter status & gender
    list = list.filter((t) => {
      if (filters.status === "active" && !t.isActive) return false;
      if (filters.status === "inactive" && t.isActive) return false;
      if (filters.gender && t.gender !== filters.gender) return false;
      return true;
    });

    // Custom client-side sorting
    list.sort((a, b) => {
      if (sortBy === "class") {
        const rankA = getTeacherPrimaryClassRank(a);
        const rankB = getTeacherPrimaryClassRank(b);
        if (rankA !== rankB) {
          return sortOrder === "asc" ? rankA - rankB : rankB - rankA;
        }
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === "name") {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }

      if (sortBy === "employeeId") {
        const idA = (a.employeeId || "").toLowerCase();
        const idB = (b.employeeId || "").toLowerCase();
        return sortOrder === "asc"
          ? idA.localeCompare(idB)
          : idB.localeCompare(idA);
      }

      return 0;
    });

    return list;
  }, [allTeachers, filters.status, filters.gender, sortBy, sortOrder]);

  const handleSort = useCallback((field) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

  const deleteMutation = useDeleteTeacher();

  // ─── DIALOG STATES ───
  const [formOpen, setFormOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [resetTeacher, setResetTeacher] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
      // Caught silents
    }
  }, [confirmDelete, deleteMutation]);

  const handleResetSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

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
      <TeacherHeader
        total={sortedAndFilteredTeachers.length}
        onAdd={() => {
          setEditingTeacher(null);
          setFormOpen(true);
        }}
      />

      <TeacherFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading teachers...
          </Typography>
        </Paper>
      ) : sortedAndFilteredTeachers.length === 0 ? (
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

          {/* DUAL RESPONSIVE VIEW GRID */}
          {!isMobile ? (
            <TeacherTable
              teachers={sortedAndFilteredTeachers}
              onEdit={handleEdit}
              onResetPassword={handleResetPassword}
              onDelete={handleDelete}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <Grid container spacing={1.5}>
              {sortedAndFilteredTeachers.map((teacher) => (
                <Grid item xs={12} sm={6} key={teacher._id}>
                  <TeacherCard
                    teacher={teacher}
                    onEdit={handleEdit}
                    onResetPassword={handleResetPassword}
                    onDelete={handleDelete}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{sortedAndFilteredTeachers.length}</strong>{" "}
              teacher
              {sortedAndFilteredTeachers.length !== 1 ? "s" : ""}
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
