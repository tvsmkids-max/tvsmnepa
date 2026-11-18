import PageHeader from "../../components/common/PageHeader";
import ReportCardsPanel from "./ReportCardsPanel";

export default function ExamMyReportCardsPage() {
  return (
    <>
      <PageHeader title="Report Cards" subtitle="Add remarks and print report cards for your class" />
      <ReportCardsPanel mode="class" />
    </>
  );
}
