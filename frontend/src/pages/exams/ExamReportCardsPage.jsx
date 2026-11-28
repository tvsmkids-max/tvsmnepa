import PageHeader from "../../components/common/PageHeader";
import ReportCardsPanel from "./ReportCardsPanel";

export default function ExamReportCardsPage() {
  return (
    <>
      <PageHeader title="Report & Result Cards" subtitle="Result cards (Quarterly, Half Yearly) and progress report cards from published results" />
      <ReportCardsPanel mode="admin" />
    </>
  );
}
