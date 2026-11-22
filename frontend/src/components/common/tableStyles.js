const headBg = (t) => (t.palette.mode === "dark" ? "#1f2937" : "#f1f5f9");

/**
 * Bordered, shaded-header table look used for the exam data tables.
 * On phones the first column stays pinned while the rest scrolls sideways.
 */
export const gridTableSx = {
  border: "1px solid",
  borderColor: "divider",
  "& th, & td": { border: "1px solid", borderColor: "divider" },
  "& thead th": { bgcolor: headBg, fontWeight: 700 },
  "@media (max-width:899.95px)": {
    "& tr > :first-of-type": { position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper" },
    "& thead tr > :first-of-type": { bgcolor: headBg, zIndex: 2 },
  },
};
