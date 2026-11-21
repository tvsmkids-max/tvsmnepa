import PageHeader from "../../components/common/PageHeader";
import ReportCardsPanel from "./ReportCardsPanel";

export default function ExamReportCardsPage() {
  return (
    <>
      <PageHeader title="Report Cards" subtitle="Progress report cards from published results" />
      <ReportCardsPanel mode="admin" />
    </>
  );
}
