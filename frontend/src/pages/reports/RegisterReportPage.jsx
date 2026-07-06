import React from "react";
import { Box } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import AttendanceRegisterTab from "./AttendanceRegisterTab";

const RegisterReportPage = () => {
  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <PageHeader
        title="Attendance Register"
        subtitle="Date-wise student attendance register view"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Reports" },
          { label: "Register" },
        ]}
      />

      <AttendanceRegisterTab />
    </Box>
  );
};

export default RegisterReportPage;
