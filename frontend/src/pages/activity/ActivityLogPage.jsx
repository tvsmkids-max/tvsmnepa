import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  Avatar,
  Tooltip,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import activityLogApi from "../../api/activityLogApi";
import useDebounce from "../../hooks/useDebounce";

// ── Action palette keys (maps to MUI theme palette) ──
// Each entry: { icon, paletteKey } — bg/color derived from theme at render
const ACTION_META = {
  CREATE: { icon: AddOutlinedIcon, paletteKey: "success" },
  UPDATE: { icon: EditOutlinedIcon, paletteKey: "primary" },
  DELETE: { icon: DeleteOutlinedIcon, paletteKey: "error" },
  LOGIN: { icon: LoginOutlinedIcon, paletteKey: "secondary" },
  LOGOUT: { icon: LogoutOutlinedIcon, paletteKey: null }, // gray
  EXPORT: { icon: FileDownloadOutlinedIcon, paletteKey: "info" },
  IMPORT: { icon: FileUploadOutlinedIcon, paletteKey: "warning" },
  LOCK: { icon: LockOutlinedIcon, paletteKey: "error" },
  UNLOCK: { icon: LockOpenOutlinedIcon, paletteKey: "success" },
  MARK_ATTENDANCE: { icon: EventNoteOutlinedIcon, paletteKey: "primary" },
  BACKUP: { icon: FileDownloadOutlinedIcon, paletteKey: "info" },
  RESTORE: { icon: FileUploadOutlinedIcon, paletteKey: "warning" },
  PROMOTE: { icon: CheckCircleOutlinedIcon, paletteKey: "success" },
};

// ── Derive colors from theme at call time ──
const getActionConfig = (action, theme) => {
  const meta = ACTION_META[action] || {
    icon: HistoryOutlinedIcon,
    paletteKey: null,
  };

  const isDark = theme.palette.mode === "dark";

  if (!meta.paletteKey) {
    // Gray fallback
    return {
      Icon: meta.icon,
      color: theme.palette.text.secondary,
      bg: alpha(theme.palette.text.secondary, isDark ? 0.12 : 0.08),
    };
  }

  const palette = theme.palette[meta.paletteKey];
  return {
    Icon: meta.icon,
    color: palette.main,
    bg: alpha(palette.main, isDark ? 0.15 : 0.1),
  };
};

