import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  Pagination,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import PeopleIcon from "@mui/icons-material/People";

import StudentHeader from "./components/StudentHeader";
import StudentFilterBar from "./components/StudentFilterBar";
import StudentCard from "./components/StudentCard";
import BulkActionToolbar from "./components/BulkActionToolbar";

import StudentFormDialog from "./StudentFormDialog";
import StudentStatusDialog from "./StudentStatusDialog";
import StudentImportDialog from "./StudentImportDialog";
import StudentBulkDeleteDialog from "./StudentBulkDeleteDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";

import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import {
  useStudentList,
  useClasses,
  useSections,
  useDeleteStudent,
} from "../../hooks/useStudents";
import studentApi from "../../api/studentApi";
import { exportStudentsToExcel } from "../../utils/exportUtils";

const ROWS_PER_PAGE = 24;
const MAX_BULK_SELECT = 100;
const EXPORT_LIMIT = 5000;

const DEFAULT_FILTERS = {
  search: "",
  class: "",
  section: "",
  status: "Active",
  gender: "",
  category: "",
  bloodGroup: "",
  page: 0,
};

const StudentListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams] = useSearchParams();

  // ─── FILTERS ───
  const [filters, setFilters] = useState(() => {
    // Initialize from URL params (e.g., /students?class=xxx)
    const classFromUrl = searchParams.get("class");
    return {
      ...DEFAULT_FILTERS,
      class: classFromUrl || "",
    };
  });

  const debouncedSearch = useDebounce(filters.search, 400);

  // Build query params for API
  const queryParams = useMemo(
    () => ({
      page: filters.page + 1,
      limit: ROWS_PER_PAGE,
      search: debouncedSearch,
      status: filters.status,
      ...(filters.class && { class: filters.class }),
      ...(filters.section && { section: filters.section }),
      ...(filters.gender && { gender: filters.gender }),
      ...(filters.category && { category: filters.category }),
      ...(filters.bloodGroup && { bloodGroup: filters.bloodGroup }),
    }),
    [
      filters.page,
      debouncedSearch,
      filters.status,
      filters.class,
      filters.section,
      filters.gender,
      filters.category,
      filters.bloodGroup,
    ],
  );

  // ─── TANSTACK QUERY HOOKS ───
  const {
    data: studentsData,
    isLoading,
    isFetching,
    refetch,
  } = useStudentList(queryParams);

  const { data: classes = [] } = useClasses();
  const { data: sections = [] } = useSections();
  const deleteMutation = useDeleteStudent();

  const students = studentsData?.data || [];
  const pagination = studentsData?.pagination || {
    page: 1,
    total: 0,
    totalPages: 0,
  };

  // ─── DIALOG STATES ───
  const [formOpen, setFormOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusStudent, setStatusStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── BULK SELECTION ───
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ─── EXPORT ───
  const [exporting, setExporting] = useState(false);

  // ─── HANDLERS ───
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handlePageChange = useCallback((event, newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage - 1 }));
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Clear selection on filter change ───
  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    debouncedSearch,
    filters.class,
    filters.section,
    filters.status,
    filters.gender,
    filters.category,
    filters.bloodGroup,
    filters.page,
  ]);

  // ─── SELECTION HANDLERS ───
  const toggleSelect = useCallback(
    (id) => {
      if (!isAdmin) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (next.size >= MAX_BULK_SELECT) {
            enqueueSnackbar(
              `Maximum ${MAX_BULK_SELECT} students can be selected`,
              { variant: "warning" },
            );
            return prev;
          }
          next.add(id);
        }
        return next;
      });
    },
    [isAdmin, enqueueSnackbar],
  );

  const allPageIds = useMemo(() => students.map((s) => s._id), [students]);

  const allPageSelected = useMemo(
    () =>
      allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id)),
    [allPageIds, selectedIds],
  );

  const toggleSelectPage = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of allPageIds) {
          if (next.size >= MAX_BULK_SELECT) {
            enqueueSnackbar(
              `Only ${MAX_BULK_SELECT} students can be selected at once`,
              { variant: "warning" },
            );
            break;
          }
          next.add(id);
        }
        return next;
      });
    }
  }, [allPageSelected, allPageIds, enqueueSnackbar]);

  const enterSelectionMode = useCallback(() => {
    if (!isAdmin) return;
    setSelectionMode(true);
  }, [isAdmin]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s._id)),
    [students, selectedIds],
  );

  // ─── EXPORT (full list or selected) ───
  const handleExportExcel = async () => {
    // If in selection mode and have selections → export only selected
    if (selectionMode && selectedStudents.length > 0) {
      const dateLabel = new Date().toISOString().split("T")[0];
      exportStudentsToExcel(
        selectedStudents,
        `students_selected_${selectedStudents.length}_${dateLabel}`,
      );
      enqueueSnackbar(`${selectedStudents.length} students exported`, {
        variant: "success",
      });
      return;
    }

    // Otherwise → export full filtered list
    if (pagination.total === 0) {
      enqueueSnackbar("No students to export", { variant: "info" });
      return;
    }

    if (pagination.total > EXPORT_LIMIT) {
      enqueueSnackbar(
        `Cannot export more than ${EXPORT_LIMIT} students. Filter further.`,
        { variant: "warning" },
      );
      return;
    }

    setExporting(true);
    try {
      const params = {
        ...queryParams,
        page: 1,
        limit: EXPORT_LIMIT,
      };

      const res = await studentApi.list(params);
      const allStudents = res.data?.data || [];

      if (allStudents.length === 0) {
        enqueueSnackbar("No students to export", { variant: "info" });
        return;
      }

      const className = filters.class
        ? classes.find((c) => c._id === filters.class)
        : null;
      const classLabel = className
        ? `${className.name}_${className.section}_`
        : "all_";
      const statusLabel = filters.status ? `${filters.status}_` : "";
      const dateLabel = new Date().toISOString().split("T")[0];
      const filename = `students_${classLabel}${statusLabel}${dateLabel}`;

      exportStudentsToExcel(allStudents, filename);

      enqueueSnackbar(`${allStudents.length} students exported`, {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Export failed", {
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  // ─── SAVE/DELETE HANDLERS ───
  const handleSaved = () => {
    setFormOpen(false);
    setStatusOpen(false);
    setEditingStudent(null);
    setStatusStudent(null);
    refetch();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete._id);
    setConfirmDelete(null);
  };

  const handleImported = () => {
    setImportOpen(false);
    refetch();
  };

  const handleBulkDeleted = () => {
    exitSelectionMode();
    refetch();
  };

  // ─── CARD ACTION HANDLERS ───
  const handleView = useCallback(
    (student) => {
      navigate(`/students/${student._id}`);
    },
    [navigate],
  );

  const handleEdit = useCallback((student) => {
    setEditingStudent(student);
    setFormOpen(true);
  }, []);

  const handleStatus = useCallback((student) => {
    setStatusStudent(student);
    setStatusOpen(true);
  }, []);

  const handleDelete = useCallback((student) => {
    setConfirmDelete(student);
  }, []);

  const handleAttendance = useCallback(
    (student) => {
      // Navigate to attendance history with student pre-filtered
      navigate(`/attendance/history?student=${student._id}`);
    },
    [navigate],
  );

  const handleCardClick = useCallback(
    (student) => {
      if (selectionMode && isAdmin) {
        toggleSelect(student._id);
        return;
      }
      navigate(`/students/${student._id}`);
    },
    [selectionMode, isAdmin, toggleSelect, navigate],
  );

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* ─── PROFESSIONAL HEADER ─── */}
      <StudentHeader
        total={pagination.total}
        isAdmin={isAdmin}
        selectionMode={selectionMode}
        exporting={exporting}
        exportDisabled={pagination.total === 0}
        onAdd={() => {
          setEditingStudent(null);
          setFormOpen(true);
        }}
        onImport={() => setImportOpen(true)}
        onExport={handleExportExcel}
        onSelectMode={enterSelectionMode}
      />

      {/* ─── BULK ACTION TOOLBAR ─── */}
      <BulkActionToolbar
        show={selectionMode}
        selectedCount={selectedIds.size}
        maxSelect={MAX_BULK_SELECT}
        allPageSelected={allPageSelected}
        onClose={exitSelectionMode}
        onSelectAllPage={toggleSelectPage}
        onDelete={() => setBulkDeleteOpen(true)}
        onExport={handleExportExcel}
      />

      {/* ─── FILTER BAR ─── */}
      <StudentFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        classes={classes}
        sections={sections}
      />

      {/* ─── LOADING / EMPTY / GRID ─── */}
      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading students...
          </Typography>
        </Paper>
      ) : students.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<PeopleIcon sx={{ fontSize: 64 }} />}
            title="No students found"
            message={
              filters.search ||
              filters.class ||
              filters.section ||
              filters.gender ||
              filters.category ||
              filters.bloodGroup
                ? "Try adjusting your filters"
                : "Add your first student"
            }
            actionLabel={
              !filters.search && !filters.class
                ? "Add Student"
                : "Reset Filters"
            }
            onAction={() => {
              if (!filters.search && !filters.class) {
                setEditingStudent(null);
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

          {/* ─── STUDENT GRID ─── */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {students.map((student) => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={student._id}>
                <StudentCard
                  student={student}
                  isSelected={selectedIds.has(student._id)}
                  selectionMode={selectionMode}
                  isAdmin={isAdmin}
                  onView={handleView}
                  onEdit={handleEdit}
                  onStatus={handleStatus}
                  onDelete={handleDelete}
                  onAttendance={handleAttendance}
                  onToggleSelect={toggleSelect}
                  onCardClick={handleCardClick}
                />
              </Grid>
            ))}
          </Grid>

          {/* ─── PAGINATION ─── */}
          {pagination.totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 4,
                mb: 2,
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Pagination
                  count={pagination.totalPages}
                  page={filters.page + 1}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                  showFirstButton={!isMobile}
                  showLastButton={!isMobile}
                  siblingCount={isMobile ? 0 : 1}
                  boundaryCount={isMobile ? 1 : 2}
                />
              </Paper>
            </Box>
          )}

          {/* Pagination Info */}
          <Box sx={{ textAlign: "center", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filters.page * ROWS_PER_PAGE + 1} -{" "}
              {Math.min((filters.page + 1) * ROWS_PER_PAGE, pagination.total)}{" "}
              of <strong>{pagination.total}</strong> students
            </Typography>
          </Box>
        </>
      )}

      {/* ─── DIALOGS ─── */}
      <StudentFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingStudent(null);
        }}
        onSaved={handleSaved}
        editingStudent={editingStudent}
        classes={classes}
      />

      <StudentStatusDialog
        open={statusOpen}
        onClose={() => {
          setStatusOpen(false);
          setStatusStudent(null);
        }}
        onSaved={handleSaved}
        student={statusStudent}
      />

      <StudentImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Student"
        message={`Permanently delete ${confirmDelete?.name}? Attendance history will also be removed.`}
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />

      <StudentBulkDeleteDialog
        open={bulkDeleteOpen}
        selectedStudents={selectedStudents}
        onClose={() => setBulkDeleteOpen(false)}
        onDeleted={handleBulkDeleted}
      />
    </Box>
  );
};

export default StudentListPage;
