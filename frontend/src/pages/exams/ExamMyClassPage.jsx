import { TimetableTable, SubjectMarksTable } from "./ExamTables";
import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Chip,
  Typography,
  Stack,
  LinearProgress,
  Alert,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import examApi from "../../api/examApi";
import {
  EXAM_STATUS_LABELS,
  EXAM_STATUS_COLORS,
  examTypeLabel,
} from "./examConstants";

const MARKS_STATUSES = [
  "ongoing",
  "completed",
  "marks_entry_in_progress",
  "marks_submitted",
  "results_prepared",
  "results_published",
];

const fmt = (d) => (d ? String(d).slice(0, 10) : "—");

const ExamMyClassPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.mine();
        if (!cancelled) setExams(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          setExams([]);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load examinations",
            { variant: "error" },
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  return (
    <Box>
      <PageHeader
        title="My Class Examinations"
        subtitle="Examinations scheduled for your class"
      />
      {loading && <LinearProgress />}
      {!loading && exams.length === 0 && (
        <Paper>
          <EmptyState
            title="No examinations yet"
            message="Examinations appear here once the admin schedules them for your class."
          />
        </Paper>
      )}
      {exams.map((e) => e.comingSoon ? (
        <Paper key={e._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="h6">{e.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {examTypeLabel(e.examType)} · {e.session?.name}
                {e.startDate ? ` · ${fmt(e.startDate)} → ${fmt(e.endDate)}` : ""}
              </Typography>
            </Box>
            <Chip size="small" label="Coming soon" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The admin is still preparing this examination. Subjects, timetable and marks entry will open once it is scheduled.
          </Typography>
        </Paper>
      ) : (
        <Paper key={e._id} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography variant="h6" sx={{ lineHeight: 1.3 }}>{e.name}</Typography>
            <Chip
              size="small"
              label={EXAM_STATUS_LABELS[e.status]}
              color={EXAM_STATUS_COLORS[e.status]}
              sx={{ flexShrink: 0 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {examTypeLabel(e.examType)} · {e.session?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fmt(e.startDate)} → {fmt(e.endDate)}
          </Typography>
          {(e.status === "results_published" || MARKS_STATUSES.includes(e.status)) && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 1.5 }}>
              {MARKS_STATUSES.includes(e.status) && (
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  onClick={() => navigate(`/exams/mine/${e._id}/marks`)}
                >
                  {["ongoing", "completed", "marks_entry_in_progress"].includes(e.status)
                    ? "Enter marks"
                    : "View marks"}
                </Button>
              )}
              {e.status === "results_published" && (
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/exams/mine/${e._id}/results`)}
                >
                  View results
                </Button>
              )}
            </Stack>
          )}
          {e.instructions && (
            <Alert severity="info" sx={{ mb: 1.5, whiteSpace: "pre-line" }}>
              {e.instructions}
            </Alert>
          )}
          {e.timetable?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.75, fontWeight: 700 }}>
                Timetable
              </Typography>
              <TimetableTable entries={e.timetable} sx={{ mb: 2 }} />
            </>
          )}
          <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700 }}>
            Subjects and marks
          </Typography>
          <SubjectMarksTable subjects={e.subjects} showPassing={false} />
        </Paper>
      ))}
    </Box>
  );
};

export default ExamMyClassPage;
