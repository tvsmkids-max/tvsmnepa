import React, { useState } from "react";
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

import {
  useMonthlyMatrix,
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

// ═══════════════════════════════════════════════════════════════════
//  HELPER: Shorten class names for narrow column
// ═══════════════════════════════════════════════════════════════════
const shortenClassName = (name, section) => {
  if (!name) return "";
  const upper = name.toString().trim().toUpperCase();

  // Common abbreviations
  const abbreviations = {
    NURSERY: "NUR",
    "LOWER KG": "LKG",
    "UPPER KG": "UKG",
    PRESCHOOL: "PRE",
    PLAYGROUP: "PLAY",
    PLAY: "PLAY",
  };

  let shortName = abbreviations[upper] || upper;

  // Remove "CLASS " prefix if present
  shortName = shortName.replace(/^CLASS\s+/i, "");

  // For 10TH, 11TH, 12TH → keep as is (short enough)
  return section ? `${shortName}-${section}` : shortName;
};

// ═══════════════════════════════════════════════════════════════════
//  LOADING
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

  const { data, isLoading } = useMonthlyMatrix(secretKey, year, month);
  const refreshAll = useRefreshManagement();

  const handleRefresh = () => refreshAll(secretKey);

  const summary = data?.summary || {};
  const dates = data?.dates || [];
  const classes = data?.classes || [];
  const grandTotals = data?.grandTotals || {};

  const overallPct = summary.overallPercentage || 0;
  const pctColor =
    overallPct >= 90 ? "#16A34A" : overallPct >= 75 ? "#F59E0B" : "#DC2626";

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
        <Stack direction="row" spacing={1.2} alignItems="center">
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
          <Tooltip title="Refresh">
            <IconButton
              onClick={handleRefresh}
              disabled={isLoading}
              size="small"
              sx={{
                width: 40,
                height: 40,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
              }}
            >
              <RefreshOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <AppLoader label="Loading monthly data..." />
      ) : !data ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No monthly data available
          </Typography>
        </Paper>
      ) : (
        <>
          {/* ── MONTH HEADER: Only Overall % ── */}
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
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="h6"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  color: "primary.main",
                }}
              >
                {data.monthName} {data.year}
              </Typography>
              <Stack alignItems="flex-end">
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: "1.8rem", sm: "2rem" },
                    lineHeight: 1,
                    color: pctColor,
                  }}
                >
                  {overallPct}%
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.65rem",
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

          {/* ── MATRIX TABLE ── */}
          {classes.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
              <CalendarMonthOutlinedIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                No classes found for this month
              </Typography>
            </Paper>
          ) : (
            <MatrixTable
              classes={classes}
              dates={dates}
              grandTotals={grandTotals}
              isDark={isDark}
            />
          )}
        </>
      )}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MATRIX TABLE (Class × Date grid)
// ═══════════════════════════════════════════════════════════════════

