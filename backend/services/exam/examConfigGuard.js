"use strict";

/**
 * Safety rules for changing a class's subjects/marks scheme AFTER marks entry
 * has started. Pure function: nothing is read from or written to a database.
 *
 *  existingSubjects  subjects currently saved for the class
 *  newSubjects       cleaned subjects the admin wants to save
 *  stats             Map(subjectKey -> { count, maxMarks, maxInternal, maxOral, hasGrade })
 *                    describing the marks ALREADY entered for that subject
 *
 * Returns a list of plain-language problems; empty means the change is safe.
 * The rule is: never silently lose or invalidate entered data.
 */
const writtenMaxOf = (s) => (s.gradeOnly ? 0 : s.maxMarks - (s.internalMax || 0) - (s.oralMax || 0));

function findConfigConflicts({ existingSubjects = [], newSubjects = [], stats = new Map() }) {
  const problems = [];
  const next = new Map(newSubjects.map((s) => [s.nameKey, s]));

  for (const old of existingSubjects) {
    const st = stats.get(old.nameKey);
    if (!st || st.count === 0) continue; // no marks entered for this subject: anything goes

    const now = next.get(old.nameKey);
    if (!now) {
      problems.push(
        `${old.name} already has marks entered, so it cannot be removed or renamed. Clear or correct those marks first.`,
      );
      continue;
    }
    if (!!old.gradeOnly !== !!now.gradeOnly) {
      problems.push(
        `${old.name} already has entries, so it cannot be switched between marks and grade only.`,
      );
      continue;
    }
    if (now.gradeOnly) continue;

    if (st.maxMarks != null && st.maxMarks > writtenMaxOf(now)) {
      problems.push(
        `${old.name}: a written mark of ${st.maxMarks} is already entered, above the new written maximum of ${writtenMaxOf(now)}.`,
      );
    }
    if (st.maxInternal != null && st.maxInternal > (now.internalMax || 0)) {
      problems.push(
        `${old.name}: an internal mark of ${st.maxInternal} is already entered, above the new internal maximum of ${now.internalMax || 0}.`,
      );
    }
    if (st.maxOral != null && st.maxOral > (now.oralMax || 0)) {
      problems.push(
        `${old.name}: an oral mark of ${st.maxOral} is already entered, above the new oral maximum of ${now.oralMax || 0}.`,
      );
    }
  }
  return problems;
}

module.exports = { findConfigConflicts, writtenMaxOf };
