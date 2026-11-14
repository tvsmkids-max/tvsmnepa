import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Stack,
  Typography,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import reportApi from "../../api/reportApi";
import managementApi from "../../api/managementApi";
import { exportMonthlyClassToExcel } from "../../utils/exportUtils";

// ═══════════════════════════════════════════════════════════════════
//  LOADING
// ═══════════════════════════════════════════════════════════════════

const InlineLoader = ({ label = "Loading student data..." }) => (
  <Box sx={{ textAlign: "center", py: 6 }}>
    <Box
      component="img"
      src="/loading.png"
      alt="Loading"
      sx={{
        width: 56,
        height: 56,
        animation: "spin 1.5s linear infinite",
        "@keyframes spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      }}
      onError={(e) => {
        e.target.style.display = "none";
      }}
    />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
      {label}
    </Typography>
  </Box>
);

// ═══════════════════════════════════════════════════════════════════
//  STATUS CELL
// ═══════════════════════════════════════════════════════════════════

const StatusCell = ({ status, isDark, isSunday }) => {
  const config = useMemo(() => {
    if (status === "P") {
      return {
        label: "P",
        color: isDark ? "#86EFAC" : "#15803D",
        bg: isDark ? alpha("#16A34A", 0.2) : "#DCFCE7",
      };
    }
    if (status === "A") {
      return {
        label: "A",
        color: isDark ? "#FCA5A5" : "#B91C1C",
        bg: isDark ? alpha("#DC2626", 0.2) : "#FEE2E2",
      };
    }
    if (status === "H") {
      return {
        label: "H",
        color: isDark ? "#93C5FD" : "#1E4D98",
        bg: isDark ? alpha("#3B82F6", 0.18) : "#DBEAFE",
      };
    }
    if (status === "-" || isSunday) {
      return {
        label: "—",
        color: isDark ? "#6B7280" : "#94A3B8",
        bg: isDark ? alpha("#fff", 0.03) : "#F1F5F9",
      };
    }
    return {
      label: "",
      color: "text.disabled",
      bg: "transparent",
    };
  }, [status, isDark, isSunday]);

  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0.75,
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 900,
        fontSize: "0.72rem",
        fontFamily: "monospace",
        mx: "auto",
      }}
    >
      {config.label}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN DIALOG
// ═══════════════════════════════════════════════════════════════════

const MonthlyClassDialog = ({
  open,
  onClose,
  classData,
  year,
  month,
  mode = "admin",
  secretKey = null,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { enqueueSnackbar } = useSnackbar();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const isManagementMode = mode === "management";

  // ─── Fetch data ───
  useEffect(() => {
    if (!open || !classData?._id) {
      setDetail(null);
      setSearch("");
      setFilter("all");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = isManagementMode
          ? await managementApi.getMonthlyClassDetail(
              secretKey,
              classData._id,
              year,
              month,
            )
          : await reportApi.getMonthlyClassDetail(classData._id, {
              year,
              month,
            });

        if (!cancelled) {
          setDetail(res.data?.data || null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load class data",
            { variant: "error" },
          );
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    classData,
    year,
    month,
    isManagementMode,
    secretKey,
    enqueueSnackbar,
  ]);

  // ─── Filtered + Sorted students ───
  const filteredStudents = useMemo(() => {
    if (!detail?.students) return [];
    let list = [...detail.students];

    if (filter === "perfect") list = list.filter((s) => s.isPerfect);
    else if (filter === "low") list = list.filter((s) => s.isLowAttendance);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.scholarNumber?.toLowerCase().includes(q) ||
          s.fatherName?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "scholar":
          return (a.scholarNumber || "").localeCompare(b.scholarNumber || "");
        case "percentage-desc":
          return (b.percentage || 0) - (a.percentage || 0);
        case "percentage-asc":
          return (a.percentage || 0) - (b.percentage || 0);
        case "absent-desc":
          return (b.absent || 0) - (a.absent || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [detail, search, filter, sortBy]);

  // ─── Export ───
  const handleExport = async () => {
    if (!detail) return;
    try {
      await exportMonthlyClassToExcel(
        detail,
        `${detail.class.name}-${detail.class.section}-${detail.monthName}-${year}`,
      );
      enqueueSnackbar("Excel exported successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.message || "Export failed", { variant: "error" });
    }
  };

  if (!classData) return null;

  const monthName = detail?.monthName || "";
  const summary = detail?.summary || {};
  const dates = detail?.dates || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#0F172A" : "#F8FAFC",
        },
      }}
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════ */}
      <DialogTitle
        component="div"
        sx={{
          p: 0,
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "white",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, position: "relative" }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
            size="small"
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>

          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Monthly Attendance · {monthName} {year}
          </Typography>

          <Typography
            variant="h5"
            fontWeight={900}
            sx={{
              fontSize: { xs: "1.15rem", sm: "1.4rem" },
              mt: 0.3,
              pr: 5,
            }}
          >
            Class {classData.name} - {classData.section}
          </Typography>

          {classData.classTeacher && (
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.75rem",
                display: "block",
                mt: 0.3,
              }}
            >
              👨‍🏫 {classData.classTeacher}
            </Typography>
          )}

          {/* Stats row */}
          {!loading && detail && (
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 2 }}
              sx={{
                mt: 1.5,
                p: 1,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                overflowX: "auto",
                "&::-webkit-scrollbar": { display: "none" },
              }}
              justifyContent="space-around"
            >
              <StatItem
                value={summary.totalStudents || 0}
                label="Students"
                color="white"
              />
              <StatItem
                value={detail.workingDays || 0}
                label="Working Days"
                color="#93C5FD"
              />
              <StatItem
                value={`${summary.overallPercentage || 0}%`}
                label="Rate"
                color={
                  (summary.overallPercentage || 0) >= 75 ? "#86EFAC" : "#FCD34D"
                }
              />
            </Stack>
          )}
        </Box>
      </DialogTitle>

      {/* ═══════════════════════════════════════════════════════════
          CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        {loading ? (
          <InlineLoader />
        ) : !detail || !detail.students?.length ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <PersonOutlineIcon
              sx={{ fontSize: 56, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No student data available for this month
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 200px)",
            }}
          >
            {/* ─── FILTER BAR ─── */}
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 1.25,
                bgcolor: isDark ? "#1E293B" : "#FFFFFF",
                borderBottom: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <TextField
                  placeholder="Search name, scholar, father..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  sx={{
                    flex: 1,
                    "& .MuiInputBase-root": {
                      height: 36,
                      fontSize: "0.82rem",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon
                          sx={{ fontSize: 16, color: "text.disabled" }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: search && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearch("")}
                          sx={{ p: 0.25 }}
                        >
                          <ClearIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`All ${detail.students.length}`}
                    size="small"
                    onClick={() => setFilter("all")}
                    color={filter === "all" ? "primary" : "default"}
                    variant={filter === "all" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700, height: 30, fontSize: "0.72rem" }}
                  />
                  <Chip
                    icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`Perfect ${summary.perfectAttendanceStudents || 0}`}
                    size="small"
                    onClick={() => setFilter("perfect")}
                    color={filter === "perfect" ? "success" : "default"}
                    variant={filter === "perfect" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700, height: 30, fontSize: "0.72rem" }}
                  />
                  <Chip
                    icon={<WarningAmberOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`<75% (${summary.lowAttendanceStudents || 0})`}
                    size="small"
                    onClick={() => setFilter("low")}
                    color={filter === "low" ? "error" : "default"}
                    variant={filter === "low" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700, height: 30, fontSize: "0.72rem" }}
                  />
                </Stack>

                <FormControl
                  size="small"
                  sx={{ minWidth: 160, display: { xs: "none", md: "flex" } }}
                >
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{ height: 36, fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    <MenuItem value="name">Name (A → Z)</MenuItem>
                    <MenuItem value="scholar">Scholar No.</MenuItem>
                    <MenuItem value="percentage-desc">% High → Low</MenuItem>
                    <MenuItem value="percentage-asc">% Low → High</MenuItem>
                    <MenuItem value="absent-desc">Most Absent</MenuItem>
                  </Select>
                </FormControl>

                {!isManagementMode && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleExport}
                    startIcon={
                      <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
                    }
                    sx={{
                      height: 36,
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      textTransform: "none",
                      background:
                        "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #15803D 0%, #166534 100%)",
                      },
                    }}
                  >
                    Export Excel
                  </Button>
                )}
              </Stack>
            </Box>

            {/* ─── LEGEND ─── */}
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 0.75,
                bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                borderBottom: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <LegendBox
                  letter="P"
                  bg="#DCFCE7"
                  color="#15803D"
                  label="Present"
                />
                <LegendBox
                  letter="A"
                  bg="#FEE2E2"
                  color="#B91C1C"
                  label="Absent"
                />
                <LegendBox
                  letter="H"
                  bg="#DBEAFE"
                  color="#1E4D98"
                  label="Holiday"
                />
                <LegendBox
                  letter="—"
                  bg="#F1F5F9"
                  color="#94A3B8"
                  label="Sunday / Non-working"
                />
              </Stack>
            </Box>

            {/* ─── CALENDAR TABLE (same on all devices) ─── */}
            <CalendarTable
              students={filteredStudents}
              dates={dates}
              isDark={isDark}
              isMobile={isMobile}
            />

            {/* ─── COUNT FOOTER ─── */}
            <Box
              sx={{
                px: 2,
                py: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: isDark ? "#1E293B" : "#FFFFFF",
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.72rem" }}
              >
                Showing <strong>{filteredStudents.length}</strong> of{" "}
                <strong>{detail.students.length}</strong> students
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  CALENDAR TABLE (works on both desktop & mobile)
//  Mobile: hides Scholar column, sticky Name + Father only
// ═══════════════════════════════════════════════════════════════════
const CalendarTable = ({ students, dates, isDark, isMobile }) => {
  const stickyBg = isDark ? "#1E293B" : "#FFFFFF";
  const headerBg = isDark ? "#0F172A" : "#F1F5F9";

  const scholarWidth = 90;
  const nameWidth = isMobile ? 100 : 180;
  const fatherWidth = isMobile ? 130 : 160;

  const nameLeft = isMobile ? 0 : scholarWidth;
  const fatherLeft = isMobile ? null : scholarWidth + nameWidth;

  return (
    <TableContainer
      sx={{
        flex: 1,
        overflow: "auto",
        bgcolor: isDark ? "#0F172A" : "#F8FAFC",
      }}
    >
      <Table
        size="small"
        stickyHeader
        sx={{
          borderCollapse: "separate",
          borderSpacing: 0,
          "& td, & th": {
            borderColor: "divider",
            borderBottomStyle: "solid",
            borderBottomWidth: "1px",
          },
        }}
      >
        <TableHead>
          <TableRow>
            {!isMobile && (
              <TableCell
                sx={{
                  ...stickyHeaderStyle(headerBg),
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  width: scholarWidth,
                  minWidth: scholarWidth,
                }}
              >
                Scholar
              </TableCell>
            )}
            <TableCell
              sx={{
                ...stickyHeaderStyle(headerBg),
                position: "sticky",
                left: nameLeft,
                zIndex: 3,
                minWidth: nameWidth,
                width: nameWidth,
              }}
            >
              Name
            </TableCell>
            <TableCell
              sx={{
                ...stickyHeaderStyle(headerBg),
                ...(isMobile
                  ? { position: "static" }
                  : { position: "sticky", left: fatherLeft, zIndex: 3 }),
                minWidth: fatherWidth,
                width: fatherWidth,
                borderRight: "2px solid",
                borderRightColor: "divider",
              }}
            >
              Father
            </TableCell>

            {dates.map((d) => (
              <TableCell
                key={d.dateKey}
                align="center"
                sx={{
                  ...stickyHeaderStyle(headerBg),
                  width: 32,
                  minWidth: 32,
                  px: 0.5,
                  color: d.isSunday
                    ? isDark
                      ? "#FCA5A5"
                      : "#DC2626"
                    : d.isHoliday
                      ? isDark
                        ? "#93C5FD"
                        : "#1E4D98"
                      : "inherit",
                }}
              >
                <Box sx={{ lineHeight: 1 }}>
                  <Typography
                    sx={{ fontSize: "0.6rem", fontWeight: 700, opacity: 0.7 }}
                  >
                    {d.dayShort.charAt(0)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      fontFamily: "monospace",
                    }}
                  >
                    {d.day}
                  </Typography>
                </Box>
              </TableCell>
            ))}

            <TableCell
              align="center"
              sx={{
                ...stickyHeaderStyle(headerBg),
                width: 45,
                color: "#16A34A",
                borderLeft: "2px solid",
                borderLeftColor: "divider",
              }}
            >
              P
            </TableCell>
            <TableCell
              align="center"
              sx={{
                ...stickyHeaderStyle(headerBg),
                width: 45,
                color: "#DC2626",
              }}
            >
              A
            </TableCell>
            <TableCell
              align="center"
              sx={{ ...stickyHeaderStyle(headerBg), width: 70 }}
            >
              %
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s) => {
            const pctColor =
              s.percentage >= 90
                ? "#16A34A"
                : s.percentage >= 75
                  ? "#F59E0B"
                  : "#DC2626";

            return (
              <TableRow key={s._id} hover>
                {!isMobile && (
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      bgcolor: stickyBg,
                      zIndex: 2,
                      py: 0.75,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.74rem",
                        color: "text.secondary",
                      }}
                    >
                      {s.scholarNumber}
                    </Typography>
                  </TableCell>
                )}

                <TableCell
                  sx={{
                    position: "sticky",
                    left: nameLeft,
                    bgcolor: stickyBg,
                    zIndex: 2,
                    py: 0.75,
                    px: isMobile ? 1 : 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      textTransform: "uppercase",
                      lineHeight: 1.2,
                    }}
                    noWrap
                  >
                    {s.name}
                  </Typography>
                </TableCell>

                <TableCell
                  sx={{
                    ...(isMobile
                      ? { position: "static", bgcolor: "transparent" }
                      : {
                          position: "sticky",
                          left: fatherLeft,
                          bgcolor: stickyBg,
                          zIndex: 2,
                        }),
                    py: 0.75,
                    borderRight: "2px solid",
                    borderRightColor: "divider",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: isMobile ? "0.7rem" : "0.75rem",
                      color: "text.secondary",
                    }}
                    noWrap
                  >
                    {s.fatherName || "—"}
                  </Typography>
                </TableCell>

                {dates.map((d) => (
                  <TableCell
                    key={d.dateKey}
                    align="center"
                    sx={{ px: 0.5, py: 0.5 }}
                  >
                    <StatusCell
                      status={s.dailyAttendance[d.dateKey]}
                      isDark={isDark}
                      isSunday={d.isSunday}
                    />
                  </TableCell>
                ))}

                <TableCell
                  align="center"
                  sx={{
                    borderLeft: "2px solid",
                    borderLeftColor: "divider",
                    py: 0.75,
                  }}
                >
                  <Typography
                    fontWeight={800}
                    sx={{
                      fontSize: "0.82rem",
                      color: "#16A34A",
                      fontFamily: "monospace",
                    }}
                  >
                    {s.present}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.75 }}>
                  <Typography
                    fontWeight={800}
                    sx={{
                      fontSize: "0.82rem",
                      color: "#DC2626",
                      fontFamily: "monospace",
                    }}
                  >
                    {s.absent}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.75 }}>
                  <Chip
                    label={`${s.percentage}%`}
                    size="small"
                    sx={{
                      fontWeight: 900,
                      height: 22,
                      fontSize: "0.72rem",
                      bgcolor: alpha(pctColor, isDark ? 0.2 : 0.1),
                      color: pctColor,
                      minWidth: 52,
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const StatItem = ({ value, label, color }) => (
  <Stack alignItems="center" sx={{ flexShrink: 0, px: 1 }}>
    <Typography
      fontWeight={900}
      sx={{ fontSize: "1rem", color, lineHeight: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.58rem",
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
  </Stack>
);

const LegendBox = ({ letter, bg, color, label }) => (
  <Stack direction="row" alignItems="center" spacing={0.5}>
    <Box
      sx={{
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0.5,
        bgcolor: bg,
        color: color,
        fontWeight: 900,
        fontSize: "0.65rem",
        fontFamily: "monospace",
      }}
    >
      {letter}
    </Box>
    <Typography
      variant="caption"
      sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary" }}
    >
      {label}
    </Typography>
  </Stack>
);

const stickyHeaderStyle = (bg) => ({
  fontWeight: 800,
  fontSize: "0.68rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  bgcolor: bg,
  py: 1,
});

export default MonthlyClassDialog;
