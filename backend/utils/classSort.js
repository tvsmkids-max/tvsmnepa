"use strict";

const getClassSortRank = (className) => {
  if (!className) return 999;
  const name = className.toString().trim().toUpperCase();

  if (/^PRE/.test(name) || name === "PLAYGROUP" || name === "PLAY") return 0;
  if (/^NUR/.test(name) || name === "NURSERY") return 1;
  if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
    return 2;
  if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
    return 3;

  const numericMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
  if (numericMatch) {
    const num = parseInt(numericMatch[1], 10);
    if (num >= 1 && num <= 12) return 10 + num;
  }

  return 999;
};

module.exports = { getClassSortRank };
