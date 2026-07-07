import React, { useState, useMemo, memo } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import MonthlyClassDialog from "../../reports/MonthlyClassDialog";
import {
  useMonthlyReport,
  useRefreshManagement,
} from "../../../hooks/useManagement";

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SORT_OPTIONS = [
  { value: "class", label: "Class (Nursery → 10th)" },
  { value: "percentage-desc", label: "Attendance % (High → Low)" },
  { value: "percentage-asc", label: "Attendance % (Low → High)" },
];

// ═══════════════════════════════════════════════════════════════════
//  LOADING COMPONENT
// ═══════════════════════════════════════════════════════════════════

const AppLoader = ({ label = "Loading..." }) => (
  <Box sx={{ textAlign: "center", py: 8 }}>
    <Box
      component="img"
      src="/loading.png"
      alt="Loading"
      sx={{
        width: 72,
        height: 72,
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
    <Typography
      variant="body2"
      color="text.secondary"
      fontWeight={600}
      sx={{ mt: 2 }}
    >
      {label}
    </Typography>
  </Box>
);

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

const MonthlyPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("class");
  const [hideEmpty, setHideEmpty] = useState(true);

  // Dialog state
  const [selectedClass, setSelectedClass] = useState(null);

  const { data: monthlyReport, isLoading } = useMonthlyReport(
    secretKey,
    year,
    month,
  );
  const refreshAll = useRefreshManagement();

  const handleRefresh = () => refreshAll(secretKey);

  // ─── Filtered + Sorted ───
  const filteredClasses = useMemo(() => {
    if (!monthlyReport?.classes) return [];
    let list = [...monthlyReport.classes];

    if (hideEmpty) list = list.filter((c) => !c.isEmpty);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.section?.toLowerCase().includes(q) ||
          `${c.name}-${c.section}`.toLowerCase().includes(q) ||
          c.classTeacher?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "class":
          if ((a.sortRank || 999) !== (b.sortRank || 999))
            return (a.sortRank || 999) - (b.sortRank || 999);
          return (a.section || "").localeCompare(b.section || "");
        case "percentage-desc":
          return (b.percentage || 0) - (a.percentage || 0);
        case "percentage-asc":
          return (a.percentage || 0) - (b.percentage || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [monthlyReport, search, sortBy, hideEmpty]);

  const summary = monthlyReport?.summary || {};

  return (
    <Box>
      {/* ── FILTER BAR ── */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={1.2}>
          {/* Row 1: Month + Year */}
          <Stack direction="row" spacing={1.2}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={month}
                label="Month"
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>
                    {isXs ? m.slice(0, 3) : m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={year}
                label="Year"
                onChange={(e) => setYear(e.target.value)}
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Row 2: Search + Sort + Refresh */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <TextField
              placeholder="Search class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{
                flex: 1,
                "& .MuiInputBase-root": { height: 36, fontSize: "0.82rem" },
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
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: 90, sm: 220 },
                display: { xs: "none", sm: "flex" },
              }}
            >
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ height: 36, fontSize: "0.78rem", fontWeight: 700 }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                disabled={isLoading}
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                }}
              >
                <RefreshOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <AppLoader label="Loading monthly report..." />
      ) : !monthlyReport ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No monthly data available
          </Typography>
        </Paper>
      ) : (
        <>
          {/* ── MONTH HEADER ── */}
          <Paper
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              borderRadius: 3,
              bgcolor: isDark
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.primary.main, 0.05),
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.2),
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.2}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: "1.05rem", sm: "1.2rem" },
                    color: "primary.main",
                  }}
                >
                  {monthlyReport.monthName} {monthlyReport.year}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ mt: 0.5 }}
                  flexWrap="wrap"
                >
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    🗓️ Working: <strong>{summary.workingDays}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    🏖️ Holidays: <strong>{summary.holidays}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    👥 Students: <strong>{summary.totalStudents}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    📚 Classes: <strong>{summary.totalClasses}</strong>
                  </Typography>
                </Stack>
              </Box>
              <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: "1.8rem", sm: "2rem" },
                    lineHeight: 1,
                    color:
                      summary.overallPercentage >= 75
                        ? "success.main"
                        : summary.overallPercentage >= 50
                          ? "warning.main"
                          : "error.main",
                  }}
                >
                  {summary.overallPercentage}%
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Overall Rate
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* ── CLASS CARDS ── */}
          {filteredClasses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
              <CalendarMonthOutlinedIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {search
                  ? "No classes match your search"
                  : "No data for this month"}
              </Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {filteredClasses.map((cls) => (
                  <Grid item xs={12} sm={6} lg={4} key={cls._id}>
                    <MonthlyClassCard
                      cls={cls}
                      isDark={isDark}
                      onClick={() => setSelectedClass(cls)}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing <strong>{filteredClasses.length}</strong> of{" "}
                  <strong>{monthlyReport.classes?.length || 0}</strong> classes
                  {hideEmpty && summary.emptyClasses > 0 && (
                    <> · {summary.emptyClasses} empty hidden</>
                  )}
                </Typography>
              </Box>
            </>
          )}
        </>
      )}

      {/* ── MONTHLY CLASS DIALOG (management mode) ── */}
      <MonthlyClassDialog
        open={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        classData={selectedClass}
        year={year}
        month={month}
        mode="management"
        secretKey={secretKey}
      />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MONTHLY CLASS CARD (same as admin)
// ═══════════════════════════════════════════════════════════════════

const MonthlyClassCard = memo(({ cls, isDark, onClick }) => {
  const pctColor =
    cls.percentage >= 90
      ? "#16A34A"
      : cls.percentage >= 75
        ? "#F59E0B"
        : cls.percentage >= 50
          ? "#F97316"
          : "#DC2626";

  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: "divider",
        boxShadow: "none",
        cursor: "pointer",
        transition: "all 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        opacity: cls.isEmpty ? 0.5 : 1,
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Class name + Teacher */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="h6"
            fontWeight={900}
            sx={{ fontSize: "1.1rem", lineHeight: 1.2 }}
            noWrap
          >
            {cls.name}-{cls.section}
          </Typography>
          {cls.classTeacher && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.75rem", display: "block", mt: 0.3 }}
            >
              👨‍🏫 {cls.classTeacher}
            </Typography>
          )}
        </Box>

        {/* Big percentage + marks */}
        <Box sx={{ textAlign: "center", my: 1.5 }}>
          {cls.totalStudents === 0 ? (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ fontStyle: "italic", py: 2 }}
            >
              No Students Enrolled
            </Typography>
          ) : (
            <>
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "2.4rem", sm: "2.6rem" },
                  color: pctColor,
                  lineHeight: 1,
                }}
              >
                {cls.percentage}%
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "0.75rem",
                  display: "block",
                  mt: 0.5,
                  fontWeight: 600,
                }}
              >
                {cls.present}/{cls.totalMarks} marks
              </Typography>

              <LinearProgress
                variant="determinate"
                value={cls.percentage}
                sx={{
                  mt: 1.5,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: pctColor,
                    borderRadius: 4,
                    transition: "transform 0.8s ease-in-out",
                  },
                }}
              />
            </>
          )}
        </Box>

        {/* Footer */}
        {cls.totalStudents > 0 && (
          <Box
            sx={{
              mt: "auto",
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              <Box
                component="span"
                sx={{ color: "text.primary", fontWeight: 800 }}
              >
                {cls.totalStudents}
              </Box>{" "}
              Students ·{" "}
              <Box component="span" sx={{ fontWeight: 800 }}>
                {cls.workingDays}
              </Box>{" "}
              Working Days
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
MonthlyClassCard.displayName = "MonthlyClassCard";

  

export default MonthlyPage;
