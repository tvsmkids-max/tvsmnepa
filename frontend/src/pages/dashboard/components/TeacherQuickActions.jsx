import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const LINKS = [
  { label: "Daily report", path: "/reports/daily" },
  { label: "Monthly report", path: "/reports/monthly" },
  { label: "Students", path: "/students" },
  { label: "Report cards", path: "/exams/mine/report-cards" },
];

/** Secondary shortcuts: a plain list, below the attendance section. */
export default function TeacherQuickActions() {
  const navigate = useNavigate();
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1 }}>More</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
        {LINKS.map(({ label, path }, i) => (
          <ButtonBase
            key={path}
            onClick={() => navigate(path)}
            sx={{
              width: "100%",
              px: 2,
              py: 1.5,
              display: "block",
              textAlign: "left",
              borderTop: i === 0 ? "none" : "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.95rem" }}>{label}</Typography>
              <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </Stack>
          </ButtonBase>
        ))}
      </Paper>
    </Box>
  );
}
