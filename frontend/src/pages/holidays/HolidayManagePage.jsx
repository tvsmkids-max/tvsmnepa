import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  CircularProgress,
  Typography,
  Alert,
} from "@mui/material";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";

import HolidayHeader from "./components/HolidayHeader";
import HolidayFilterBar from "./components/HolidayFilterBar";
import HolidayCard from "./components/HolidayCard";
import HolidayFormDialog from "./components/HolidayFormDialog";

import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";

import useAuth from "../../hooks/useAuth";
import useSessions from "../../hooks/useSessions";
import useDebounce from "../../hooks/useDebounce";
import {
  useHolidayList,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "../../hooks/useHolidays";

const DEFAULT_FILTERS = {
  search: "",
  type: "",
  timeframe: "all",
};

const HolidayManagePage = () => {
  const { isAdmin } = useAuth();
  const { activeSession } = useSessions();

  // ─── FILTERS ───
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 400);

  // ─── TANSTACK QUERY ───
  const {
    data: holidays = [],
    isLoading,
    isFetching,
    refetch,
  } = useHolidayList(
    { session: activeSession?._id },
    { enabled: !!activeSession?._id },
  );

  // ─── CLIENT-SIDE FILTERING (search + type + timeframe + sort) ───
  const filteredHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    let result = [...holidays];

    // Search
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(
        (h) =>
          h.name?.toLowerCase().includes(s) ||
          h.description?.toLowerCase().includes(s),
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter((h) => h.type === filters.type);
    }

    // Timeframe filter
    if (filters.timeframe && filters.timeframe !== "all") {
      result = result.filter((h) => {
        const startDate = new Date(h.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = h.endDate ? new Date(h.endDate) : new Date(h.date);
        endDate.setHours(23, 59, 59, 999);

        const startMs = startDate.getTime();
        const endMs = endDate.getTime();

        if (filters.timeframe === "today") {
          return todayMs >= startMs && todayMs <= endMs;
        }
        if (filters.timeframe === "upcoming") {
          return startMs >= todayMs;
        }
        if (filters.timeframe === "past") {
          return endMs < todayMs;
        }
        return true;
      });
    }

    // Sort: upcoming first, then today, then past
    result.sort((a, b) => {
      const aStart = new Date(a.date).getTime();
      const bStart = new Date(b.date).getTime();
      const aPast = aStart < todayMs;
      const bPast = bStart < todayMs;

      if (aPast && !bPast) return 1;
      if (!aPast && bPast) return -1;

      // Both past: most recent first
      if (aPast && bPast) return bStart - aStart;

      // Both upcoming: nearest first
      return aStart - bStart;
    });

    return result;
  }, [holidays, debouncedSearch, filters.type, filters.timeframe]);

  // ─── STATS ───
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    let upcoming = 0;
    let past = 0;
    let todayCount = 0;

    holidays.forEach((h) => {
      const startMs = new Date(h.date).setHours(0, 0, 0, 0);
      const endMs = h.endDate
        ? new Date(h.endDate).setHours(23, 59, 59, 999)
        : new Date(h.date).setHours(23, 59, 59, 999);

      if (todayMs >= startMs && todayMs <= endMs) todayCount++;
      else if (startMs < todayMs) past++;
      else upcoming++;
    });

    return { upcoming, past, today: todayCount };
  }, [holidays]);

  // ─── MUTATIONS ───
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  // ─── DIALOG STATES ───
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── HANDLERS ───
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((holiday) => {
    setEditing(holiday);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((holiday) => {
    setConfirmDelete(holiday);
  }, []);

  const handleSave = useCallback(
    async (formData) => {
      try {
        const payload = {
          ...formData,
          session: activeSession._id,
        };

        if (editing) {
          delete payload.session;
          await updateMutation.mutateAsync({
            id: editing._id,
            data: payload,
          });
        } else {
          await createMutation.mutateAsync(payload);
        }
        setFormOpen(false);
        setEditing(null);
        refetch();
      } catch {
        // Errors handled by mutation hooks
      }
    },
    [activeSession, editing, createMutation, updateMutation, refetch],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      setConfirmDelete(null);
    } catch {
      // Error handled
    }
  }, [confirmDelete, deleteMutation]);

  // ─── NO SESSION FALLBACK ───
  if (!activeSession) {
    return (
      <Box>
        <HolidayHeader isAdmin={isAdmin} />
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<BeachAccessIcon sx={{ fontSize: 64 }} />}
            title="No active session"
            message="Create an active academic session first to manage holidays."
          />
        </Paper>
      </Box>
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* HEADER */}
      <HolidayHeader
        total={filteredHolidays.length}
        sessionName={activeSession.name}
        isAdmin={isAdmin}
        onAdd={handleOpenCreate}
      />

      {/* TODAY ALERT */}
      {stats.today > 0 && filters.timeframe !== "today" && (
        <Alert
          severity="success"
          icon={<BeachAccessIcon />}
          sx={{
            mb: 2,
            borderRadius: 3,
            cursor: "pointer",
            "&:hover": { bgcolor: "success.100" },
          }}
          onClick={() => handleFilterChange({ ...filters, timeframe: "today" })}
        >
          <Typography variant="body2" fontWeight={800}>
            🎉 {stats.today} holiday{stats.today !== 1 ? "s" : ""} today!
          </Typography>
          <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
            Click to view
          </Typography>
        </Alert>
      )}

      {/* FILTERS */}
      <HolidayFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* BODY */}
      {isLoading ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading holidays...
          </Typography>
        </Paper>
      ) : filteredHolidays.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<BeachAccessIcon sx={{ fontSize: 64 }} />}
            title={
              holidays.length === 0
                ? "No holidays added"
                : "No holidays match your filters"
            }
            message={
              holidays.length === 0
                ? "Add school, national, or vacation holidays for the session."
                : "Try adjusting your search or filters"
            }
            actionLabel={
              isAdmin && holidays.length === 0
                ? "Add First Holiday"
                : holidays.length > 0
                  ? "Reset Filters"
                  : null
            }
            onAction={
              isAdmin && holidays.length === 0
                ? handleOpenCreate
                : holidays.length > 0
                  ? handleResetFilters
                  : null
            }
          />
        </Paper>
      ) : (
        <>
          {/* Background loading indicator */}
          {isFetching && !isLoading && (
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                justifyContent: "center",
                mb: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  px: 2,
                  py: 0.4,
                  borderRadius: 2,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  boxShadow: "0 4px 12px rgba(13,27,62,0.2)",
                }}
              >
                <CircularProgress size={10} sx={{ color: "white" }} />
                Refreshing...
              </Box>
            </Box>
          )}

          {/* HOLIDAY GRID */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {filteredHolidays.map((holiday) => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={holiday._id}>
                <HolidayCard
                  holiday={holiday}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>

          {/* Stats Footer */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{filteredHolidays.length}</strong> holiday
              {filteredHolidays.length !== 1 ? "s" : ""}
              {" • "}
              <strong>{stats.upcoming}</strong> upcoming
              {" • "}
              <strong>{stats.past}</strong> past
              {stats.today > 0 && (
                <>
                  {" • "}
                  <strong style={{ color: "#16A34A" }}>
                    {stats.today} today
                  </strong>
                </>
              )}
            </Typography>
          </Box>
        </>
      )}

      {/* DIALOGS */}
      <HolidayFormDialog
        open={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSave={handleSave}
        editing={editing}
        loading={saving}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Holiday"
        message={`Delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
};

export default HolidayManagePage;
