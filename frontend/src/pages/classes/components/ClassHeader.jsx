import React from "react";
import PageHeader from "../../../components/common/PageHeader";

const ClassHeader = ({ total, isAdmin, onAdd }) => (
  <PageHeader
    title="Classes"
    count={total}
    subtitle="Manage classes, sections, and teacher assignments"
    breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Classes" }]}
    onAction={isAdmin ? onAdd : undefined}
    actionLabel="Add Class"
  />
);

export default ClassHeader;