const MatrixTable = ({ classes, dates, grandTotals, isDark }) => {
  const stickyBg = isDark ? "#1E293B" : "#FFFFFF";
  const headerBg = isDark ? "#0F172A" : "#F1F5F9";
  const blockedBg = isDark ? alpha("#DC2626", 0.15) : "#FEE2E2";
  const totalRowBg = isDark ? alpha("#F5A623", 0.12) : "#FEF3C7";

  // Compact cell dimensions (mobile-friendly)
  const classColWidth = 62; // ← Reduced from 78 (short names like NUR-A)
  const labelColWidth = 28; // ← Reduced from 60 (just "P" or "A")
  const dateColWidth = 40; // ← Slightly smaller

  return (
    <Paper
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          overflow: "auto",
          maxHeight: "calc(100vh - 280px)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box
          component="table"
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            width: "auto",
            minWidth: "100%",
          }}
        >
          {/* ═══ HEADER ROW ═══ */}
          <Box component="thead">
            <Box component="tr">
              {/* Class header */}
              <Box
                component="th"
                sx={{
                  ...cellBase,
                  ...stickyHeadStyle(headerBg),
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 5,
                  width: classColWidth,
                  minWidth: classColWidth,
                  textAlign: "left",
                  pl: 1,
                }}
              >
                Class
              </Box>
              {/* Empty label header */}
              <Box
                component="th"
                sx={{
                  ...cellBase,
                  ...stickyHeadStyle(headerBg),
                  position: "sticky",
                  left: classColWidth,
                  top: 0,
                  zIndex: 5,
                  width: labelColWidth,
                  minWidth: labelColWidth,
                  borderRight: "2px solid",
                  borderRightColor: isDark ? "#334155" : "#CBD5E1",
                  px: 0,
                }}
              >
                &nbsp;
              </Box>
              {/* Date headers */}
              {dates.map((d) => (
                <Box
                  component="th"
                  key={d.dateKey}
                  sx={{
                    ...cellBase,
                    ...stickyHeadStyle(headerBg),
                    position: "sticky",
                    top: 0,
                    zIndex: 4,
                    width: dateColWidth,
                    minWidth: dateColWidth,
                    bgcolor: d.isBlocked ? blockedBg : headerBg,
                    color: d.isBlocked
                      ? isDark
                        ? "#FCA5A5"
                        : "#B91C1C"
                      : "text.secondary",
                  }}
                >
                  <Box sx={{ lineHeight: 1.1 }}>
                    <Typography
                      sx={{
                        fontSize: "0.56rem",
                        fontWeight: 700,
                        opacity: 0.75,
                      }}
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
                </Box>
              ))}
            </Box>
          </Box>

          {/* ═══ BODY ROWS ═══ */}
          <Box component="tbody">
            {classes.map((cls) => (
              <React.Fragment key={cls._id}>
                {/* PRESENT row */}
                <Box component="tr">
                  <Box
                    component="td"
                    rowSpan={2}
                    sx={{
                      ...cellBase,
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      bgcolor: stickyBg,
                      width: classColWidth,
                      minWidth: classColWidth,
                      textAlign: "left",
                      pl: 1,
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      borderBottom: "2px solid",
                      borderBottomColor: isDark ? "#334155" : "#CBD5E1",
                      verticalAlign: "middle",
                    }}
                  >
                    {shortenClassName(cls.name, cls.section)}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      ...cellBase,
                      position: "sticky",
                      left: classColWidth,
                      zIndex: 2,
                      bgcolor: stickyBg,
                      width: labelColWidth,
                      minWidth: labelColWidth,
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "#16A34A",
                      borderRight: "2px solid",
                      borderRightColor: isDark ? "#334155" : "#CBD5E1",
                      px: 0,
                    }}
                  >
                    P
                  </Box>
                  {dates.map((d) => {
                    const cell = cls.daily?.[d.dateKey];
                    const value = cell?.present;
                    return (
                      <Box
                        component="td"
                        key={d.dateKey}
                        sx={{
                          ...cellBase,
                          width: dateColWidth,
                          minWidth: dateColWidth,
                          bgcolor: d.isBlocked ? blockedBg : "transparent",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: d.isBlocked
                            ? "transparent"
                            : cls.hasStudents && value > 0
                              ? "#16A34A"
                              : "text.disabled",
                        }}
                      >
                        {d.isBlocked ? "" : value > 0 ? value : "—"}
                      </Box>
                    );
                  })}
                </Box>

                {/* ABSENT row */}
                <Box component="tr">
                  <Box
                    component="td"
                    sx={{
                      ...cellBase,
                      position: "sticky",
                      left: classColWidth,
                      zIndex: 2,
                      bgcolor: stickyBg,
                      width: labelColWidth,
                      minWidth: labelColWidth,
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "#DC2626",
                      borderRight: "2px solid",
                      borderRightColor: isDark ? "#334155" : "#CBD5E1",
                      borderBottom: "2px solid",
                      borderBottomColor: isDark ? "#334155" : "#CBD5E1",
                      px: 0,
                    }}
                  >
                    A
                  </Box>
                  {dates.map((d) => {
                    const cell = cls.daily?.[d.dateKey];
                    const value = cell?.absent;
                    return (
                      <Box
                        component="td"
                        key={d.dateKey}
                        sx={{
                          ...cellBase,
                          width: dateColWidth,
                          minWidth: dateColWidth,
                          bgcolor: d.isBlocked ? blockedBg : "transparent",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: d.isBlocked
                            ? "transparent"
                            : cls.hasStudents && value > 0
                              ? "#DC2626"
                              : "text.disabled",
                          borderBottom: "2px solid",
                          borderBottomColor: isDark ? "#334155" : "#CBD5E1",
                        }}
                      >
                        {d.isBlocked ? "" : value > 0 ? value : "—"}
                      </Box>
                    );
                  })}
                </Box>
              </React.Fragment>
            ))}

            {/* ═══ GRAND TOTAL (NOT sticky vertically — only horizontal left) ═══ */}
            <Box component="tr">
              <Box
                component="td"
                rowSpan={2}
                sx={{
                  ...cellBase,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: totalRowBg,
                  width: classColWidth,
                  minWidth: classColWidth,
                  textAlign: "left",
                  pl: 1,
                  fontWeight: 900,
                  fontSize: "0.78rem",
                  color: isDark ? "#FCD34D" : "#B45309",
                  borderTop: "3px double",
                  borderTopColor: isDark ? "#F5A623" : "#B45309",
                  verticalAlign: "middle",
                }}
              >
                TOTAL
              </Box>
              <Box
                component="td"
                sx={{
                  ...cellBase,
                  position: "sticky",
                  left: classColWidth,
                  zIndex: 2,
                  bgcolor: totalRowBg,
                  width: labelColWidth,
                  minWidth: labelColWidth,
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  color: "#16A34A",
                  borderRight: "2px solid",
                  borderRightColor: isDark ? "#334155" : "#CBD5E1",
                  borderTop: "3px double",
                  borderTopColor: isDark ? "#F5A623" : "#B45309",
                  px: 0,
                }}
              >
                P
              </Box>
              {dates.map((d) => {
                const total = grandTotals[d.dateKey];
                const value = total?.present || 0;
                return (
                  <Box
                    component="td"
                    key={d.dateKey}
                    sx={{
                      ...cellBase,
                      width: dateColWidth,
                      minWidth: dateColWidth,
                      bgcolor: d.isBlocked ? blockedBg : totalRowBg,
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: d.isBlocked
                        ? "transparent"
                        : value > 0
                          ? "#16A34A"
                          : "text.disabled",
                      borderTop: "3px double",
                      borderTopColor: isDark ? "#F5A623" : "#B45309",
                    }}
                  >
                    {d.isBlocked ? "" : value > 0 ? value : "—"}
                  </Box>
                );
              })}
            </Box>

            <Box component="tr">
              <Box
                component="td"
                sx={{
                  ...cellBase,
                  position: "sticky",
                  left: classColWidth,
                  zIndex: 2,
                  bgcolor: totalRowBg,
                  width: labelColWidth,
                  minWidth: labelColWidth,
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  color: "#DC2626",
                  borderRight: "2px solid",
                  borderRightColor: isDark ? "#334155" : "#CBD5E1",
                  px: 0,
                }}
              >
                A
              </Box>
              {dates.map((d) => {
                const total = grandTotals[d.dateKey];
                const value = total?.absent || 0;
                return (
                  <Box
                    component="td"
                    key={d.dateKey}
                    sx={{
                      ...cellBase,
                      width: dateColWidth,
                      minWidth: dateColWidth,
                      bgcolor: d.isBlocked ? blockedBg : totalRowBg,
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: d.isBlocked
                        ? "transparent"
                        : value > 0
                          ? "#DC2626"
                          : "text.disabled",
                    }}
                  >
                    {d.isBlocked ? "" : value > 0 ? value : "—"}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          justifyContent: "center",
        }}
      >
        <LegendItem letter="P" color="#16A34A" label="Present" />
        <LegendItem letter="A" color="#DC2626" label="Absent" />
        <LegendItem
          color={isDark ? "#7F1D1D" : "#FEE2E2"}
          label="Sunday / Holiday"
          isBox
        />
        <LegendItem
          color={isDark ? "#B45309" : "#B45309"}
          label="Grand Total"
          isDouble
        />
      </Box>
    </Paper>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const LegendItem = ({ letter, color, label, isBox, isDouble }) => (
  <Stack direction="row" alignItems="center" spacing={0.5}>
    {letter ? (
      <Box
        sx={{
          minWidth: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          fontWeight: 900,
          fontSize: "0.75rem",
          fontFamily: "monospace",
        }}
      >
        {letter}
      </Box>
    ) : isBox ? (
      <Box
        sx={{
          width: 14,
          height: 14,
          bgcolor: color,
          borderRadius: 0.5,
        }}
      />
    ) : isDouble ? (
      <Box
        sx={{
          width: 14,
          height: 4,
          borderTop: `3px double ${color}`,
        }}
      />
    ) : (
      <Box
        sx={{
          width: 10,
          height: 10,
          bgcolor: color,
          borderRadius: "50%",
        }}
      />
    )}
    <Typography
      variant="caption"
      sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary" }}
    >
      {label}
    </Typography>
  </Stack>
);

// ═══════════════════════════════════════════════════════════════════
//  SHARED CELL STYLES
// ═══════════════════════════════════════════════════════════════════

const cellBase = {
  padding: "4px 4px",
  height: 32,
  boxSizing: "border-box",
  borderBottom: "1px solid",
  borderColor: "divider",
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const stickyHeadStyle = (bg) => ({
  bgcolor: bg,
  fontWeight: 800,
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "text.secondary",
  py: 1,
});

export default MonthlyPage;
