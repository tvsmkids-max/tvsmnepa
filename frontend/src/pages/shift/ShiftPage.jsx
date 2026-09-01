import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  InputLabel,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SearchIcon from "@mui/icons-material/Search";

import { useClasses, useStudentList } from "../../hooks/useStudents";
import { useShiftExecute } from "../../hooks/useShift";
import { formatScholarNo } from "../../utils/formatters";

// ═══════════════════════════════════════════════════════════════════
//  UI/UX CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════

const ShiftPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  // const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ─── Data Fetching ───
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const executeMutation = useShiftExecute();

  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch,
  } = useStudentList({
    limit: 5000,
    status: "Active",
  });
  const allStudents = studentsData?.data || [];

  // ─── Filter States ───
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const [search, setSearch] = useState("");

  // ─── Row-Level Target States ───
  const [rowTargets, setRowTargets] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  // ─── Derived Data ───
  const uniqueGrades = useMemo(() => {
    const grades = classes.map((c) => c.name);
    return [...new Set(grades)];
  }, [classes]);

  const getSectionsForGrade = useCallback(
    (gradeName) => {
      return classes
        .filter((c) => c.name === gradeName)
        .map((c) => c.section)
        .sort();
    },
    [classes],
  );

  React.useEffect(() => {
    if (uniqueGrades.length > 0 && !filterGrade) {
      setFilterGrade(uniqueGrades[0]);
    }
  }, [uniqueGrades, filterGrade]);

  // ─── Filter Logic ───
  const displayStudents = useMemo(() => {
    let list = allStudents;

    if (filterGrade) {
      list = list.filter((s) => s.class?.name === filterGrade);
    }
    if (filterSection !== "All") {
      list = list.filter((s) => s.class?.section === filterSection);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.scholarNumber?.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allStudents, filterGrade, filterSection, search]);

  // ─── Handlers ───
  const handleTargetGradeChange = (studentId, newGrade) => {
    const availableClasses = classes.filter((c) => c.name === newGrade);
    const defaultClass = availableClasses[0];

    setRowTargets((prev) => ({
      ...prev,
      [studentId]: {
        grade: newGrade,
        section: defaultClass ? defaultClass.section : "",
        classId: defaultClass ? defaultClass._id : "",
      },
    }));
  };

  const handleTargetSectionChange = (studentId, newSection) => {
    setRowTargets((prev) => {
      const currentGrade = prev[studentId]?.grade;
      const targetClass = classes.find(
        (c) => c.name === currentGrade && c.section === newSection,
      );
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          section: newSection,
          classId: targetClass ? targetClass._id : "",
        },
      };
    });
  };

  const handleUpdate = async (student) => {
    const target = rowTargets[student._id];

    if (!target || !target.classId) {
      enqueueSnackbar("Please select a target Class and Section first.", {
        variant: "warning",
      });
      return;
    }

    if (target.classId === student.class?._id) {
      enqueueSnackbar("Student is already in this class and section.", {
        variant: "info",
      });
      return;
    }

    setUpdatingId(student._id);
    try {
      await executeMutation.mutateAsync({
        sourceClassId: student.class._id,
        targetClassId: target.classId,
        studentIds: [student._id],
      });

      enqueueSnackbar(`${student.name} shifted successfully!`, {
        variant: "success",
      });

      setRowTargets((prev) => {
        const next = { ...prev };
        delete next[student._id];
        return next;
      });
      refetch();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to shift student",
        { variant: "error" },
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const isLoading = classesLoading || studentsLoading;

  const headSx = {
    bgcolor: isDark ? "#0F172A" : "#F8FAFC",
    fontWeight: 700,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1.5,
    px: 2,
    whiteSpace: "nowrap",
  };

  const cellStyle = {
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1.25,
    px: 2,
    whiteSpace: "nowrap",
  };

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* ─── BREADCRUMBS & HEADER ─── */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 0.5 }}
        >
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/dashboard")}
            sx={{ cursor: "pointer", fontSize: "0.75rem", fontWeight: 500 }}
          >
            Dashboard
          </Link>
          <Typography
            color="text.primary"
            sx={{ fontSize: "0.75rem", fontWeight: 600 }}
          >
            Class / Section Shift
          </Typography>
        </Breadcrumbs>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            fontSize: { xs: "1.35rem", sm: "1.75rem" },
            lineHeight: 1.2,
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          Class / Section Shift
        </Typography>
      </Box>

      {/* ─── COMPACT FILTER BAR ─── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Class
              </InputLabel>
              <Select
                label="Class"
                value={filterGrade}
                onChange={(e) => {
                  setFilterGrade(e.target.value);
                  setFilterSection("All");
                }}
                sx={{
                  bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {uniqueGrades.map((g) => (
                  <MenuItem key={g} value={g} sx={{ fontSize: "0.85rem" }}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Section
              </InputLabel>
              <Select
                label="Section"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                sx={{
                  bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <MenuItem value="All" sx={{ fontSize: "0.85rem" }}>
                  All Sections
                </MenuItem>
                {getSectionsForGrade(filterGrade).map((sec) => (
                  <MenuItem key={sec} value={sec} sx={{ fontSize: "0.85rem" }}>
                    {sec}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            placeholder="Search student or scholar no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                fontSize: "0.85rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* ─── PROFESSIONAL DATA TABLE ─── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <TableContainer
          sx={{
            maxHeight: { xs: "calc(100vh - 280px)", md: "calc(100vh - 250px)" },
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Table
            stickyHeader
            size="small"
            sx={{ minWidth: { xs: 700, md: "100%" } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>Student Details</TableCell>
                <TableCell sx={headSx}>Current Class</TableCell>
                <TableCell sx={headSx}>Target Class</TableCell>
                <TableCell sx={headSx}>Target Section</TableCell>
                <TableCell sx={headSx} align="center">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : displayStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography
                      color="text.secondary"
                      fontWeight={500}
                      fontSize="0.85rem"
                    >
                      No students found in this class.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayStudents.map((student) => {
                  const targetData = rowTargets[student._id] || {};
                  const isUpdating = updatingId === student._id;

                  return (
                    <TableRow
                      key={student._id}
                      hover
                      sx={{
                        bgcolor: isDark ? "#1E293B" : "#FFFFFF",
                        "&:hover": {
                          bgcolor: isDark
                            ? alpha("#fff", 0.03)
                            : alpha("#0F172A", 0.02),
                        },
                      }}
                    >
                      {/* STICKY COLUMN */}
                      <TableCell sx={cellStyle}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            textTransform: "uppercase",
                            mb: 0.2,
                            fontSize: "0.82rem",
                            color: "text.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {student.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontFamily="monospace"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem", fontWeight: 500 }}
                        >
                          {formatScholarNo(student)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={cellStyle}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          fontSize="0.8rem"
                          color="text.primary"
                        >
                          {student.class?.name || "—"} -{" "}
                          {student.class?.section || "—"}
                        </Typography>
                      </TableCell>

                      {/* MINIMAL TARGET DROPDOWNS */}
                      <TableCell sx={cellStyle}>
                        <FormControl size="small" fullWidth variant="outlined">
                          <Select
                            displayEmpty
                            value={targetData.grade || ""}
                            onChange={(e) =>
                              handleTargetGradeChange(
                                student._id,
                                e.target.value,
                              )
                            }
                            sx={{
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              height: 30,
                              bgcolor: isDark ? "background.default" : "#fff",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "divider",
                              },
                            }}
                          >
                            <MenuItem
                              value=""
                              disabled
                              sx={{ fontSize: "0.8rem" }}
                            >
                              <em>Select Class</em>
                            </MenuItem>
                            {uniqueGrades.map((g) => (
                              <MenuItem
                                key={g}
                                value={g}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                {g}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>

                      <TableCell sx={cellStyle}>
                        <FormControl
                          size="small"
                          fullWidth
                          variant="outlined"
                          disabled={!targetData.grade}
                        >
                          <Select
                            displayEmpty
                            value={targetData.section || ""}
                            onChange={(e) =>
                              handleTargetSectionChange(
                                student._id,
                                e.target.value,
                              )
                            }
                            sx={{
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              height: 30,
                              bgcolor: isDark ? "background.default" : "#fff",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "divider",
                              },
                            }}
                          >
                            <MenuItem
                              value=""
                              disabled
                              sx={{ fontSize: "0.8rem" }}
                            >
                              <em>Select Section</em>
                            </MenuItem>
                            {targetData.grade &&
                              getSectionsForGrade(targetData.grade).map(
                                (sec) => (
                                  <MenuItem
                                    key={sec}
                                    value={sec}
                                    sx={{ fontSize: "0.8rem" }}
                                  >
                                    {sec}
                                  </MenuItem>
                                ),
                              )}
                          </Select>
                        </FormControl>
                      </TableCell>

                      {/* SLEEK ACTION BUTTON */}
                      <TableCell sx={cellStyle} align="center">
                        <Button
                          variant="contained"
                          disableElevation
                          disabled={
                            isUpdating ||
                            !targetData.classId ||
                            targetData.classId === student.class?._id
                          }
                          onClick={() => handleUpdate(student)}
                          sx={{
                            height: 28,
                            px: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            bgcolor: isDark ? "#2563EB" : "#1D4ED8",
                            "&:hover": {
                              bgcolor: isDark ? "#1D4ED8" : "#1E3A8A",
                            },
                          }}
                        >
                          {isUpdating ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            "Update"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ShiftPage;
