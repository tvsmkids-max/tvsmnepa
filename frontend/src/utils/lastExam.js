// The examination the admin last opened. Menu pages jump straight to it so the
// same exam stays selected while moving between sections. Cleared on logout.
export const LAST_EXAM_KEY = "sams_last_exam";

export const getLastExam = () => {
  try {
    return sessionStorage.getItem(LAST_EXAM_KEY) || "";
  } catch {
    return "";
  }
};

export const setLastExam = (id) => {
  try {
    if (id) sessionStorage.setItem(LAST_EXAM_KEY, id);
    else sessionStorage.removeItem(LAST_EXAM_KEY);
  } catch {
    /* storage unavailable: just not remembered */
  }
};
