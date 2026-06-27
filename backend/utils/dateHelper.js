"use strict";

const {
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  isWeekend,
  differenceInDays,
  addDays,
  isAfter,
  isBefore,
  isEqual,
} = require("date-fns");

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayString = () => format(new Date(), "yyyy-MM-dd");

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
};

/**
 * Format date to display format DD/MM/YYYY
 */
const formatDisplayDate = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
};

/**
 * Get start and end of a day
 */
const getDayRange = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return { start: startOfDay(d), end: endOfDay(d) };
};

/**
 * Get start and end of a month
 */
const getMonthRange = (year, month) => {
  const d = new Date(year, month - 1, 1);
  return { start: startOfMonth(d), end: endOfMonth(d) };
};

/**
 * Get start and end of a week
 */
const getWeekRange = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return {
    start: startOfWeek(d, { weekStartsOn: 1 }),
    end: endOfWeek(d, { weekStartsOn: 1 }),
  };
};

/**
 * Get start and end of a year
 */
const getYearRange = (year) => {
  const d = new Date(year, 0, 1);
  return { start: startOfYear(d), end: endOfYear(d) };
};

/**
 * Check if date is valid
 */
const isValidDate = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isValid(d);
};

/**
 * Get array of dates between start and end
 */
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  let current = startOfDay(
    typeof startDate === "string" ? parseISO(startDate) : startDate,
  );
  const end = startOfDay(
    typeof endDate === "string" ? parseISO(endDate) : endDate,
  );

  while (!isAfter(current, end)) {
    dates.push(formatDate(current));
    current = addDays(current, 1);
  }

  return dates;
};

/**
 * Calculate number of working days (excluding weekends) between two dates
 */
const getWorkingDaysBetween = (startDate, endDate, holidayDates = []) => {
  const dates = getDatesBetween(startDate, endDate);
  const holidaySet = new Set(holidayDates.map(formatDate));

  return dates.filter((date) => {
    const d = parseISO(date);
    return !isWeekend(d) && !holidaySet.has(date);
  });
};

/**
 * Check if a date is a weekend
 */
const isWeekendDate = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isWeekend(d);
};

module.exports = {
  getTodayString,
  formatDate,
  formatDisplayDate,
  getDayRange,
  getMonthRange,
  getWeekRange,
  getYearRange,
  isValidDate,
  getDatesBetween,
  getWorkingDaysBetween,
  isWeekendDate,
  isAfter,
  isBefore,
  isEqual,
  differenceInDays,
};
