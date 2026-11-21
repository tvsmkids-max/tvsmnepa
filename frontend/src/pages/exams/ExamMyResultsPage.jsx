import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, LinearProgress, Stack } from "@mui/material";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import examApi from "../../api/examApi";
import ResultsTable from "./ResultsTable";

export default function ExamMyResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.myResults(id);
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) {
          enqueueSnackbar(err.response?.data?.message || "Failed to load results", { variant: "error" });
          navigate("/exams/mine");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, enqueueSnackbar]);

  if (!data) return <LinearProgress />;
  return (
    <>
      <PageHeader title="Results" subtitle={data.exam.name} />
      <Stack direction="row" sx={{ mb: 2 }}>
        <Button size="small" onClick={() => navigate("/exams/mine")}>
          Back to examinations
        </Button>
      </Stack>
      {data.summary.overallIncomplete > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {data.summary.overallIncomplete} student(s) were absent in at least one subject, so their overall
          total and percentage show as Incomplete.
        </Alert>
      )}
      <ResultsTable students={data.students} />
    </>
  );
}
