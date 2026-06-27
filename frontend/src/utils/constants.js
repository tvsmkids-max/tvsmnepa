export const APP_NAME =
  import.meta.env.VITE_APP_NAME || "School Attendance System";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const TOKEN_KEY = "sams_access_token";
export const REFRESH_TOKEN_KEY = "sams_refresh_token";
export const USER_KEY = "sams_user";

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
};

export const STUDENT_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  TC: "TC",
  TRANSFERRED: "Transferred",
};

export const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  ABSENT: "Absent",
};

export const PAGINATION_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;
export const GENDER_OPTIONS = ["Male", "Female", "Other"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
