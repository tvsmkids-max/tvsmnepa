import { useState, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getDailyQuoteForUser } from "../../utils/quoteUtils";

import useAuth from "../../hooks/useAuth";
import {
  useTeacherSummary,
  useTeacherDefaulters,
  useUpcomingHolidays,
  dashboardKeys,
} from "../../hooks/useDashboard";
import HolidayBanner from "../../components/common/HolidayBanner";
import TeacherQuickActions from "./components/TeacherQuickActions";
import TeacherExamCard from "./components/TeacherExamCard";

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getClassAccountLabel = (user) => {
  const lc = user?.linkedClass;
  if (lc && typeof lc === "object" && lc.name) {
    const section = lc.section ? `-${lc.section}` : "";
    return `${lc.name}${section}`.toUpperCase();
  }
  if (user?.name) return String(user.name).toUpperCase();
  return "CLASS ACCOUNT";
};

const SectionTitle = ({ children, action }) => (
  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{children}</Typography>
    {action}
  </Stack>
);

/** Today's attendance: the main thing on this page. One row per class. */
const AttendanceSection = ({ classes, onMark }) => {
  const rows = classes || [];
  const pending = rows.filter((c) => !c.isMarkedToday).length;
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Today's attendance</SectionTitle>
      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
        {rows.map((cls, i) => {
          const marked = cls.isMarkedToday;
          return (
            <Stack
              key={cls._id}
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                p: { xs: 2, sm: 2.5 },
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                borderTop: i === 0 ? "none" : "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {cls.name}
                  {cls.section ? ` - ${cls.section}` : ""}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: marked ? "success.main" : "warning.main", fontWeight: 600, mt: 0.25 }}
                >
                  {marked
                    ? `Marked: ${cls.present} present, ${cls.absent} absent (${cls.percentage}%)`
                    : `Not marked yet · ${cls.studentCount} students`}
                </Typography>
              </Box>
              <Button
                variant={marked ? "outlined" : "contained"}
                size="large"
                disableElevation
                onClick={onMark}
                sx={{ textTransform: "none", fontWeight: 700, minWidth: 170 }}
              >
                {marked ? "Edit attendance" : "Mark attendance"}
              </Button>
            </Stack>
          );
        })}
        {rows.length > 1 && (
          <Box sx={{ px: 2.5, py: 1, borderTop: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {pending === 0 ? "All classes marked" : `${pending} of ${rows.length} classes pending`}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const Stat = ({ label, value }) => (
  <Box sx={{ flex: 1, minWidth: 0, textAlign: "center", py: 1.5 }}>
    <Typography sx={{ fontWeight: 700, fontSize: "1.4rem", lineHeight: 1.1 }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
  </Box>
);

const SummaryStrip = ({ summary, period, setPeriod }) => (
  <Box sx={{ mb: 3 }}>
    <SectionTitle
      action={
        <ToggleButtonGroup
          value={period}
          exclusive
          size="small"
          onChange={(_, v) => v && setPeriod(v)}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5, py: 0.25, fontSize: "0.8rem" } }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      Summary
    </SectionTitle>
    <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
        <Stat label="Students" value={summary?.totalStudents || 0} />
        <Stat label="Present" value={summary?.present || 0} />
        <Stat label="Absent" value={summary?.absent || 0} />
        <Stat label="Rate" value={`${summary?.percentage || 0}%`} />
      </Stack>
    </Paper>
  </Box>
);

const ListPanel = ({ title, loading, empty, children, action }) => (
  <Box>
    <SectionTitle action={action}>{title}</SectionTitle>
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton height={28} />
          <Skeleton height={28} />
        </Box>
      ) : empty ? (
        <Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
          {empty}
        </Typography>
      ) : (
        <Stack divider={<Divider />}>{children}</Stack>
      )}
    </Paper>
  </Box>
);

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState("today");

  const { data: summary, isLoading: loading } = useTeacherSummary(period);
  const { data: defaulters = [], isLoading: defaultersLoading } = useTeacherDefaulters(5, 75);
  const { data: holidays = [], isLoading: holidaysLoading } = useUpcomingHolidays(3, 60);

  const classLabel = useMemo(() => getClassAccountLabel(user), [user]);
  const quote = useMemo(() => getDailyQuoteForUser(user)?.quote || "", [user]);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  const hasLinkedClass = Boolean(user?.linkedClass?._id || user?.linkedClass);
  const hasClasses = (summary?.totalClasses || 0) > 0;
  const isNonWorking = summary?.isHoliday || summary?.isNonWorkingDay;
  const goMark = () => navigate("/attendance/mark");

  let attendanceArea;
  if (loading) {
    attendanceArea = <Skeleton variant="rounded" height={110} sx={{ mb: 3 }} />;
  } else if (!hasLinkedClass) {
    attendanceArea = (
      <Alert severity="warning" sx={{ mb: 3 }}>
        No class is linked to this account. Contact the administrator to link a class login.
      </Alert>
    );
  } else if (!hasClasses) {
    attendanceArea = (
      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Refresh
          </Button>
        }
      >
        Class data could not be loaded. The class may be archived or temporarily unavailable.
      </Alert>
    );
  } else if (isNonWorking) {
    attendanceArea = (
      <Box sx={{ mb: 3 }}>
        <HolidayBanner
          isHoliday={summary.isHoliday}
          holiday={summary.holiday}
          today={summary.today}
          nextWorkingDay={summary.nextWorkingDay}
        />
      </Box>
    );
  } else {
    attendanceArea = (
      <>
        <AttendanceSection classes={summary?.classBreakdown} onMark={goMark} />
        <SummaryStrip summary={summary} period={period} setPeriod={setPeriod} />
      </>
    );
  }

  const showDetails = !loading && hasLinkedClass && hasClasses && !isNonWorking;

  return (
    <Box sx={{ width: "100%", maxWidth: 900 }}>
      <Box sx={{ textAlign: { xs: "center", md: "left" }, mb: 3 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: "1.6rem", sm: "1.75rem" }, lineHeight: 1.2 }}>
          {classLabel}
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5, fontSize: "0.95rem" }}>
          {greetingText()} · {todayLabel}
        </Typography>
        {quote && (
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", fontStyle: "italic", mt: 0.75, maxWidth: 520, mx: { xs: "auto", md: 0 }, lineHeight: 1.45 }}
          >
            “{quote}”
          </Typography>
        )}
      </Box>

      {attendanceArea}

      <TeacherExamCard />
      <TeacherQuickActions />

      {showDetails && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <ListPanel
            title="Low attendance (below 75%)"
            loading={defaultersLoading}
            empty="No students below 75%."
          >
            {defaulters.length > 0 &&
              defaulters.map((s) => (
                <Stack
                  key={s._id}
                  direction="row"
                  spacing={2}
                  onClick={() => navigate("/students")}
                  sx={{ px: 2, py: 1.25, cursor: "pointer", alignItems: "center", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block" }}>
                      {s.className}-{s.section} · Scholar {s.scholarNumber || "—"}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                    {s.percentage || 0}%
                  </Typography>
                </Stack>
              ))}
          </ListPanel>

          <ListPanel title="Upcoming holidays" loading={holidaysLoading} empty="No holidays in the next 60 days.">
            {holidays.length > 0 &&
              holidays.map((h) => (
                <Stack key={h._id || h.name} direction="row" spacing={2} sx={{ px: 2, py: 1.25, alignItems: "center" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {h.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {h.date
                        ? new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : ""}
                      {h.dayName ? ` · ${h.dayName}` : ""}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                    {h.daysUntil === 0 ? "Today" : h.daysUntil === 1 ? "Tomorrow" : `In ${h.daysUntil} days`}
                  </Typography>
                </Stack>
              ))}
          </ListPanel>
        </Box>
      )}
    </Box>
  );
};

export default TeacherDashboard;
