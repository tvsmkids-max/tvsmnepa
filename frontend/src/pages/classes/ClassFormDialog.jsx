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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import classApi from "../../api/classApi";
import teacherApi from "../../api/teacherApi";

const schema = yup.object({
  name: yup.string().trim().required("Class name is required").max(50),
  section: yup.string().trim().required("Section is required").max(20),
  session: yup.string().required("Session is required"),
  classTeacher: yup.string().nullable(),
  displayOrder: yup.number().typeError("Must be a number").min(0).default(0),
  description: yup.string().max(500),
});

const ClassFormDialog = ({
  open,
  onClose,
  onSaved,
  editingClass,
  sessions,
  activeSession,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      section: "",
      session: "",
      classTeacher: "",
      displayOrder: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingClass) {
      reset({
        name: editingClass.name || "",
        section: editingClass.section || "",
        session: editingClass.session?._id || editingClass.session || "",
        classTeacher: editingClass.classTeacher?._id || "",
        displayOrder: editingClass.displayOrder || 0,
        description: editingClass.description || "",
      });
    } else {
      reset({
        name: "",
        section: "",
        session: activeSession?._id || "",
        classTeacher: "",
        displayOrder: 0,
        description: "",
      });
    }
  }, [open, editingClass, activeSession, reset]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingTeachers(true);
      try {
        const res = await teacherApi.list({ limit: 500, isActive: true });
        if (!cancelled) {
          setTeachers(res.data?.data || []);
          setLoadingTeachers(false);
        }
      } catch {
        if (!cancelled) {
          setTeachers([]);
          setLoadingTeachers(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name.trim(),
        section: data.section.trim(),
        session: data.session,
        classTeacher: data.classTeacher || null,
        assignedTeachers: data.classTeacher ? [data.classTeacher] : [],
        displayOrder: data.displayOrder || 0,
        description: data.description || "",
      };
      if (editingClass) {
        delete payload.session;
        await classApi.update(editingClass._id, payload);
        enqueueSnackbar("Class updated", { variant: "success" });
      } else {
        await classApi.create(payload);
        enqueueSnackbar("Class created", { variant: "success" });
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
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
        <Typography variant="h6" fontWeight={700} component="div">
          {editingClass ? "Edit Class" : "Add New Class"}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Class Name *"
                    placeholder="e.g., Nursery, 1, 10"
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
                name="section"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Section *"
                    placeholder="e.g., A, B, Red"
                    fullWidth
                    size="small"
                    error={!!errors.section}
                    helperText={errors.section?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="session"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.session}>
                    <InputLabel>Session *</InputLabel>
                    <Select
                      {...field}
                      label="Session *"
                      disabled={!!editingClass}
                    >
                      {sessions?.length > 0 ? (
                        sessions.map((s) => (
                          <MenuItem key={s._id} value={s._id}>
                            {s.name} {s.isActive && "(Active)"}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          No sessions
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="classTeacher"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Class Teacher</InputLabel>
                    <Select
                      {...field}
                      label="Class Teacher"
                      disabled={loadingTeachers}
                    >
                      <MenuItem value="">
                        <em>Not assigned</em>
                      </MenuItem>
                      {loadingTeachers ? (
                        <MenuItem disabled>Loading...</MenuItem>
                      ) : teachers.length === 0 ? (
                        <MenuItem disabled>No teachers — optional</MenuItem>
                      ) : (
                        teachers.map((t) => (
                          <MenuItem key={t._id} value={t._id}>
                            {t.name} ({t.employeeId})
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="displayOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Display Order"
                    type="number"
                    fullWidth
                    size="small"
                    helperText="Lower numbers appear first"
                    inputProps={{ min: 0 }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
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
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            }}
          >
            {editingClass ? "Update Class" : "Create Class"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ClassFormDialog;
