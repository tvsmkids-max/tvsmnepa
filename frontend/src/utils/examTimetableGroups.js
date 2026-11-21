// Pre-Primary: no class number in the name (Nursery, LKG, UKG…). Primary: 1–5. Higher: 6 and above.
export const GROUPS = [
  { key: "pre", title: "Pre-Primary" },
  { key: "primary", title: "Primary (Classes 1 to 5)" },
  { key: "higher", title: "Higher (Class 6 and above)" },
];

export const classLabel = (c) => `${c.name}${c.section && c.section !== "-" ? ` - ${c.section}` : ""}`;
export const classIdOf = (e) => String(e.class?._id || e.class);

export const groupOf = (cls) => {
  const m = String(cls.name || "").match(/\d+/);
  if (!m) return "pre";
  return Number(m[0]) <= 5 ? "primary" : "higher";
};

export const sortConfigs = (list) =>
  [...(list || [])].sort(
    (a, b) =>
      (a.class?.displayOrder ?? 0) - (b.class?.displayOrder ?? 0) ||
      classLabel(a.class).localeCompare(classLabel(b.class)),
  );

export const makeGroups = (configs) =>
  GROUPS.map((g) => ({ ...g, cfgs: configs.filter((c) => groupOf(c.class) === g.key) })).filter(
    (g) => g.cfgs.length > 0,
  );

/** Printed column title: "1ST" -> "Class 1st", "NURSERY" -> "Nursery", "3RD - A" -> "Class 3rd - A". */
export const printedClassName = (c) => {
  const name = String(c.name || "").trim();
  const sec = c.section && c.section !== "-" ? ` - ${c.section}` : "";
  if (/^\d/.test(name)) return `Class ${name.toLowerCase()}${sec}`;
  return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}${sec}`;
};

/**
 * Printable matrix for one group: [{date, cells: {classId: "Hindi / English"}}] sorted by date.
 */
export const matrixFor = (cfgs, saved) => {
  const ids = new Set(cfgs.map((c) => c.class._id));
  const byDate = new Map();
  saved.forEach((e) => {
    const cid = classIdOf(e);
    if (!ids.has(cid)) return;
    if (!byDate.has(e.date)) byDate.set(e.date, {});
    const row = byDate.get(e.date);
    row[cid] = row[cid] ? `${row[cid]} / ${e.subjectName}` : e.subjectName;
  });
  return [...byDate.keys()].sort().map((date) => ({ date, cells: byDate.get(date) }));
};
