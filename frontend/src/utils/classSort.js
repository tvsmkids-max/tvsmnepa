export const getClassSortRank = (className) => {
  if (!className) return 999;
  const name = className.toString().trim().toUpperCase();

  // Pre-primary
  if (/^PRE/.test(name) || name === "PLAYGROUP" || name === "PLAY") return 0;
  if (/^NUR/.test(name) || name === "NURSERY") return 1;
  if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
    return 2;
  if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
    return 3;

  // Numeric (1st to 12th)
  const numericMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
  if (numericMatch) {
    const num = parseInt(numericMatch[1], 10);
    if (num >= 1 && num <= 12) return 10 + num;
  }

  // Roman numerals
  const romanMap = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
  };
  const romanMatch = name.match(
    /^(X{0,2}I{0,3}|V?I{0,3}|IX|IV|VIII|VII|VI|III|II|I)$/,
  );
  if (romanMatch && romanMap[romanMatch[1]]) {
    return 10 + romanMap[romanMatch[1]];
  }

  return 999;
};

export const sortClasses = (classes, options = {}) => {
  const { nameKey = "name", sectionKey = "section" } = options;
  return [...classes].sort((a, b) => {
    const rankA = getClassSortRank(a[nameKey]);
    const rankB = getClassSortRank(b[nameKey]);
    if (rankA !== rankB) return rankA - rankB;
    return (a[sectionKey] || "").localeCompare(b[sectionKey] || "");
  });
};
