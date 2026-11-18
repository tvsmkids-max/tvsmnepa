import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Chip,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
      {exams.map((e) => (
        <Paper key={e._id} sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 1 }}
          >
            <Box>
              <Typography variant="h6">{e.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {examTypeLabel(e.examType)} · {e.session?.name} · {fmt(e.startDate)} →{" "}
                {fmt(e.endDate)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              {e.status === "results_published" && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/exams/mine/${e._id}/results`)}
                >
                  View results
                </Button>
              )}
              {MARKS_STATUSES.includes(e.status) && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate(`/exams/mine/${e._id}/marks`)}
                >
                  {e.status === "marks_entry_in_progress" || e.status === "completed"
                    ? "Enter marks"
                    : "View marks"}
                </Button>
              )}
              <Chip
                size="small"
                label={EXAM_STATUS_LABELS[e.status]}
                color={EXAM_STATUS_COLORS[e.status]}
              />
            </Stack>
          </Stack>
          {e.instructions && (
            <Alert severity="info" sx={{ mb: 1.5, whiteSpace: "pre-line" }}>
              {e.instructions}
            </Alert>
          )}
          {e.timetable?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Timetable
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {e.timetable.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>{t.date}</TableCell>
                      <TableCell>{t.subjectName}</TableCell>
                      <TableCell>
                        {t.startTime} - {t.endTime}
                      </TableCell>
                      <TableCell>{t.remarks || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Max marks</TableCell>
                <TableCell align="right">Passing marks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {e.subjects.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell align="right">{s.maxMarks}</TableCell>
                  <TableCell align="right">{s.passingMarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ))}
    </Box>
  );
};

export default ExamMyClassPage;
