import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import SearchIcon from "@mui/icons-material/Search";
import ClassIcon from "@mui/icons-material/Class";
import PeopleIcon from "@mui/icons-material/People";
import PageHeader from "../../components/common/PageHeader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import ClassFormDialog from "./ClassFormDialog";
import classApi from "../../api/classApi";
import useSessions from "../../hooks/useSessions";
import useAuth from "../../hooks/useAuth";

const ClassListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const { sessions, activeSession } = useSessions();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterArchived, setFilterArchived] = useState("false");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (activeSession?._id && !filterSession) {
      const timer = setTimeout(() => setFilterSession(activeSession._id), 0);
      return () => clearTimeout(timer);
    }
  }, [activeSession, filterSession]);

  useEffect(() => {
    if (!filterSession) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await classApi.list({
          session: filterSession,
          isArchived: filterArchived === "true",
          limit: 500,
        });
        if (!cancelled) {
          setClasses(res.data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setClasses([]);
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
  }, [filterSession, filterArchived, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSaved = () => {
    setFormOpen(false);
    setEditingClass(null);
    triggerRefresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await classApi.delete(confirmDelete._id);
      enqueueSnackbar("Class deleted", { variant: "success" });
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

  const handleArchive = async () => {
    if (!confirmArchive) return;
    setActionLoading(true);
    try {
      await classApi.archive(confirmArchive._id, !confirmArchive.isArchived);
      enqueueSnackbar(
        confirmArchive.isArchived ? "Class unarchived" : "Class archived",
        { variant: "success" },
      );
      setConfirmArchive(null);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = classes.filter((cls) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      cls.name?.toLowerCase().includes(s) ||
      cls.section?.toLowerCase().includes(s) ||
      cls.classTeacher?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <Box>
      <PageHeader
        title="Classes"
        subtitle="Manage classes and sections"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Classes" },
        ]}
        onAction={
          isAdmin
            ? () => {
                setEditingClass(null);
                setFormOpen(true);
              }
            : null
        }
        actionLabel="Add Class"
      />

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Session</InputLabel>
            <Select
              value={filterSession}
              label="Session"
              onChange={(e) => setFilterSession(e.target.value)}
            >
              {sessions.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name} {s.isActive && "(Active)"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterArchived}
              label="Status"
              onChange={(e) => setFilterArchived(e.target.value)}
            >
              <MenuItem value="false">Active</MenuItem>
              <MenuItem value="true">Archived</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClassIcon sx={{ fontSize: 64 }} />}
            title="No classes found"
            message={
              search ? "Try different search" : "Create your first class"
            }
            actionLabel={isAdmin && !search ? "Add Class" : null}
            onAction={
              isAdmin && !search
                ? () => {
                    setEditingClass(null);
                    setFormOpen(true);
                  }
                : null
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Students</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {isAdmin && (
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((cls, idx) => (
                  <TableRow key={cls._id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{cls.name}</Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cls.section}
                        size="small"
                        sx={{
                          bgcolor: "#E0EBFF",
                          color: "#1E4D98",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {cls.classTeacher?.name || (
                        <Box
                          component="span"
                          sx={{ color: "text.disabled", fontStyle: "italic" }}
                        >
                          Not assigned
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "primary.main",
                          fontWeight: 600,
                        }}
                      >
                        <PeopleIcon fontSize="small" />
                        {cls.studentCount || 0}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cls.isArchived ? "Archived" : "Active"}
                        size="small"
                        color={cls.isArchived ? "default" : "success"}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell sx={{ textAlign: "right" }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setEditingClass(cls);
                              setFormOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={cls.isArchived ? "Unarchive" : "Archive"}
                        >
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setConfirmArchive(cls)}
                          >
                            {cls.isArchived ? (
                              <UnarchiveIcon fontSize="small" />
                            ) : (
                              <ArchiveIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setConfirmDelete(cls)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ClassFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingClass(null);
        }}
        onSaved={handleSaved}
        editingClass={editingClass}
        sessions={sessions}
        activeSession={activeSession}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Class"
        message={`Delete "${confirmDelete?.name} - ${confirmDelete?.section}"?`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmArchive}
        title={confirmArchive?.isArchived ? "Unarchive Class" : "Archive Class"}
        message={`${confirmArchive?.isArchived ? "Unarchive" : "Archive"} "${confirmArchive?.name} - ${confirmArchive?.section}"?`}
        confirmText={confirmArchive?.isArchived ? "Unarchive" : "Archive"}
        severity="warning"
        loading={actionLoading}
        onConfirm={handleArchive}
        onClose={() => setConfirmArchive(null)}
      />
    </Box>
  );
};

export default ClassListPage;
