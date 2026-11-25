import React from "react";
import PageHeader from "../../../components/common/PageHeader";

const HolidayHeader = ({ total, sessionName, isAdmin, onAdd }) => (
  <PageHeader
    title="Holidays"
    count={total}
    subtitle={
      sessionName
        ? `Manage holidays for ${sessionName}`
        : "Manage school holidays and vacations"
    }
    breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Holidays" }]}
    onAction={isAdmin ? onAdd : undefined}
    actionLabel="Add Holiday"
  />
);

export default HolidayHeader;