// ── Helpers ──
const formatTime = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// ── Main Component ──
const ActivityLogPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    modules: [],
    actions: [],
  });

  // ── Load filter options ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await activityLogApi.getFilters();
        if (!cancelled)
          setFilterOptions(res.data?.data || { modules: [], actions: [] });
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Load logs ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 30, search: debouncedSearch };
        if (filterModule) params.module = filterModule;
        if (filterAction) params.action = filterAction;
        if (filterStatus) params.status = filterStatus;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const res = await activityLogApi.list(params);
        if (!cancelled) {
          setLogs(res.data?.data || []);
          setTotal(res.data?.pagination?.total || 0);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLogs([]);
          setTotal(0);
          setLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load logs",
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
    page,
    debouncedSearch,
    filterModule,
    filterAction,
    filterStatus,
    dateFrom,
    dateTo,
    refreshKey,
    enqueueSnackbar,
  ]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setPage(1);
  }, []);

  const totalPages = Math.ceil(total / 30);

  const hasFilters =
    filterModule ||
    filterAction ||
    filterStatus ||
    dateFrom ||
    dateTo ||
    debouncedSearch;

  // ── Theme-aware derived colors ──
  const modulChipBg = alpha(theme.palette.text.secondary, isDark ? 0.12 : 0.08);
  const failedBg = alpha(theme.palette.error.main, isDark ? 0.15 : 0.1);
  const adminRoleBg = alpha(theme.palette.warning.main, isDark ? 0.15 : 0.1);
  const teacherRoleBg = alpha(theme.palette.primary.main, isDark ? 0.15 : 0.1);
  const filterDivider = `1px dashed ${theme.palette.divider}`;

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="Activity Logs"
        subtitle={`${total} log${total !== 1 ? "s" : ""} recorded`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Activity Logs" },
        ]}
        action={
          <Tooltip title="Refresh">
            <IconButton onClick={triggerRefresh} size="small">
              <RefreshOutlinedIcon />
            </IconButton>
          </Tooltip>
        }
      />

      {/* ── Filters Panel ── */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Filter Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <FilterAltOutlinedIcon
            sx={{ color: "text.secondary", fontSize: 18 }}
          />
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{
              textTransform: "uppercase",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
            }}
          >
            Filters
          </Typography>
        </Stack>

        <Grid container spacing={1.5}>
          {/* Search */}
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Search logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
            />
          </Grid>

          {/* Module */}
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Module</InputLabel>
              <Select
                value={filterModule}
                label="Module"
                onChange={(e) => {
                  setFilterModule(e.target.value);
                  setPage(1);
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All</MenuItem>
                {filterOptions.modules.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Action */}
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={filterAction}
                label="Action"
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All</MenuItem>
                {filterOptions.actions.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date From */}
          <Grid item xs={6} md={2.5}>
            <TextField
              type="date"
              label="From"
              size="small"
              fullWidth
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>

          {/* Date To */}
          <Grid item xs={6} md={2.5}>
            <TextField
              type="date"
              label="To"
              size="small"
              fullWidth
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: formatDate(new Date()) }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>
        </Grid>

        {/* Active Filter Chips */}
        {hasFilters && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: filterDivider,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.disabled"
              sx={{ fontSize: "0.65rem" }}
            >
              ACTIVE:
            </Typography>
            {filterModule && (
              <Chip
                label={`Module: ${filterModule}`}
                size="small"
                onDelete={() => setFilterModule("")}
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
            {filterAction && (
              <Chip
                label={`Action: ${filterAction}`}
                size="small"
                onDelete={() => setFilterAction("")}
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
            {dateFrom && (
              <Chip
                label={`From: ${dateFrom}`}
                size="small"
                onDelete={() => setDateFrom("")}
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
            {dateTo && (
              <Chip
                label={`To: ${dateTo}`}
                size="small"
                onDelete={() => setDateTo("")}
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
            {debouncedSearch && (
              <Chip
                label={`Search: ${debouncedSearch}`}
                size="small"
                onDelete={() => setSearch("")}
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
          </Stack>
        )}
      </Paper>

      {/* ── Logs List ── */}
      <Paper
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<HistoryOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No activity logs"
            message={
              hasFilters
                ? "No logs match your filters"
                : "System actions will appear here as they happen"
            }
          />
        ) : (
          <>
            {logs.map((log, idx) => {
              const config = getActionConfig(log.action, theme);
              const { Icon } = config;
              const isLast = idx === logs.length - 1;
              const userRole = log.userRole || log.user?.role || "";

              return (
                <Box
                  key={log._id}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 2,
                    borderBottom: isLast ? "none" : "1px solid",
                    borderColor: "divider",
                    transition: "background-color 0.1s",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* ── Action Icon ── */}
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: config.bg,
                        flexShrink: 0,
                        mt: 0.3,
                      }}
                    >
                      <Icon sx={{ color: config.color, fontSize: 18 }} />
                    </Avatar>

                    {/* ── Content ── */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Description */}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                          fontSize: "0.85rem",
                          lineHeight: 1.4,
                          mb: 0.5,
                        }}
                      >
                        {log.description}
                      </Typography>

                      {/* Meta row */}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {/* User */}
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <PersonOutlinedIcon
                            sx={{
                              fontSize: 13,
                              color: "text.disabled",
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="text.secondary"
                            sx={{ fontSize: "0.72rem" }}
                          >
                            {log.userName || log.user?.name || "—"}
                          </Typography>
                        </Stack>

                        {/* Module chip */}
                        <Chip
                          label={log.module}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            bgcolor: modulChipBg,
                            color: "text.secondary",
                          }}
                        />

                        {/* Action chip */}
                        <Chip
                          label={log.action}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            bgcolor: config.bg,
                            color: config.color,
                          }}
                        />

                        {/* Failed chip */}
                        {log.status === "failed" && (
                          <Chip
                            icon={<CancelOutlinedIcon sx={{ fontSize: 12 }} />}
                            label="Failed"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              bgcolor: failedBg,
                              color: "error.main",
                            }}
                          />
                        )}

                        {/* Time */}
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {formatTime(log.createdAt)}
                        </Typography>
                      </Stack>

                      {/* IP address */}
                      {log.ipAddress && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{
                            fontSize: "0.65rem",
                            display: "block",
                            mt: 0.5,
                            fontFamily: "monospace",
                          }}
                        >
                          IP: {log.ipAddress}
                        </Typography>
                      )}
                    </Box>

                    {/* ── Role Badge ── */}
                    <Chip
                      label={userRole || "—"}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        flexShrink: 0,
                        bgcolor:
                          userRole === "admin" ? adminRoleBg : teacherRoleBg,
                        color:
                          userRole === "admin"
                            ? "warning.main"
                            : "primary.main",
                      }}
                    />
                  </Stack>
                </Box>
              );
            })}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 2,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, p) => setPage(p)}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ActivityLogPage;
