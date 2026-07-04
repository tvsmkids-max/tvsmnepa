import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  Box,
  Paper,
  Stack,
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
import StudentTable from "./components/StudentTable";
import BulkActionToolbar from "./components/BulkActionToolbar";
import MobileSortMenu from "./components/MobileSortMenu"; // ✅ NEW

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
  useUpdateStudentStatus,
} from "../../hooks/useStudents";
import studentApi from "../../api/studentApi";
import { exportStudentsToExcel } from "../../utils/exportUtils";

const PAGE_SIZE = 30;
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
};

const DEFAULT_SORT = { sortBy: "name", sortOrder: "asc" };

const StudentListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => {
    const classFromUrl = searchParams.get("class");
    return {
      ...DEFAULT_FILTERS,
      class: classFromUrl || "",
    };
  });

  const [sortBy, setSortBy] = useState(DEFAULT_SORT.sortBy);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT.sortOrder);

  const debouncedSearch = useDebounce(filters.search, 400);

  const [page, setPage] = useState(1);
  const [accumulatedStudents, setAccumulatedStudents] = useState([]);
  const observerTarget = useRef(null);

  useEffect(() => {
    setPage(1);
    setAccumulatedStudents([]);
  }, [
    debouncedSearch,
    filters.status,
    filters.class,
    filters.section,
    filters.gender,
    filters.category,
    filters.bloodGroup,
  ]);

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch,
      status: filters.status,
      ...(filters.class && { class: filters.class }),
      ...(filters.section && { section: filters.section }),
      ...(filters.gender && { gender: filters.gender }),
      ...(filters.category && { category: filters.category }),
      ...(filters.bloodGroup && { bloodGroup: filters.bloodGroup }),
    }),
    [
      page,
      debouncedSearch,
      filters.status,
      filters.class,
      filters.section,
      filters.gender,
      filters.category,
      filters.bloodGroup,
    ],
  );

  const {
    data: studentsData,
    isLoading,
    isFetching,
    refetch,
  } = useStudentList(queryParams);

  const { data: classes = [] } = useClasses();
  const { data: sections = [] } = useSections();
  const deleteMutation = useDeleteStudent();
  const updateStatusMutation = useUpdateStudentStatus();

  const pagination = studentsData?.pagination || {
    page: 1,
    total: 0,
    totalPages: 0,
  };

  useEffect(() => {
    if (!studentsData?.data) return;
    if (page === 1) {
      setAccumulatedStudents(studentsData.data);
    } else {
      setAccumulatedStudents((prev) => {
        const existingIds = new Set(prev.map((s) => s._id));
        const newStudents = studentsData.data.filter(
          (s) => !existingIds.has(s._id),
        );
        return [...prev, ...newStudents];
      });
    }
  }, [studentsData, page]);

  const sortedStudents = useMemo(() => {
    const list = [...accumulatedStudents];
    list.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case "rollNumber":
          aVal = parseInt(a.rollNumber, 10) || 0;
          bVal = parseInt(b.rollNumber, 10) || 0;
          break;
        case "scholarNumber":
          aVal = a.scholarNumber?.toLowerCase() || "";
          bVal = b.scholarNumber?.toLowerCase() || "";
          break;
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "fatherName":
          aVal = a.fatherName?.toLowerCase() || "";
          bVal = b.fatherName?.toLowerCase() || "";
          break;
        case "motherName":
          aVal = a.motherName?.toLowerCase() || "";
          bVal = b.motherName?.toLowerCase() || "";
          break;
        case "dob":
          aVal = a.dob ? new Date(a.dob).getTime() : 0;
          bVal = b.dob ? new Date(b.dob).getTime() : 0;
          break;
        case "mobile":
          aVal = a.mobile || "";
          bVal = b.mobile || "";
          break;
        case "class":
          aVal =
            `${a.class?.name || ""}-${a.class?.section || ""}`.toLowerCase();
          bVal =
            `${b.class?.name || ""}-${b.class?.section || ""}`.toLowerCase();
          break;
        case "status":
          aVal = a.status?.toLowerCase() || "";
          bVal = b.status?.toLowerCase() || "";
          break;
        default:
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [accumulatedStudents, sortBy, sortOrder]);

  const students = sortedStudents;
  const hasMore = page < pagination.totalPages;

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

  useEffect(() => {
    if (!hasMore || isFetching || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, isFetching, isLoading]);

  const [formOpen, setFormOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusStudent, setStatusStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmQuickToggle, setConfirmQuickToggle] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

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
  ]);

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

  const handleExportExcel = async () => {
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
      const params = { ...queryParams, page: 1, limit: EXPORT_LIMIT };
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

  const handleSaved = () => {
    setFormOpen(false);
    setStatusOpen(false);
    setEditingStudent(null);
    setStatusStudent(null);
    setPage(1);
    setAccumulatedStudents([]);
    refetch();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete._id);
    setAccumulatedStudents((prev) =>
      prev.filter((s) => s._id !== confirmDelete._id),
    );
    setConfirmDelete(null);
  };

  const handleConfirmQuickToggle = async () => {
    if (!confirmQuickToggle) return;
    const { student, newStatus } = confirmQuickToggle;

    // ✅ Auto-generate a meaningful remark (backend requires it for Inactive)
    const remark =
      newStatus === "Inactive"
        ? "Marked inactive via quick toggle"
        : "Reactivated via quick toggle";

    try {
      await updateStatusMutation.mutateAsync({
        id: student._id,
        data: {
          status: newStatus,
          statusRemark: remark, // ✅ Auto-filled
          statusDate: new Date().toISOString(), // ✅ Today's date
        },
      });

      setAccumulatedStudents((prev) =>
        prev.map((s) =>
          s._id === student._id ? { ...s, status: newStatus } : s,
        ),
      );

      setConfirmQuickToggle(null);
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to update status",
        { variant: "error" },
      );
    }
  };

  const handleImported = () => {
    setImportOpen(false);
    setPage(1);
    setAccumulatedStudents([]);
    refetch();
  };

  const handleBulkDeleted = () => {
    exitSelectionMode();
    setPage(1);
    setAccumulatedStudents([]);
    refetch();
  };

  const handleView = useCallback(
    (student) => navigate(`/students/${student._id}`),
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

  const handleQuickToggleStatus = useCallback((student) => {
    const newStatus = student.status === "Active" ? "Inactive" : "Active";
    setConfirmQuickToggle({ student, newStatus });
  }, []);

  const handleDelete = useCallback((student) => {
    setConfirmDelete(student);
  }, []);

  const handleAttendance = useCallback(
    (student) => navigate(`/attendance/history?student=${student._id}`),
    [navigate],
  );

  const handleRowClick = useCallback(
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

      <StudentFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        classes={classes}
        sections={sections}
      />

      {isLoading && students.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading students...
          </Typography>
        </Paper>
      ) : students.length === 0 ? (
        <Paper sx={{ borderRadius: 2 }}>
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
          {!isMobile ? (
            /* ═══ DESKTOP: TABLE ═══ */
            <StudentTable
              students={students}
              isAdmin={isAdmin}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectPage}
              allPageSelected={allPageSelected}
              onRowClick={handleRowClick}
              onView={handleView}
              onEdit={handleEdit}
              onStatus={handleStatus}
              onQuickToggleStatus={handleQuickToggleStatus}
              onDelete={handleDelete}
              onAttendance={handleAttendance}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            /* ═══ MOBILE: CARDS with SORT BUTTON ═══ */
            <>
              {/* ✅ NEW: Mobile Sort Menu */}
              <MobileSortMenu
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                totalCount={pagination.total}
              />

              <Stack spacing={1.25}>
                {students.map((student) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    isSelected={selectedIds.has(student._id)}
                    selectionMode={selectionMode}
                    isAdmin={isAdmin}
                    onView={handleView}
                    onEdit={handleEdit}
                    onStatus={handleStatus}
                    onQuickToggleStatus={handleQuickToggleStatus}
                    onDelete={handleDelete}
                    onAttendance={handleAttendance}
                    onToggleSelect={toggleSelect}
                    onCardClick={handleRowClick}
                  />
                ))}
              </Stack>
            </>
          )}

          <Box
            ref={observerTarget}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 3,
              minHeight: 60,
            }}
          >
            {isFetching && page > 1 ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="caption" color="text.secondary">
                  Loading more students...
                </Typography>
              </Stack>
            ) : hasMore ? (
              <Typography variant="caption" color="text.secondary">
                Scroll down to load more
              </Typography>
            ) : (
              <Stack spacing={0.5} alignItems="center">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  ✓ All {pagination.total} students loaded
                </Typography>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ fontSize: "0.7rem" }}
                >
                  Showing {students.length} of {pagination.total}
                </Typography>
              </Stack>
            )}
          </Box>
        </>
      )}

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

      <ConfirmDialog
        open={!!confirmQuickToggle}
        title={
          confirmQuickToggle?.newStatus === "Inactive"
            ? "Mark Inactive?"
            : "Mark Active?"
        }
        message={
          confirmQuickToggle
            ? `Change status of ${confirmQuickToggle.student.name} to ${confirmQuickToggle.newStatus}?`
            : ""
        }
        confirmText={
          confirmQuickToggle?.newStatus === "Inactive"
            ? "Mark Inactive"
            : "Mark Active"
        }
        severity={
          confirmQuickToggle?.newStatus === "Inactive" ? "warning" : "success"
        }
        loading={updateStatusMutation.isPending}
        onConfirm={handleConfirmQuickToggle}
        onClose={() => setConfirmQuickToggle(null)}
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
