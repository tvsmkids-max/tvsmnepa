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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import studentApi from "../../api/studentApi";
import useSessions from "../../hooks/useSessions";

// ═══════════════════════════════════════════════════════════════════
//  VALIDATION SCHEMAS (Unfailing & Rigid)
// ═══════════════════════════════════════════════════════════════════
const baseSchema = {
  scholarNumber: yup.string().trim().required("Scholar number required"),
  name: yup.string().trim().min(2).required("Name required"),
  fatherName: yup.string().trim().min(2).required("Father's name required"),
  motherName: yup.string().trim().min(2).required("Mother's name required"),
  mobile: yup
    .string()
    .matches(/^[6-9]\d{9}$/, "Valid 10-digit mobile")
    .required("Mobile required"),
  alternateMobile: yup.string().nullable(),
  dob: yup
    .date()
    .max(new Date(), "DOB cannot be future")
    .required("DOB required"),
  gender: yup.string().required("Gender required"),
  address: yup.string().trim().min(5).required("Address required"),
  class: yup.string().required("Class required"),
  bloodGroup: yup.string().nullable(),
  category: yup.string().nullable(),
  religion: yup.string().nullable(),
  aadharNumber: yup.string().nullable(),
};

const createSchema = yup.object({
  ...baseSchema,
  admissionDate: yup.date().required("Admission date required"),
});

const updateSchema = yup.object(baseSchema);

const StudentFormDialog = ({
  open,
  onClose,
  onSaved,
  editingStudent,
  classes,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { activeSession } = useSessions();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!editingStudent;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      scholarNumber: "",
      name: "",
      fatherName: "",
      motherName: "",
      mobile: "",
      alternateMobile: "",
      dob: "",
      gender: "",
      address: "",
      class: "",
      admissionDate: "",
      bloodGroup: "",
      category: "",
      religion: "",
      aadharNumber: "",
    },
  });

  // ═══════════════════════════════════════════════════════════════════
  //  FORM INITIALIZATION (Supports Editable Scholar Number on Edit)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!open) return;
    const init = () => {
      if (isEdit) {
        reset({
          scholarNumber: editingStudent.scholarNumber || "",
          name: editingStudent.name || "",
          fatherName: editingStudent.fatherName || "",
          motherName: editingStudent.motherName || "",
          mobile: editingStudent.mobile || "",
          alternateMobile: editingStudent.alternateMobile || "",
          dob: editingStudent.dob
            ? new Date(editingStudent.dob).toISOString().slice(0, 10)
            : "",
          gender: editingStudent.gender || "",
          address: editingStudent.address || "",
          class: editingStudent.class?._id || editingStudent.class || "",
          bloodGroup: editingStudent.bloodGroup || "",
          category: editingStudent.category || "",
          religion: editingStudent.religion || "",
          aadharNumber: editingStudent.aadharNumber || "",
        });
      } else {
        reset({
          scholarNumber: "",
          name: "",
          fatherName: "",
          motherName: "",
          mobile: "",
          alternateMobile: "",
          dob: "",
          gender: "",
          address: "",
          class: "",
          admissionDate: new Date().toISOString().slice(0, 10),
          bloodGroup: "",
          category: "",
          religion: "",
          aadharNumber: "",
        });
      }
    };
    const timer = setTimeout(init, 0);
    return () => clearTimeout(timer);
  }, [open, editingStudent, isEdit, reset]);

  // ═══════════════════════════════════════════════════════════════════
  //  SUBMISSION HANDLER
  // ═══════════════════════════════════════════════════════════════════
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const cls = classes.find((c) => c._id === data.class);
      const payload = { ...data, section: cls?.section || "" };

      if (isEdit) {
        delete payload.admissionDate;
        await studentApi.update(editingStudent._id, payload);
        enqueueSnackbar("Student updated successfully", { variant: "success" });
      } else {
        payload.session = activeSession?._id;
        await studentApi.create(payload);
        enqueueSnackbar("Student added successfully", { variant: "success" });
      }
      onSaved();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Operation failed", {
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
          {isEdit ? "Edit Student" : "Add New Student"}
        </Typography>
        {isEdit && (
          <Typography variant="caption" color="text.secondary" component="div">
            Scholar #: {editingStudent?.scholarNumber}
          </Typography>
        )}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          {/* SECTION 1: Basic Info */}
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 2, textTransform: "uppercase" }}
          >
            Basic Info
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="scholarNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Scholar Number *"
                    placeholder="SCH001"
                    fullWidth
                    size="small"
                    error={!!errors.scholarNumber}
                    helperText={
                      errors.scholarNumber?.message ||
                      "Scholar number must be unique."
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Student Name *"
                    fullWidth
                    size="small"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="fatherName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Father's Name *"
                    fullWidth
                    size="small"
                    error={!!errors.fatherName}
                    helperText={errors.fatherName?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="motherName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mother's Name *"
                    fullWidth
                    size="small"
                    error={!!errors.motherName}
                    helperText={errors.motherName?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="dob"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date of Birth *"
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.dob}
                    helperText={errors.dob?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <Controller
                name="bloodGroup"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Blood Group</InputLabel>
                    <Select {...field} label="Blood Group">
                      <MenuItem value="">N/A</MenuItem>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                        (bg) => (
                          <MenuItem key={bg} value={bg}>
                            {bg}
                          </MenuItem>
                        ),
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* SECTION 2: Contact & Address */}
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 2, textTransform: "uppercase" }}
          >
            Contact & Address
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
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
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Address *"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* SECTION 3: Academic & Other */}
          <Typography
            variant="caption"
            color="primary"
            fontWeight={700}
            sx={{ display: "block", mb: 2, textTransform: "uppercase" }}
          >
            Academic & Other
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="class"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.class}>
                    <InputLabel>Class *</InputLabel>
                    <Select {...field} label="Class *">
                      {classes.map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name} - {c.section}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            {!isEdit && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="admissionDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Admission Date *"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.admissionDate}
                      helperText={errors.admissionDate?.message}
                    />
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select {...field} label="Category">
                      <MenuItem value="">N/A</MenuItem>
                      {["General", "OBC", "SC", "ST", "EWS"].map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="religion"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Religion"
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="aadharNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Aadhar Number"
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
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
          >
            {isEdit ? "Save Changes" : "Add Student"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentFormDialog;
