"use strict";

const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: "Present",
  ABSENT: "Absent",
});

const ATTENDANCE_STATUS_LIST = Object.values(ATTENDANCE_STATUS);

module.exports = { ATTENDANCE_STATUS, ATTENDANCE_STATUS_LIST };
