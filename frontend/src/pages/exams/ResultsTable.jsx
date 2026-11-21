import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

const RESULT_COLOR = { pass: "success", fail: "error", absent: "warning", graded: "default" };
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
                  {s.gradeOnly
                    ? "grade"
                    : `max ${s.maxMarks}${s.internalMax > 0 || s.oralMax > 0 ? ` (${[s.maxMarks - (s.internalMax || 0) - (s.oralMax || 0), s.internalMax > 0 && s.internalMax, s.oralMax > 0 && s.oralMax].filter((x) => x !== false).join("+")})` : ""} · pass ${s.passingMarks}`}
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
                  {s.result === "graded" ? (
                    <Chip size="small" label={s.grade || "—"} />
                  ) : (
                    <>
                      {s.result === "absent" ? "—" : s.marks}
                      {s.result !== "absent" && (s.internalMax > 0 || s.oralMax > 0) && s.writtenMarks != null && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {" "}
                          ({[s.writtenMarks, s.internalMax > 0 && s.internalMarks, s.oralMax > 0 && s.oralMarks].filter((x) => x !== false).join("+")})
                        </Typography>
                      )}{" "}
                      <Chip size="small" label={RESULT_LABEL[s.result]} color={RESULT_COLOR[s.result]} />
                    </>
                  )}
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
