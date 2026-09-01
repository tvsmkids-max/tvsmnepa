import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  Paper,
  Stack,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
  TablePagination, // ✅ NEW: Pagination import
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import PeopleIcon from "@mui/icons-material/People";

import StudentHeader from "./components/StudentHeader";
import StudentFilterBar from "./components/StudentFilterBar";
import StudentCard from "./components/StudentCard";
import StudentTable from "./components/StudentTable";
import BulkActionToolbar from "./components/BulkActionToolbar";
import MobileSortMenu from "./components/MobileSortMenu";

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

const MAX_BULK_SELECT = 100;

const DEFAULT_FILTERS = {
  search: "",
  class: "",
  section: "",
  status: "Active",
  gender: "",
  category: "",
  bloodGroup: "",
};

const DEFAULT_SORT = { sortBy: "class", sortOrder: "asc" };

const getClassRank = (cls) => {
  if (!cls?.name) return 999;
  const name = cls.name.toString().trim().toUpperCase();
  if (/^NUR/.test(name) || name === "NURSERY") return 1;
  if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
    return 2;
  if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
    return 3;
  if (/^PRE/.test(name) || name === "PLAYGROUP" || name === "PLAY") return 0;
  const numMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 12) return 10 + num;
  }
  return 999;
};

const StudentListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => {
    const classFromUrl = searchParams.get("class");
    return { ...DEFAULT_FILTERS, class: classFromUrl || "" };
  });

  const [sortBy, setSortBy] = useState(DEFAULT_SORT.sortBy);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT.sortOrder);

  // ✅ Pagination States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const debouncedSearch = useDebounce(filters.search, 400);

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 5000, // Load all for smart client-side sorting
      search: debouncedSearch,
      status: filters.status,
      ...(filters.class && { class: filters.class }),
      ...(filters.section && { section: filters.section }),
      ...(filters.gender && { gender: filters.gender }),
      ...(filters.category && { category: filters.category }),
      ...(filters.bloodGroup && { bloodGroup: filters.bloodGroup }),
    }),
    [
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

  const allStudents = studentsData?.data || [];
  const paginationTotal = studentsData?.pagination?.total || 0;

  const sortedStudents = useMemo(() => {
    const list = [...allStudents];

    list.sort((a, b) => {
      if (sortBy === "class") {
        const rankA = getClassRank(a.class);
        const rankB = getClassRank(b.class);
        if (rankA !== rankB)
          return sortOrder === "asc" ? rankA - rankB : rankB - rankA;

        const secA = (a.class?.section || "").toLowerCase();
        const secB = (b.class?.section || "").toLowerCase();
        if (secA !== secB)
          return sortOrder === "asc"
            ? secA.localeCompare(secB)
            : secB.localeCompare(secA);

        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }

      let aVal, bVal;
      switch (sortBy) {
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
  }, [allStudents, sortBy, sortOrder]);

  // ✅ Client-Side Pagination Slicing
  const paginatedStudents = useMemo(() => {
    if (!isAdmin) return sortedStudents; // Teachers see all (~40) on 1 page
    if (rowsPerPage === -1) return sortedStudents; // 'All' option selected
    return sortedStudents.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedStudents, page, rowsPerPage, isAdmin]);

  const handleSort = useCallback((field) => {
    if (field === "serialNumber") return;
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

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

  // Reset page to 0 when filters or search change
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
  }, [debouncedSearch, filters.class, filters.section, filters.status]);

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

  const allPageIds = useMemo(
    () => paginatedStudents.map((s) => s._id),
    [paginatedStudents],
  );
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
    () => sortedStudents.filter((s) => selectedIds.has(s._id)),
    [sortedStudents, selectedIds],
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

    if (paginationTotal === 0) {
      enqueueSnackbar("No students to export", { variant: "info" });
      return;
    }

    setExporting(true);
    try {
      const className = filters.class
        ? classes.find((c) => c._id === filters.class)
        : null;
      const classLabel = className
        ? `${className.name}_${className.section}_`
        : "all_";
      const statusLabel = filters.status ? `${filters.status}_` : "";
      const dateLabel = new Date().toISOString().split("T")[0];
      const filename = `students_${classLabel}${statusLabel}${dateLabel}`;

      exportStudentsToExcel(sortedStudents, filename);
      enqueueSnackbar(`✅ Exported ${sortedStudents.length} students`, {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar("Export failed", { variant: "error" });
    } finally {
      setExporting(false);
    }
  };

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

  const handleConfirmQuickToggle = async () => {
    if (!confirmQuickToggle) return;
    const { student, newStatus } = confirmQuickToggle;
    const remark =
      newStatus === "Inactive"
        ? "Marked inactive via quick toggle"
        : "Reactivated via quick toggle";
    try {
      await updateStatusMutation.mutateAsync({
        id: student._id,
        data: {
          status: newStatus,
          statusRemark: remark,
          statusDate: new Date().toISOString(),
        },
      });
      setConfirmQuickToggle(null);
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to update status",
        { variant: "error" },
      );
    }
  };

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
        total={sortedStudents.length}
        isAdmin={isAdmin}
        selectionMode={selectionMode}
        exporting={exporting}
        exportDisabled={sortedStudents.length === 0}
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

      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading students...
          </Typography>
        </Paper>
      ) : sortedStudents.length === 0 ? (
        <Paper sx={{ borderRadius: 2 }}>
          <EmptyState
            icon={<PeopleIcon sx={{ fontSize: 64 }} />}
            title="No students found"
            message="Try adjusting your filters or search."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        </Paper>
      ) : (
        <Paper
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {isFetching && (
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  px: 2,
                  py: 0.4,
                  borderRadius: "0 0 8px 8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                }}
              >
                <CircularProgress size={10} sx={{ color: "white" }} />{" "}
                Refreshing...
              </Box>
            </Box>
          )}

          {!isMobile ? (
            <StudentTable
              students={paginatedStudents} // ✅ Render paginated slice
              isAdmin={isAdmin}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectPage}
              allPageSelected={allPageSelected}
              onRowClick={handleRowClick}
              onView={(s) => navigate(`/students/${s._id}`)}
              onEdit={(s) => {
                setEditingStudent(s);
                setFormOpen(true);
              }}
              onStatus={(s) => {
                setStatusStudent(s);
                setStatusOpen(true);
              }}
              onQuickToggleStatus={(s) =>
                setConfirmQuickToggle({
                  student: s,
                  newStatus: s.status === "Active" ? "Inactive" : "Active",
                })
              }
              onDelete={(s) => setConfirmDelete(s)}
              onAttendance={(s) =>
                navigate(`/attendance/history?student=${s._id}`)
              }
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <>
              <MobileSortMenu
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                totalCount={sortedStudents.length}
              />
              <Stack spacing={0}>
                {paginatedStudents.map((student, index) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    serialNumber={page * rowsPerPage + index + 1}
                    isSelected={selectedIds.has(student._id)}
                    selectionMode={selectionMode}
                    isAdmin={isAdmin}
                    onView={(s) => navigate(`/students/${s._id}`)}
                    onEdit={(s) => {
                      setEditingStudent(s);
                      setFormOpen(true);
                    }}
                    onStatus={(s) => {
                      setStatusStudent(s);
                      setStatusOpen(true);
                    }}
                    onQuickToggleStatus={(s) =>
                      setConfirmQuickToggle({
                        student: s,
                        newStatus:
                          s.status === "Active" ? "Inactive" : "Active",
                      })
                    }
                    onDelete={(s) => setConfirmDelete(s)}
                    onAttendance={(s) =>
                      navigate(`/attendance/history?student=${s._id}`)
                    }
                    onToggleSelect={toggleSelect}
                    onCardClick={handleRowClick}
                  />
                ))}
              </Stack>
            </>
          )}

          {/* ✅ PAGINATION CONTROLS (Admin Only) */}
          {isAdmin && (
            <TablePagination
              component="div"
              count={sortedStudents.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[50, 100, 500, { label: "All", value: -1 }]}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          )}
        </Paper>
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
        onImported={() => {
          setImportOpen(false);
          refetch();
        }}
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
        onDeleted={() => {
          exitSelectionMode();
          refetch();
        }}
      />
    </Box>
  );
};

export default StudentListPage;
