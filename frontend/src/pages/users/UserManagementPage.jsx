import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import PageHeader from "../../components/common/PageHeader";
import userApi from "../../api/userApi";
import { useSnackbar } from "notistack";

const UserManagementPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [credential, setCredential] = useState("");
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

  useEffect(() => { load(); }, []);

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
                  <Button size="small" color={user.isActive ? "error" : "primary"} onClick={() => toggleStatus(user)}>
                    {user.isActive ? "Disable" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
