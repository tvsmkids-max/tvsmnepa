import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import classApi from "../../api/classApi";
import MenuItem from "@mui/material/MenuItem";
import PageHeader from "../../components/common/PageHeader";
import userApi from "../../api/userApi";
import { useSnackbar } from "notistack";

const UserManagementPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [credential, setCredential] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [deleteUser, setDeleteUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await userApi.list();
      setUsers(response.data?.data || []);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Unable to load users", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    classApi.list({ limit: 100 }).then((response) => {
      setClasses(response.data?.data?.classes || response.data?.data || []);
    }).catch(() => {});
  }, []);

  const toggleStatus = async (user) => {
    try {
      await userApi.setStatus(user._id, !user.isActive);
      enqueueSnackbar(`Account ${user.isActive ? "deactivated" : "activated"}`, { variant: "success" });
      load();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Unable to update account", { variant: "error" });
    }
  };

  const resetCredential = async () => {
    try {
      await userApi.resetCredential(selected._id, credential);
      enqueueSnackbar("Credential reset successfully", { variant: "success" });
      setSelected(null);
      setCredential("");
      load();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Credential reset failed", { variant: "error" });
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditName(user.name);
    setEditClass(user.linkedClass?._id || "");
  };

  const saveDetails = async () => {
    try {
      await userApi.updateDetails(editUser._id, {
        name: editName,
        linkedClass: editClass || null,
      });
      enqueueSnackbar("User details updated", { variant: "success" });
      setEditUser(null);
      load();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Unable to update user", { variant: "error" });
    }
  };

  const confirmDelete = async () => {
    try {
      await userApi.delete(deleteUser._id);
      enqueueSnackbar("User deleted", { variant: "success" });
      setDeleteUser(null);
      load();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Unable to delete user", { variant: "error" });
    }
  };

  const unlock = async (user) => {
    try {
      await userApi.unlock(user._id);
      enqueueSnackbar("Login lock cleared", { variant: "success" });
      load();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Unable to clear lock", { variant: "error" });
    }
  };

  return (
    <Box>
      <PageHeader title="User Management" subtitle="Manage account access, credentials and login locks" />
      <Alert severity="info" sx={{ mb: 2 }}>
        Disabling an account does not delete attendance records or historical user references.
      </Alert>
      <TableContainer component={Paper} sx={{ opacity: loading ? 0.6 : 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Class</TableCell>
              <TableCell>Status</TableCell><TableCell>Lock</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell><Typography fontWeight={600}>{user.name}</Typography></TableCell>
                <TableCell>{user.role === "class" ? "Class PIN" : user.role}</TableCell>
                <TableCell>{user.linkedClass ? `${user.linkedClass.name} - ${user.linkedClass.section}` : "—"}</TableCell>
                <TableCell><Chip size="small" label={user.isActive ? "Active" : "Disabled"} color={user.isActive ? "success" : "default"} /></TableCell>
                <TableCell>{user.isLocked ? <Chip size="small" label="Locked" color="warning" /> : "—"}</TableCell>
                <TableCell align="right">
                  {user.isLocked && (
                    <IconButton color="warning" title="Clear login lock" onClick={() => unlock(user)}><LockOpenOutlinedIcon /></IconButton>
                  )}
                  <IconButton title="Reset credential" onClick={() => { setSelected(user); setCredential(""); }}><RestartAltOutlinedIcon /></IconButton>
                  <IconButton color="primary" title="Edit user details" onClick={() => openEdit(user)}><EditOutlinedIcon /></IconButton>
                  <IconButton color="error" title="Delete user" onClick={() => setDeleteUser(user)}><DeleteOutlinedIcon /></IconButton>
                  <Button size="small" color={user.isActive ? "error" : "primary"} onClick={() => toggleStatus(user)}>
                    {user.isActive ? "Disable" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(editUser)} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit User Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField autoFocus fullWidth label="Account name" value={editName} onChange={(event) => setEditName(event.target.value)} />
            {editUser?.role === "class" && (
              <TextField select fullWidth label="Linked class" value={editClass} onChange={(event) => setEditClass(event.target.value)}>
                <MenuItem value="">No linked class</MenuItem>
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass._id} value={schoolClass._id}>
                    {schoolClass.name} - {schoolClass.section}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveDetails}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteUser)} onClose={() => setDeleteUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            Permanently delete <strong>{deleteUser?.name}</strong>? Attendance records will be kept and the teacher name will be saved as historical attribution.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset {selected?.role === "class" ? "Class PIN" : "Password"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            {selected?.name}. Other login sessions will be signed out.
          </Typography>
          <TextField autoFocus fullWidth type="password" label={selected?.role === "class" ? "New 5-digit PIN" : "New password"}
            value={credential} onChange={(event) => setCredential(event.target.value)} helperText={selected?.role === "class" ? "Exactly five digits" : "8+ characters, upper/lowercase, number and special character"} />
        </DialogContent>
        <DialogActions><Button onClick={() => setSelected(null)}>Cancel</Button><Button variant="contained" onClick={resetCredential}>Reset</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
