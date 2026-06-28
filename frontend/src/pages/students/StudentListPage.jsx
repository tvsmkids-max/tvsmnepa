import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Avatar,
  Chip,
  Card,
  CardContent,
  Button,
  Divider,
  Pagination,
  useMediaQuery,
  useTheme,
  Typography,
  Grid,
  Checkbox,
  Slide,
  Badge,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import ClassIcon from "@mui/icons-material/Class";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddIcon from "@mui/icons-material/Add";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import StatusChip from "../../components/common/StatusChip";
import StudentFormDialog from "./StudentFormDialog";
import StudentStatusDialog from "./StudentStatusDialog";
import StudentImportDialog from "./StudentImportDialog";
import StudentBulkDeleteDialog from "./StudentBulkDeleteDialog";
import studentApi from "../../api/studentApi";
import classApi from "../../api/classApi";
import useDebounce from "../../hooks/useDebounce";
import useAuth from "../../hooks/useAuth";
import { exportStudentsToExcel } from "../../utils/exportUtils";

const MAX_BULK_SELECT = 100;
const EXPORT_LIMIT = 5000;

const StudentListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(24);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusStudent, setStatusStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await classApi.list({ limit: 500 });
        if (!cancelled) setClasses(res.data?.data || []);
      } catch {
        if (!cancelled) setClasses([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch,
          status: filterStatus,
        };
        if (filterClass) params.class = filterClass;
        const res = await studentApi.list(params);
        if (!cancelled) {
          setStudents(res.data?.data || []);
          setTotal(res.data?.pagination?.total || 0);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setTotal(0);
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    rowsPerPage,
    debouncedSearch,
    filterClass,
    filterStatus,
    refreshKey,
    enqueueSnackbar,
  ]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, filterClass, filterStatus, refreshKey]);

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

  const enterSelectionMode = useCallback(
    (studentId) => {
      if (!isAdmin) {
        enqueueSnackbar("Only admin can perform bulk actions", {
          variant: "warning",
        });
        return;
      }
      setSelectionMode(true);
      setSelectedIds(new Set([studentId]));
    },
    [isAdmin, enqueueSnackbar],
  );

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s._id)),
    [students, selectedIds],
  );

  const handleBulkDeleted = () => {
    clearSelection();
    triggerRefresh();
  };

  const handleExportExcel = async () => {
    if (total === 0) {
      enqueueSnackbar("No students to export", { variant: "info" });
      return;
    }
    if (total > EXPORT_LIMIT) {
      enqueueSnackbar(
        `Cannot export more than ${EXPORT_LIMIT} students. Filter further.`,
        { variant: "warning" },
      );
      return;
    }

    setExporting(true);
    try {
      const params = {
        page: 1,
        limit: EXPORT_LIMIT,
        search: debouncedSearch,
        status: filterStatus,
      };
      if (filterClass) params.class = filterClass;

      const res = await studentApi.list(params);
      const allStudents = res.data?.data || [];

      if (allStudents.length === 0) {
        enqueueSnackbar("No students to export", { variant: "info" });
        return;
      }

      const className = filterClass
        ? classes.find((c) => c._id === filterClass)
        : null;
      const classLabel = className
        ? `${className.name}_${className.section}_`
        : "all_";
      const statusLabel = filterStatus ? `${filterStatus}_` : "";
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
    triggerRefresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await studentApi.delete(confirmDelete._id);
      enqueueSnackbar("Student deleted", { variant: "success" });
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

  const handleImported = () => {
    setImportOpen(false);
    triggerRefresh();
  };

  const handleCardClick = (student) => {
    if (selectionMode && isAdmin) {
      toggleSelect(student._id);
      return;
    }
    navigate(`/students/${student._id}`);
  };

  const totalPages = Math.ceil(total / rowsPerPage);

  const getClassColor = (className) => {
    const colors = [
      { bg: "#E0EBFF", text: "#1E4D98" },
      { bg: "#FCE7F3", text: "#9F1239" },
      { bg: "#D1FAE5", text: "#065F46" },
      { bg: "#FEF3C7", text: "#92400E" },
      { bg: "#EDE9FE", text: "#5B21B6" },
      { bg: "#FEE2E2", text: "#991B1B" },
      { bg: "#CFFAFE", text: "#155E75" },
    ];
    if (!className) return colors[0];
    const hash = className.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="Students"
        subtitle={`${total} student${total !== 1 ? "s" : ""}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Students" },
        ]}
        action={
          // ─── MOBILE: Icon buttons in compact row ───
          isXs ? (
            <Stack direction="row" spacing={0.5}>
              {isAdmin && !selectionMode && (
                <Tooltip title="Select multiple">
                  <IconButton
                    size="small"
                    onClick={() => setSelectionMode(true)}
                    disabled={students.length === 0}
                    sx={{
                      bgcolor: "primary.50",
                      color: "primary.main",
                      "&:hover": { bgcolor: "primary.100" },
                    }}
                  >
                    <CheckBoxIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Export Excel">
                <IconButton
                  size="small"
                  onClick={handleExportExcel}
                  disabled={exporting || total === 0 || total > EXPORT_LIMIT}
                  sx={{
                    bgcolor: "success.50",
                    color: "success.dark",
                    "&:hover": { bgcolor: "success.100" },
                  }}
                >
                  {exporting ? (
                    <CircularProgress size={18} />
                  ) : (
                    <FileDownloadIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              {isAdmin && (
                <Tooltip title="Import Excel">
                  <IconButton
                    size="small"
                    onClick={() => setImportOpen(true)}
                    sx={{
                      bgcolor: "info.50",
                      color: "info.dark",
                      "&:hover": { bgcolor: "info.100" },
                    }}
                  >
                    <FileUploadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Add Student">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingStudent(null);
                    setFormOpen(true);
                  }}
                  sx={{
                    background:
                      "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                    color: "white",
                    "&:hover": { opacity: 0.9 },
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            // ─── DESKTOP: Full buttons ───
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {isAdmin && !selectionMode && (
                <Button
                  variant="outlined"
                  startIcon={<CheckBoxIcon />}
                  onClick={() => setSelectionMode(true)}
                  sx={{ fontWeight: 700 }}
                  size={isMobile ? "small" : "medium"}
                  disabled={students.length === 0}
                >
                  Select
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={
                  exporting ? (
                    <CircularProgress size={16} />
                  ) : (
                    <FileDownloadIcon />
                  )
                }
                onClick={handleExportExcel}
                disabled={exporting || total === 0 || total > EXPORT_LIMIT}
                sx={{
                  fontWeight: 700,
                  borderColor: "success.main",
                  color: "success.dark",
                  "&:hover": {
                    borderColor: "success.dark",
                    bgcolor: "success.50",
                  },
                }}
                size={isMobile ? "small" : "medium"}
              >
                {exporting ? "Exporting..." : "Export"}
              </Button>
              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={() => setImportOpen(true)}
                  sx={{ fontWeight: 700 }}
                  size={isMobile ? "small" : "medium"}
                >
                  Import
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingStudent(null);
                  setFormOpen(true);
                }}
                sx={{
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  fontWeight: 700,
                }}
                size={isMobile ? "small" : "medium"}
              >
                Add Student
              </Button>
            </Stack>
          )
        }
      />

      {/* BULK SELECTION TOOLBAR */}
      <Slide direction="down" in={selectionMode} mountOnEnter unmountOnExit>
        <Paper
          sx={{
            p: { xs: 1, sm: 1.5 },
            mb: 2,
            borderRadius: 3,
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            color: "#fff",
            position: "sticky",
            top: 8,
            zIndex: 10,
            boxShadow: "0 8px 24px rgba(13,27,62,0.25)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1.5 }}
            flexWrap="wrap"
            useFlexGap
          >
            <IconButton
              onClick={clearSelection}
              size="small"
              sx={{
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Badge
              badgeContent={selectedIds.size}
              color="warning"
              max={999}
              sx={{ "& .MuiBadge-badge": { fontWeight: 800 } }}
            >
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ fontSize: { xs: "0.8rem", sm: "0.95rem" } }}
              >
                Selected
              </Typography>
            </Badge>

            {!isXs && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {selectedIds.size}/{MAX_BULK_SELECT}
              </Typography>
            )}

            <Box sx={{ flex: 1 }} />

            <Button
              size="small"
              variant="outlined"
              onClick={toggleSelectPage}
              sx={{
                color: "#fff",
                borderColor: "rgba(255,255,255,0.4)",
                fontWeight: 700,
                fontSize: { xs: "0.65rem", sm: "0.78rem" },
                px: { xs: 1, sm: 1.5 },
                minWidth: "auto",
                "&:hover": {
                  borderColor: "#fff",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              {allPageSelected ? "Unselect" : "Page"}
            </Button>

            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={!isXs && <DeleteSweepIcon />}
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selectedIds.size === 0}
              sx={{
                fontWeight: 800,
                fontSize: { xs: "0.7rem", sm: "0.82rem" },
                px: { xs: 1, sm: 2 },
              }}
            >
              {isXs
                ? `Del ${selectedIds.size}`
                : `Delete (${selectedIds.size})`}
            </Button>
          </Stack>
        </Paper>
      </Slide>

      {/* FILTERS */}
      <Paper sx={{ p: { xs: 1.2, sm: 1.5 }, mb: 2, borderRadius: 3 }}>
        <Stack spacing={1.2}>
          <TextField
            placeholder={isXs ? "Search..." : "Search name, scholar #, roll..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={filterClass}
                label="Class"
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="TC">TC</MenuItem>
                <MenuItem value="Transferred">Transferred</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* BODY */}
      {loading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      ) : students.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<PeopleIcon sx={{ fontSize: 64 }} />}
            title="No students found"
            message={
              search || filterClass
                ? "No match for your filters"
                : "Add your first student"
            }
            actionLabel={!search ? "Add Student" : null}
            onAction={
              !search
                ? () => {
                    setEditingStudent(null);
                    setFormOpen(true);
                  }
                : null
            }
          />
        </Paper>
      ) : (
        <>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {students.map((s) => {
              const classKey = `${s.class?.name || ""}-${s.class?.section || ""}`;
              const classColor = getClassColor(classKey);
              const isSelected = selectedIds.has(s._id);

              return (
                <Grid item xs={12} sm={6} lg={4} key={s._id}>
                  <Card
                    onClick={() => handleCardClick(s)}
                    sx={{
                      borderRadius: 3,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "2px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "primary.50" : "background.paper",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: selectionMode
                          ? "scale(0.98)"
                          : "translateY(-3px)",
                        boxShadow: "0 12px 24px rgba(13,27,62,0.12)",
                      },
                      "&:active": {
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {isAdmin && selectionMode && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          zIndex: 2,
                          bgcolor: "#fff",
                          borderRadius: "50%",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(s._id);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          sx={{
                            color: "primary.main",
                            "&.Mui-checked": { color: "primary.main" },
                          }}
                        />
                      </Box>
                    )}

                    {/* Status badge - moved to bottom-right of header to avoid overlap */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        zIndex: 1,
                      }}
                    >
                      <StatusChip status={s.status} size="small" />
                    </Box>

                    <CardContent
                      sx={{
                        p: { xs: 1.8, sm: 2.2 },
                        pb: "0 !important",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* HEADER */}
                      <Stack
                        direction="row"
                        spacing={1.2}
                        sx={{
                          mb: 1.5,
                          pr: 10, // Space for status badge
                          pl: selectionMode ? 4 : 0,
                          transition: "padding 0.2s",
                        }}
                      >
                        <Avatar
                          sx={{
                            width: { xs: 44, sm: 48 },
                            height: { xs: 44, sm: 48 },
                            bgcolor:
                              s.gender === "Female" ? "#EC4899" : "#1E4D98",
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {s.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body1"
                            fontWeight={800}
                            sx={{
                              fontSize: { xs: "0.88rem", sm: "0.95rem" },
                              lineHeight: 1.2,
                              mb: 0.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textTransform: "uppercase",
                            }}
                          >
                            {s.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontSize: "0.7rem",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.3,
                            }}
                          >
                            <strong>F:</strong> {s.fatherName}
                          </Typography>
                          {s.motherName && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.7rem",
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                lineHeight: 1.3,
                              }}
                            >
                              <strong>M:</strong> {s.motherName}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Divider sx={{ mb: 1.2 }} />

                      {/* DETAILS */}
                      <Stack spacing={0.8} sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <BadgeIcon
                            sx={{
                              fontSize: 14,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 55,
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            Scholar
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.scholarNumber}
                          </Typography>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ClassIcon
                            sx={{
                              fontSize: 14,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 55,
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            Class
                          </Typography>
                          <Chip
                            label={`${s.class?.name || "—"}-${s.class?.section || "—"}`}
                            size="small"
                            sx={{
                              bgcolor: classColor.bg,
                              color: classColor.text,
                              fontWeight: 800,
                              height: 20,
                              fontSize: "0.68rem",
                            }}
                          />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FormatListNumberedIcon
                            sx={{
                              fontSize: 14,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 55,
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            Roll
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              color: "primary.main",
                            }}
                          >
                            {s.rollNumber}
                          </Typography>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PhoneIcon
                            sx={{
                              fontSize: 14,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 55,
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            Mobile
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              fontSize: "0.78rem",
                              color:
                                s.mobile === "0000000000"
                                  ? "text.disabled"
                                  : "text.primary",
                            }}
                          >
                            {s.mobile === "0000000000" ? "—" : s.mobile}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>

                    {!selectionMode && (
                      <Box
                        sx={{
                          borderTop: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#FAFBFD",
                          px: 0.5,
                          py: 0.6,
                          display: "flex",
                          justifyContent: "space-around",
                          alignItems: "center",
                          minHeight: 44,
                        }}
                      >
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/students/${s._id}`);
                            }}
                            sx={{
                              p: 0.8,
                              "&:hover": { bgcolor: "info.50" },
                            }}
                          >
                            <VisibilityIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStudent(s);
                              setFormOpen(true);
                            }}
                            sx={{
                              p: 0.8,
                              "&:hover": { bgcolor: "primary.50" },
                            }}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>

                        {isAdmin && (
                          <>
                            <Tooltip title="Status">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusStudent(s);
                                  setStatusOpen(true);
                                }}
                                sx={{
                                  p: 0.8,
                                  "&:hover": { bgcolor: "warning.50" },
                                }}
                              >
                                <SwapHorizIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Select">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  enterSelectionMode(s._id);
                                }}
                                sx={{
                                  p: 0.8,
                                  "&:hover": { bgcolor: "primary.50" },
                                }}
                              >
                                <CheckBoxOutlineBlankIcon
                                  sx={{ fontSize: 18 }}
                                />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete(s);
                                }}
                                sx={{
                                  p: 0.8,
                                  "&:hover": { bgcolor: "error.50" },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 3,
                mb: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(e, p) => setPage(p - 1)}
                color="primary"
                size={isMobile ? "small" : "medium"}
                showFirstButton={!isXs}
                showLastButton={!isXs}
                siblingCount={isXs ? 0 : 1}
              />
            </Box>
          )}
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
        loading={actionLoading}
        onConfirm={handleDelete}
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
