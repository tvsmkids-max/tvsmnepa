import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Typography,
  Divider,
  OutlinedInput,
  Box,
  Chip,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import teacherApi from "../../api/teacherApi";
import classApi from "../../api/classApi";
import useSessions from "../../hooks/useSessions";

const createSchema = yup.object({
  employeeId: yup.string().trim().required("Employee ID required"),
  name: yup.string().trim().min(2).required("Name required"),
  email: yup.string().email("Invalid email").required("Email required"),
  password: yup.string().min(8, "Min 8 chars").required("Password required"),
  mobile: yup
    .string()
    .matches(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile")
    .required("Mobile required"),
  alternateMobile: yup.string().nullable(),
  gender: yup.string().required("Gender required"),
  qualification: yup.string(),
  designation: yup.string(),
  joinDate: yup.date().required("Join date required"),
  address: yup.string(),
  session: yup.string().required("Session required"),
});

const updateSchema = yup.object({
  name: yup.string().trim().min(2).required(),
  email: yup.string().email().required(),
  mobile: yup
    .string()
    .matches(/^[6-9]\d{9}$/, "Enter valid mobile")
    .required(),
  gender: yup.string().required(),
  qualification: yup.string(),
  designation: yup.string(),
  joinDate: yup.date().required(),
  address: yup.string(),
  isActive: yup.boolean(),
});

const TeacherFormDialog = ({ open, onClose, onSaved, editingTeacher }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { activeSession, sessions } = useSessions();
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const isEdit = !!editingTeacher;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      employeeId: "",
      name: "",
      email: "",
      password: "",
      mobile: "",
      alternateMobile: "",
      gender: "",
      qualification: "",
      designation: "Teacher",
      joinDate: "",
      address: "",
      session: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    const init = () => {
      if (isEdit) {
        reset({
          name: editingTeacher.name || "",
          email: editingTeacher.email || "",
          mobile: editingTeacher.mobile || "",
          alternateMobile: editingTeacher.alternateMobile || "",
          gender: editingTeacher.gender || "",
          qualification: editingTeacher.qualification || "",
          designation: editingTeacher.designation || "Teacher",
          joinDate: editingTeacher.joinDate
            ? new Date(editingTeacher.joinDate).toISOString().slice(0, 10)
            : "",
          address: editingTeacher.address || "",
          isActive: editingTeacher.isActive ?? true,
        });
        setSelectedClasses(
          editingTeacher.assignedClasses?.map((c) => c._id || c) || [],
        );
      } else {
        reset({
          employeeId: "",
          name: "",
          email: "",
          password: "",
          mobile: "",
          alternateMobile: "",
          gender: "",
          qualification: "",
          designation: "Teacher",
          joinDate: new Date().toISOString().slice(0, 10),
          address: "",
          session: activeSession?._id || "",
          isActive: true,
        });
        setSelectedClasses([]);
      }
    };
    const timer = setTimeout(init, 0);
    return () => clearTimeout(timer);
  }, [open, editingTeacher, isEdit, activeSession, reset]);

  useEffect(() => {
    if (!open || !activeSession?._id) return;
    let cancelled = false;
    const load = async () => {
      setLoadingClasses(true);
      try {
        const res = await classApi.list({
          session: activeSession._id,
          isArchived: false,
          limit: 500,
        });
        if (!cancelled) {
          setClasses(res.data?.data || []);
          setLoadingClasses(false);
        }
      } catch {
        if (!cancelled) {
          setClasses([]);
          setLoadingClasses(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, activeSession?._id]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await teacherApi.update(editingTeacher._id, data);
        if (selectedClasses)
          await teacherApi.assignClasses(editingTeacher._id, selectedClasses);
        enqueueSnackbar("Teacher updated", { variant: "success" });
      } else {
        await teacherApi.create({
          ...data,
          assignedClasses: selectedClasses,
        });
        enqueueSnackbar("Teacher created successfully", { variant: "success" });
      }
      onSaved();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
        <Typography variant="h6" fontWeight={700} component="div">
          {isEdit ? "Edit Teacher" : "Add New Teacher"}
        </Typography>
        {!isEdit && (
          <Typography variant="caption" color="text.secondary" component="div">
            Fill in details to create a teacher account
          </Typography>
        )}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          {/* ─── PERSONAL INFO ─── */}
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 1.5, textTransform: "uppercase" }}
          >
            Personal Info
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {!isEdit && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Employee ID *"
                      placeholder="EMP001"
                      fullWidth
                      size="small"
                      error={!!errors.employeeId}
                      helperText={errors.employeeId?.message}
                    />
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={isEdit ? 8 : 6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Full Name *"
                    fullWidth
                    size="small"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            {isEdit && (
              <Grid item xs={12} sm={4}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value={true}>Active</MenuItem>
                        <MenuItem value={false}>Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.gender}>
                    <InputLabel>Gender *</InputLabel>
                    <Select {...field} label="Gender *">
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="joinDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Join Date *"
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.joinDate}
                    helperText={errors.joinDate?.message}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* ─── CONTACT & ACCOUNT ─── */}
          <Divider sx={{ my: 2 }} />
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 1.5, textTransform: "uppercase" }}
          >
            Contact & Account
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email *"
                    type="email"
                    fullWidth
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>
            {!isEdit && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Login Password *"
                      type="password"
                      fullWidth
                      size="small"
                      error={!!errors.password}
                      helperText={errors.password?.message || "Min 8 chars"}
                    />
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mobile *"
                    fullWidth
                    size="small"
                    error={!!errors.mobile}
                    helperText={errors.mobile?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="alternateMobile"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Alternate Mobile"
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* ─── PROFESSIONAL ─── */}
          <Divider sx={{ my: 2 }} />
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 1.5, textTransform: "uppercase" }}
          >
            Professional
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="designation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Designation"
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="qualification"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Qualification"
                    placeholder="e.g., M.Sc., B.Ed."
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Address"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigned Classes</InputLabel>
                <Select
                  multiple
                  value={selectedClasses}
                  onChange={(e) => setSelectedClasses(e.target.value)}
                  input={<OutlinedInput label="Assigned Classes" />}
                  disabled={loadingClasses}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((id) => {
                        const cls = classes.find((c) => c._id === id);
                        return cls ? (
                          <Chip
                            key={id}
                            label={`${cls.name}-${cls.section}`}
                            size="small"
                          />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {loadingClasses ? (
                    <MenuItem disabled>Loading...</MenuItem>
                  ) : classes.length === 0 ? (
                    <MenuItem disabled>No classes — optional</MenuItem>
                  ) : (
                    classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.name} - {cls.section}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            {!isEdit && (
              <Grid item xs={12}>
                <Controller
                  name="session"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.session}
                    >
                      <InputLabel>Session *</InputLabel>
                      <Select {...field} label="Session *">
                        {sessions.map((s) => (
                          <MenuItem key={s._id} value={s._id}>
                            {s.name} {s.isActive && "(Active)"}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={
              submitting && (
                <CircularProgress size={16} sx={{ color: "white" }} />
              )
            }
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            {submitting
              ? "Saving..."
              : isEdit
                ? "Update Teacher"
                : "Create Teacher"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TeacherFormDialog;
