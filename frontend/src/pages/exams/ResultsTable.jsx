import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

const RESULT_COLOR = { pass: "success", fail: "error", absent: "warning" };
const RESULT_LABEL = { pass: "Pass", fail: "Fail", absent: "Absent" };

// Subject-wise results. No overall pass/fail, grade or rank is shown.
export default function ResultsTable({ students }) {
  if (!students?.length) return <Typography variant="body2">No results.</Typography>;
  const subjects = students[0].subjects;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Roll</TableCell>
            <TableCell>Scholar No.</TableCell>
            <TableCell>Student</TableCell>
            {subjects.map((s) => (
              <TableCell key={s.subjectKey} align="center">
                {s.subjectName}
                <Typography variant="caption" display="block" color="text.secondary">
                  max {s.maxMarks} · pass {s.passingMarks}
                </Typography>
              </TableCell>
            ))}
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">%</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((r) => (
            <TableRow key={r.student}>
              <TableCell>{r.rollNumber}</TableCell>
              <TableCell>{r.scholarNumber}</TableCell>
              <TableCell>{r.studentName}</TableCell>
              {r.subjects.map((s) => (
                <TableCell key={s.subjectKey} align="center">
                  {s.result === "absent" ? "—" : s.marks}{" "}
                  <Chip size="small" label={RESULT_LABEL[s.result]} color={RESULT_COLOR[s.result]} />
                </TableCell>
              ))}
              <TableCell align="right">
                {r.overallComplete ? `${r.totalObtained} / ${r.totalMax}` : "Incomplete"}
              </TableCell>
              <TableCell align="right">{r.overallComplete ? `${r.percentage}%` : "Incomplete"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
