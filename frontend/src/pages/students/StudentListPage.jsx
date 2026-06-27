import React, { useState, useEffect, useCallback } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import StatusChip from "../../components/common/StatusChip";
import StudentFormDialog from "./StudentFormDialog";
import StudentStatusDialog from "./StudentStatusDialog";
import StudentImportDialog from "./StudentImportDialog";
import studentApi from "../../api/studentApi";
import classApi from "../../api/classApi";
import useDebounce from "../../hooks/useDebounce";
import useAuth from "../../hooks/useAuth";

const StudentListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(24); // 24 for 3-column grid (8 rows)
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusStudent, setStatusStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleCardClick = (studentId) => {
    navigate(`/students/${studentId}`);
  };

  const totalPages = Math.ceil(total / rowsPerPage);

  // Get class color for visual variety
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
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={() => setImportOpen(true)}
                sx={{ fontWeight: 700 }}
                size={isMobile ? "small" : "medium"}
              >
                Import Excel
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
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 700,
              }}
              size={isMobile ? "small" : "medium"}
            >
              Add Student
            </Button>
          </Stack>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            placeholder="Search by name, scholar #, roll, mobile, father..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ flex: 1, minWidth: { sm: 280 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
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

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
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
      </Paper>

      {/* Cards Grid / Empty / Loading */}
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
          {/* Responsive Grid Layout */}
          <Grid container spacing={2}>
            {students.map((s) => {
              const classKey = `${s.class?.name || ""}-${s.class?.section || ""}`;
              const classColor = getClassColor(classKey);

              return (
                <Grid item xs={12} sm={6} lg={4} key={s._id}>
                  <Card
                    onClick={() => handleCardClick(s._id)}
                    sx={{
                      borderRadius: 3,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "1px solid",
                      borderColor: "divider",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-3px)",
                        boxShadow: "0 12px 24px rgba(13,27,62,0.12)",
                      },
                      "&:active": {
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {/* Status Badge — Top Right */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        zIndex: 1,
                      }}
                    >
                      <StatusChip status={s.status} />
                    </Box>

                    <CardContent
                      sx={{
                        p: 2.5,
                        pb: "0 !important",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* HEADER — Avatar + Name + Parents */}
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ mb: 2, pr: 8 }}
                      >
                        <Avatar
                          sx={{
                            width: 52,
                            height: 52,
                            bgcolor:
                              s.gender === "Female" ? "#EC4899" : "#1E4D98",
                            fontSize: "1.2rem",
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
                              fontSize: "0.95rem",
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
                              fontSize: "0.72rem",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <strong>Father:</strong> {s.fatherName}
                          </Typography>
                          {s.motherName && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.72rem",
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <strong>Mother:</strong> {s.motherName}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Divider sx={{ mb: 1.5 }} />

                      {/* DETAILS GRID */}
                      <Stack spacing={1} sx={{ flex: 1 }}>
                        {/* Scholar Number */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                        >
                          <BadgeIcon
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 60,
                              fontSize: "0.7rem",
                              fontWeight: 600,
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
                              fontSize: "0.82rem",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.scholarNumber}
                          </Typography>
                        </Stack>

                        {/* Class */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                        >
                          <ClassIcon
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 60,
                              fontSize: "0.7rem",
                              fontWeight: 600,
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
                              height: 22,
                              fontSize: "0.72rem",
                            }}
                          />
                        </Stack>

                        {/* Roll Number */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                        >
                          <FormatListNumberedIcon
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 60,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            Roll No
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              color: "primary.main",
                            }}
                          >
                            {s.rollNumber}
                          </Typography>
                        </Stack>

                        {/* Mobile */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                        >
                          <PhoneIcon
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              minWidth: 60,
                              fontSize: "0.7rem",
                              fontWeight: 600,
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
                              fontSize: "0.82rem",
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

                    {/* ACTIONS BAR */}
                    <Box
                      sx={{
                        borderTop: "1px solid",
                        borderColor: "divider",
                        bgcolor: "#FAFBFD",
                        px: 1,
                        py: 0.5,
                        display: "flex",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/${s._id}`);
                          }}
                          sx={{
                            "&:hover": { bgcolor: "info.50" },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Student">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStudent(s);
                            setFormOpen(true);
                          }}
                          sx={{
                            "&:hover": { bgcolor: "primary.50" },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {isAdmin && (
                        <>
                          <Tooltip title="Change Status">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusStudent(s);
                                setStatusOpen(true);
                              }}
                              sx={{
                                "&:hover": { bgcolor: "warning.50" },
                              }}
                            >
                              <SwapHorizIcon fontSize="small" />
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
                                "&:hover": { bgcolor: "error.50" },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 4,
                mb: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(e, p) => setPage(p - 1)}
                color="primary"
                size={isMobile ? "small" : "medium"}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Dialogs */}
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
    </Box>
  );
};

export default StudentListPage;
