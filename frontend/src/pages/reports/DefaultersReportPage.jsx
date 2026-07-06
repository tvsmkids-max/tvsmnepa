import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  Card,
  CardContent,
  Divider,
  Avatar,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import { exportToExcel } from "../../utils/exportUtils";
import { generateDefaulterPdf, downloadPdf } from "../../utils/pdfGenerator";
import useSettings from "../../hooks/useSettings";
import useAuth from "../../hooks/useAuth";

const DefaultersReportPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [defaulterReport, setDefaulterReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  const { settings } = useSettings();
  const { user } = useAuth();

  const presentChipBg = alpha(theme.palette.success.main, isDark ? 0.2 : 0.1);
  const presentChipColor = theme.palette.success.main;
  const absentChipBg = alpha(theme.palette.error.main, isDark ? 0.2 : 0.1);
  const absentChipColor = theme.palette.error.main;

  // ─── Load classes ───
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

  // ─── Load report ───
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getDefaulters({
          class: selectedClass,
          threshold,
        });
        if (!cancelled) {
          setDefaulterReport(res.data?.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed to load", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedClass, threshold, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ─── Filtered defaulters ───
  const filteredDefaulters = React.useMemo(() => {
    if (!defaulterReport?.defaulters) return [];
    if (!search.trim()) return defaulterReport.defaulters;

    const q = search.toLowerCase();
    return defaulterReport.defaulters.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.scholarNumber?.toLowerCase().includes(q) ||
        s.fatherName?.toLowerCase().includes(q) ||
        s.rollNumber?.toString().includes(q),
    );
  }, [defaulterReport, search]);

  // ─── Export ───
  const handleExportExcel = () => {
    if (!defaulterReport) return;
    const data = defaulterReport.defaulters.map((s) => ({
      "Roll No": s.rollNumber,
      Name: s.name,
      Father: s.fatherName,
      Class: s.class ? `${s.class.name}-${s.class.section}` : "—",
      Mobile: s.mobile,
      Present: s.present,
      Absent: s.absent,
      "Total Marks": s.total,
      "Attendance %": `${s.percentage}%`,
    }));
    exportToExcel(data, `defaulters-below-${threshold}`, "Defaulters");
    enqueueSnackbar("Excel exported", { variant: "success" });
  };

  const handleExportPdf = () => {
    if (!defaulterReport) return;
    const doc = generateDefaulterPdf(defaulterReport, settings, user?.name);
    downloadPdf(doc, `defaulters-below-${threshold}`);
    enqueueSnackbar("PDF downloaded", { variant: "success" });
  };

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <PageHeader
        title="Defaulters Report"
        subtitle="Students below attendance threshold"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Reports" },
          { label: "Defaulters" },
        ]}
      />

      {/* ── STICKY FILTER BAR ── */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: { xs: 50, md: 55 },
          zIndex: 5,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <FormControl size="small" sx={{ flex: { sm: 1 } }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Classes</em>
                </MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Threshold %"
              size="small"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 75)}
              inputProps={{ min: 1, max: 100 }}
              sx={{ flex: { sm: 1 } }}
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Search */}
            <TextField
              placeholder="Search student..."
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

            <Tooltip title="Refresh">
              <IconButton
                onClick={triggerRefresh}
                disabled={loading}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportExcel}
              size="small"
              disabled={loading || !defaulterReport}
              sx={{
                py: 1,
                fontWeight: 700,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                background: (t) =>
                  `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
                textTransform: "none",
                minWidth: { xs: 40, sm: "auto" },
                px: { xs: 1, sm: 2 },
              }}
            >
              {!isXs && "Excel"}
            </Button>

            <Button
              variant="contained"
              startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportPdf}
              size="small"
              disabled={loading || !defaulterReport}
              color="error"
              sx={{
                py: 1,
                fontWeight: 700,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                textTransform: "none",
                minWidth: { xs: 40, sm: "auto" },
                px: { xs: 1, sm: 2 },
              }}
            >
              {!isXs && "PDF"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── CONTENT ── */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Box
            component="img"
            src="/loader.svg"
            alt="Loading"
            sx={{ width: 140, height: 140, mb: 2 }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Loading...
          </Typography>
        </Box>
      ) : !defaulterReport ? null : (
        <>
          {/* ── ALERT BANNER ── */}
          <Alert
            severity={defaulterReport.total === 0 ? "success" : "warning"}
            sx={{ mb: 2, borderRadius: 3 }}
            icon={false}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <WarningAmberOutlinedIcon
                sx={{
                  fontSize: 32,
                  color:
                    defaulterReport.total === 0
                      ? "success.main"
                      : "warning.main",
                }}
              />
              <Box>
                <Typography variant="body1" fontWeight={800}>
                  {defaulterReport.total} student
                  {defaulterReport.total !== 1 ? "s" : ""} below {threshold}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", fontSize: "0.75rem" }}
                >
                  {defaulterReport.total === 0
                    ? "All students are in good standing!"
                    : "Consider follow-up actions"}
                </Typography>
              </Box>
            </Stack>
          </Alert>

          {/* ── STUDENT CARDS ── */}
          {filteredDefaulters.length === 0 ? (
            <Paper sx={{ borderRadius: 3 }}>
              <EmptyState
                icon={
                  search ? (
                    <SearchOutlinedIcon sx={{ fontSize: 64 }} />
                  ) : (
                    <CheckCircleOutlinedIcon
                      sx={{ fontSize: 64, color: "success.main" }}
                    />
                  )
                }
                title={search ? "No students match" : "All clear!"}
                message={
                  search
                    ? "Try adjusting your search"
                    : "No students below the threshold."
                }
              />
            </Paper>
          ) : (
            <>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {filteredDefaulters.map((s) => (
                  <Grid item xs={12} sm={6} lg={4} key={s._id}>
                    <Card
                      sx={{
                        borderRadius: 2.5,
                        borderLeft: "4px solid",
                        borderLeftColor:
                          s.percentage < 50 ? "error.main" : "warning.main",
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: "none",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.2s",
                        "&:hover": {
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
                        {/* Header */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                          sx={{ mb: 1.5 }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: alpha(theme.palette.error.main, 0.12),
                              color: "error.main",
                              width: 44,
                              height: 44,
                              fontSize: "1.1rem",
                              fontWeight: 800,
                            }}
                          >
                            {s.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body1"
                              fontWeight={800}
                              noWrap
                              sx={{
                                fontSize: "0.95rem",
                                textTransform: "uppercase",
                              }}
                            >
                              {s.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.72rem" }}
                              noWrap
                              display="block"
                            >
                              F: {s.fatherName || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="h4"
                              fontWeight={900}
                              sx={{
                                fontSize: "1.8rem",
                                lineHeight: 1,
                                color:
                                  s.percentage < 50
                                    ? "error.main"
                                    : "warning.main",
                              }}
                            >
                              {s.percentage}%
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Info chips */}
                        <Stack
                          direction="row"
                          spacing={0.6}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: "auto" }}
                        >
                          <Chip
                            label={`Roll ${s.rollNumber}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                            }}
                          />
                          {s.class && (
                            <Chip
                              label={`${s.class.name}-${s.class.section}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                              }}
                            />
                          )}
                          <Chip
                            label={`✓ ${s.present}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              bgcolor: presentChipBg,
                              color: presentChipColor,
                              fontWeight: 700,
                            }}
                          />
                          <Chip
                            label={`✗ ${s.absent}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              bgcolor: absentChipBg,
                              color: absentChipColor,
                              fontWeight: 700,
                            }}
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Footer */}
              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing <strong>{filteredDefaulters.length}</strong> of{" "}
                  <strong>{defaulterReport.total}</strong> defaulters
                </Typography>
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default DefaultersReportPage;
