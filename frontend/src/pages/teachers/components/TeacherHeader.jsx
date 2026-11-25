import React from "react";
import PageHeader from "../../../components/common/PageHeader";

const TeacherHeader = ({ total, onAdd }) => (
  <PageHeader
    title="Teachers"
    count={total}
    subtitle="Manage teacher accounts and class assignments"
    breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Teachers" }]}
    onAction={onAdd}
    actionLabel="Add Teacher"
  />
);

export default TeacherHeader;
