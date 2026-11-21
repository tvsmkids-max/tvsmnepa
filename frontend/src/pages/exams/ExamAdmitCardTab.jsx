import { useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import {
  loadWatermark,
  loadSignature,
  downloadAdmitCardPdf,
  printAdmitCardPdf,
} from "../../utils/examAdmitCardPdf";

const apiMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

const ExamAdmitCardTab = ({ exam }) => {
  const { enqueueSnackbar } = useSnackbar();
  const configs = useMemo(
    () => [...(exam.classConfigs || [])].filter((c) => c.class),
    [exam.classConfigs],
  );
  const classNames = useMemo(
    () => [...new Set(configs.map((c) => c.class.name))],
    [configs],
  );

  const [scope, setScope] = useState("all");
  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const body = () => {
    if (scope === "className") return { scope, className };
    if (scope === "class") return { scope, classId };
    return { scope: "all" };
  };
  const ready =
    scope === "all" || (scope === "className" && className) || (scope === "class" && classId);

  const preview = async () => {
    setLoading(true);
    try {
      const res = await examApi.buildAdmitCards(exam._id, body());
      setData(res.data.data);
    } catch (err) {
      setData(null);
      enqueueSnackbar(apiMsg(err, "Failed to prepare admit cards"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const output = async (cards, mode, name) => {
    if (!data || cards.length === 0) return;
    const [logo, signature] = await Promise.all([loadWatermark(), loadSignature()]);
    const args = { data, cards, logo, signature };
    if (mode === "print") printAdmitCardPdf(args);
    else downloadAdmitCardPdf(args, name);
  };

  const fname = `admit-cards-${exam.name.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Cards print six per A4 page, starting a new page for each class. Admit cards are available
        to every active student: fee status is never checked, and missing information is shown as
        a warning that does not stop you from generating a card.
      </Alert>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Generate for</InputLabel>
          <Select label="Generate for" value={scope} onChange={(e) => { setScope(e.target.value); setData(null); }}>
            <MenuItem value="all">All students</MenuItem>
            <MenuItem value="className">A class (all sections)</MenuItem>
            <MenuItem value="class">One class &amp; section</MenuItem>
          </Select>
        </FormControl>
        {scope === "className" && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Class</InputLabel>
            <Select label="Class" value={className} onChange={(e) => { setClassName(e.target.value); setData(null); }}>
              {classNames.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {scope === "class" && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Class &amp; section</InputLabel>
            <Select label="Class & section" value={classId} onChange={(e) => { setClassId(e.target.value); setData(null); }}>
              {configs.map((c) => (
                <MenuItem key={c.class._id} value={c.class._id}>
                  {c.class.name} - {c.class.section}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button variant="contained" onClick={preview} disabled={!ready || loading}>
          Prepare admit cards
        </Button>
      </Stack>

      {loading && <LinearProgress />}
      {configs.length === 0 && (
        <Alert severity="warning">Configure classes and subjects first.</Alert>
      )}

      {data && (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          {data.examWarnings.map((w) => (
            <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>
          ))}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
            <Typography fontWeight={600}>
              {data.summary.total} admit card(s)
              {data.summary.withWarnings > 0 && ` · ${data.summary.withWarnings} with warnings`}
            </Typography>
            <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
              disabled={data.cards.length === 0} onClick={() => output(data.cards, "print")}>
              Print all
            </Button>
            <Button size="small" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />}
              disabled={data.cards.length === 0} onClick={() => output(data.cards, "pdf", fname)}>
              PDF all
            </Button>
          </Stack>
          {data.summary.withWarnings > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Some cards have missing information (see the Warnings column). They can still be
              generated.
            </Alert>
          )}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Class</TableCell>
                  <TableCell>Roll</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Admission no.</TableCell>
                  <TableCell>Warnings</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.cards.map((c) => {
                  const cls = data.classes[c.classId];
                  return (
                    <TableRow key={c.student._id}>
                      <TableCell>{cls.name} - {cls.section}</TableCell>
                      <TableCell>{c.rollCode || c.rollNumber || "—"}</TableCell>
                      <TableCell>{c.student.name}</TableCell>
                      <TableCell>{c.student.scholarNumber}</TableCell>
                      <TableCell>
                        {c.warnings.length === 0 ? (
                          <Chip size="small" color="success" label="Ready" />
                        ) : (
                          c.warnings.map((w) => (
                            <Chip key={w} size="small" color="warning" label={w} sx={{ mr: 0.5, mb: 0.5 }} />
                          ))
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Button size="small" onClick={() => output([c], "print")}>Print</Button>
                        <Button size="small" onClick={() => output([c], "pdf", `admit-card-${c.student.name.replace(/\s+/g, "-").toLowerCase()}`)}>PDF</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ExamAdmitCardTab;
