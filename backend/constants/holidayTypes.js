"use strict";

const HOLIDAY_TYPE = Object.freeze({
  NATIONAL: "National",
  SCHOOL: "School",
  VACATION: "Vacation",
});

const HOLIDAY_TYPE_LIST = Object.values(HOLIDAY_TYPE);

module.exports = { HOLIDAY_TYPE, HOLIDAY_TYPE_LIST };
