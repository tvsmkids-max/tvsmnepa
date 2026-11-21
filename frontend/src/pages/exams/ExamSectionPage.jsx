import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import examApi from "../../api/examApi";
import useSessionSelection from "../../hooks/useSessionSelection";
import { EXAM_STATUS_COLORS, EXAM_STATUS_LABELS } from "./examConstants";

// Sidebar shortcut pages: pick an examination, jump straight to one of its tabs.
export const SECTIONS = {
  timetable: { title: "Exam Timetable", tab: "timetable", button: "Open timetable" },
  "admit-cards": { title: "Admit Cards", tab: "admit", button: "Open admit cards" },
  marks: { title: "Marks Monitoring", tab: "marks", button: "Open marks" },
  results: { title: "Results & Publication", tab: "results", button: "Open results" },
};

export default function ExamSectionPage() {
  const { section } = useParams();
  const cfg = SECTIONS[section];
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { sessions, sessionId, setSessionId } = useSessionSelection((m) => enqueueSnackbar(m, { variant: "error" }));
  const [exams, setExams] = useState([]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.list({ session: sessionId, limit: 200 });
        if (!cancelled) setExams(res.data?.data || []);
      } catch {
        if (!cancelled) {
          setExams([]);
          enqueueSnackbar("Failed to load examinations", { variant: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, enqueueSnackbar]);

  if (!cfg) return <EmptyState title="Page not found" />;

  return (
    <>
      <PageHeader title={cfg.title} subtitle="Choose an examination" />
      <Stack sx={{ mb: 2 }}>
        <TextField select size="small" label="Session" value={sessionId} onChange={(e) => setSessionId(e.target.value)} sx={{ maxWidth: 200 }}>
          {sessions.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {exams.length === 0 ? (
        <EmptyState title="No examinations" subtitle="Create an examination first." />
      ) : (
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Examination</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {exams.map((e) => (
                <TableRow key={e._id} hover>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={EXAM_STATUS_LABELS[e.status] || e.status} color={EXAM_STATUS_COLORS[e.status] || "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="contained" onClick={() => navigate(`/exams/${e._id}?tab=${cfg.tab}`)}>
                      {cfg.button}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}
