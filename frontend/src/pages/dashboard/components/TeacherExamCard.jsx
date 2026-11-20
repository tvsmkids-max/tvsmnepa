import { Box, Button, Chip, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import examApi from "../../../api/examApi";
import { EXAM_STATUS_LABELS, EXAM_STATUS_COLORS } from "../../exams/examConstants";

const ENTRY_OPEN = ["ongoing", "completed", "marks_entry_in_progress"];
const SHOW = [...ENTRY_OPEN, "marks_submitted", "results_prepared", "results_published", "scheduled"];

/** Dashboard card: the class's examinations and what the teacher should do next. */
export default function TeacherExamCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-exams"],
    queryFn: async () => (await examApi.mine()).data?.data || [],
    staleTime: 60 * 1000,
  });

  if (isLoading) return <Skeleton variant="rounded" height={96} sx={{ mb: 3, borderRadius: 3 }} />;
  const exams = (data || []).filter((e) => SHOW.includes(e.status));
  if (exams.length === 0) return null;

  const action = (e) => {
    if (ENTRY_OPEN.includes(e.status)) return { label: "Enter marks", path: `/exams/mine/${e._id}/marks`, primary: true };
    if (e.status === "results_published") return { label: "View results", path: `/exams/mine/${e._id}/results` };
    if (["marks_submitted", "results_prepared"].includes(e.status)) return { label: "View marks", path: `/exams/mine/${e._id}/marks` };
    return { label: "Details", path: "/exams/mine" };
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ fontWeight: 800 }}>Examinations</Typography>
        <Button size="small" onClick={() => navigate("/exams/mine")}>
          All
        </Button>
      </Stack>
      <Stack spacing={1}>
        {exams.slice(0, 3).map((e) => {
          const a = action(e);
          return (
            <Stack
              key={e._id}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between", py: 0.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
                  {e.name}
                </Typography>
                <Chip
                  size="small"
                  label={EXAM_STATUS_LABELS[e.status]}
                  color={EXAM_STATUS_COLORS[e.status]}
                  sx={{ mt: 0.5, height: 20, fontSize: "0.68rem" }}
                />
              </Box>
              <Button
                size="small"
                variant={a.primary ? "contained" : "outlined"}
                onClick={() => navigate(a.path)}
                sx={{ flexShrink: 0 }}
              >
                {a.label}
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
