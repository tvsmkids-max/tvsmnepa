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
  Avatar,
  CircularProgress,
  Chip,
  Stack,
  Menu,
  MenuItem,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LockResetIcon from "@mui/icons-material/LockReset";
import PageHeader from "../../components/common/PageHeader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import TeacherFormDialog from "./TeacherFormDialog";
import TeacherResetPasswordDialog from "./TeacherResetPasswordDialog";
import teacherApi from "../../api/teacherApi";
import useDebounce from "../../hooks/useDebounce";

const TeacherListPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [formOpen, setFormOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [resetTeacher, setResetTeacher] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuTeacher, setMenuTeacher] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await teacherApi.list({
          search: debouncedSearch,
          limit: 100,
        });
        if (!cancelled) {
          setTeachers(res.data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setTeachers([]);
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
  }, [debouncedSearch, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSaved = () => {
    setFormOpen(false);
    setEditingTeacher(null);
    triggerRefresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await teacherApi.delete(confirmDelete._id);
      enqueueSnackbar("Teacher deleted", { variant: "success" });
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

  const handleMenuOpen = (e, teacher) => {
    setMenuAnchor(e.currentTarget);
    setMenuTeacher(teacher);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTeacher(null);
  };

  const handleEditFromMenu = () => {
    setEditingTeacher(menuTeacher);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleResetFromMenu = () => {
    setResetTeacher(menuTeacher);
    setResetOpen(true);
    handleMenuClose();
  };

  const handleDeleteFromMenu = () => {
    setConfirmDelete(menuTeacher);
    handleMenuClose();
  };

  return (
    <Box>
      <PageHeader
        title="Teachers"
        subtitle="Manage teacher accounts and class assignments"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Teachers" },
        ]}
        onAction={() => {
          setEditingTeacher(null);
          setFormOpen(true);
        }}
        actionLabel="Add Teacher"
      />

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <TextField
          placeholder="Search by name, ID, email, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={<PersonIcon sx={{ fontSize: 64 }} />}
            title="No teachers found"
            message={search ? "No match" : "Add your first teacher"}
            actionLabel={!search ? "Add Teacher" : null}
            onAction={
              !search
                ? () => {
                    setEditingTeacher(null);
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
                  <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Classes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t._id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            width: 38,
                            height: 38,
                            fontSize: "0.9rem",
                            fontWeight: 700,
                          }}
                        >
                          {t.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Box sx={{ fontWeight: 600 }}>{t.name}</Box>
                          <Box
                            sx={{
                              fontSize: "0.75rem",
                              color: "text.secondary",
                            }}
                          >
                            {t.designation}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.employeeId}
                        size="small"
                        sx={{
                          bgcolor: "#F1F3F9",
                          fontWeight: 700,
                          fontFamily: "monospace",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.3}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "0.8rem",
                          }}
                        >
                          <EmailIcon
                            fontSize="inherit"
                            sx={{ color: "text.secondary" }}
                          />
                          {t.email}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "0.8rem",
                          }}
                        >
                          <PhoneIcon
                            fontSize="inherit"
                            sx={{ color: "text.secondary" }}
                          />
                          {t.mobile}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {t.assignedClasses?.length > 0 ? (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {t.assignedClasses.slice(0, 3).map((cls) => (
                            <Chip
                              key={cls._id}
                              label={`${cls.name}-${cls.section}`}
                              size="small"
                              sx={{
                                bgcolor: "#E0EBFF",
                                color: "#1E4D98",
                                fontSize: "0.7rem",
                                height: 22,
                              }}
                            />
                          ))}
                          {t.assignedClasses.length > 3 && (
                            <Chip
                              label={`+${t.assignedClasses.length - 3}`}
                              size="small"
                              sx={{ fontSize: "0.7rem", height: 22 }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Box
                          component="span"
                          sx={{
                            color: "text.disabled",
                            fontSize: "0.8rem",
                            fontStyle: "italic",
                          }}
                        >
                          No classes
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={t.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Tooltip title="Edit Teacher">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditingTeacher(t);
                            setFormOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setResetTeacher(t);
                            setResetOpen(true);
                          }}
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Options">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, t)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 180, borderRadius: 2, mt: 0.5 },
        }}
      >
        <MenuItem onClick={handleEditFromMenu}>
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit Profile
        </MenuItem>
        <MenuItem onClick={handleResetFromMenu} sx={{ color: "warning.dark" }}>
          <LockResetIcon fontSize="small" sx={{ mr: 1.5 }} />
          Reset Password
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete Teacher
        </MenuItem>
      </Menu>

      <TeacherFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTeacher(null);
        }}
        onSaved={handleSaved}
        editingTeacher={editingTeacher}
      />

      <TeacherResetPasswordDialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetTeacher(null);
        }}
        teacher={resetTeacher}
        onSuccess={() => {
          // Optional: refresh teacher list after password reset
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Teacher"
        message={`Delete ${confirmDelete?.name}? User account will also be deleted permanently. This cannot be undone.`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
};

export default TeacherListPage;
