import { Box, ButtonBase, Paper, Stack, Typography, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";

const ACTIONS = [
  { label: "Mark Attendance", path: "/attendance/mark", icon: EventNoteOutlinedIcon, color: "#2563EB" },
  { label: "Marks Entry", path: "/exams/mine", icon: EditNoteOutlinedIcon, color: "#7C3AED" },
  { label: "Daily Report", path: "/reports/daily", icon: TodayOutlinedIcon, color: "#16A34A" },
  { label: "Monthly Report", path: "/reports/monthly", icon: CalendarMonthOutlinedIcon, color: "#D97706" },
  { label: "Students", path: "/students", icon: PeopleOutlinedIcon, color: "#0891B2" },
  { label: "Report Cards", path: "/exams/mine/report-cards", icon: QuizOutlinedIcon, color: "#DB2777" },
];

/** One-tap shortcuts for the class teacher: 3 columns on phones, 6 on desktop. */
export default function TeacherQuickActions() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
        gap: { xs: 1, sm: 1.5 },
        mb: 3,
      }}
    >
      {ACTIONS.map(({ label, path, icon: Icon, color }) => (
        <Paper
          key={path}
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden" }}
        >
          <ButtonBase
            onClick={() => navigate(path)}
            sx={{ width: "100%", py: 1.5, px: 0.5, display: "block", minHeight: 88 }}
            aria-label={label}
          >
            <Stack sx={{ alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(color, 0.12),
                  color,
                }}
              >
                <Icon />
              </Box>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>
                {label}
              </Typography>
            </Stack>
          </ButtonBase>
        </Paper>
      ))}
    </Box>
  );
}
