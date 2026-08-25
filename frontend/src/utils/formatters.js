/**
 * Format Scholar Number — undefined-safe defensive utility
 * Replaces all legacy roll number formatting across the system.
 * Never interpolates a possibly-undefined field directly into JSX.
 */
export const formatScholarNo = (student) => {
  if (!student) return "—";
  const scholar = student.scholarNumber || student;
  if (!scholar) return "—";
  const str = String(scholar).trim();
  return str || "—";
};

/**
 * @deprecated Use formatScholarNo() instead.
 * Kept only for backward compatibility with legacy imports.
 */
export const formatRollNumber = (rollNo) => {
  if (!rollNo && rollNo !== 0) return "—";
  const str = String(rollNo).trim();
  if (!str) return "—";
  if (/^\d+$/.test(str)) {
    return str.padStart(2, "0");
  }
  return str;
};

/**
 * Format Indian mobile number (e.g., 9876543210 → "98765 43210")
 */
export const formatMobile = (mobile) => {
  if (!mobile) return "—";
  const str = String(mobile).replace(/\D/g, "");

  if (!str || str === "0000000000") return "—";

  if (str.length === 10) {
    return `${str.slice(0, 5)} ${str.slice(5)}`;
  }

  if (str.length === 11 && str.startsWith("0")) {
    return `${str.slice(0, 1)} ${str.slice(1, 6)} ${str.slice(6)}`;
  }

  if (str.length === 12 && str.startsWith("91")) {
    return `+91 ${str.slice(2, 7)} ${str.slice(7)}`;
  }

  return str;
};

/**
 * Format date (e.g., 2026-06-28 → "28 Jun 2026")
 */
export const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format date short (e.g., 2026-06-28 → "28/06/2026")
 */
export const formatDateShort = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatTimeAgo = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
};

/**
 * Get initials from name (e.g., "Aditi Kumari" → "AK")
 */
export const getInitials = (name) => {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() || "?";
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 30) => {
  if (!text) return "";
  const str = String(text);
  return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
};

/**
 * Class label formatter (e.g., { name: "NURSERY", section: "A" } → "NURSERY-A")
 */
export const formatClassLabel = (cls) => {
  if (!cls) return "—";
  const name = cls.name || "";
  const section = cls.section || "";
  if (!name && !section) return "—";
  if (!section) return name;
  return `${name}-${section}`;
};

/**
 * Get gender-based color for avatar
 */
export const getGenderColor = (gender) => {
  if (gender === "Female") return "#EC4899";
  if (gender === "Male") return "#1E4D98";
  return "#6B7280";
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
