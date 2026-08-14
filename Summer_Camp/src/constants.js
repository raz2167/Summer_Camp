export const TRAITS = [
  "יכולת חשיבה ותכנון",
  "נחישות וכוח רצון",
  "רמת תפקוד ויעילות בלחץ",
  "יכולת להשתלב בצוות",
  "מנהיגות ולקיחת אחריות",
  "תחרותיות",
  "ביטחון עצמי",
];

export const OBS_TRAITS = ["כושר גופני", "התאמה לפעילות שטח"];

export const HIST_COLORS = {
  1: "#7A1F1F",
  2: "#B8451F",
  3: "#C97A2E",
  4: "#D4A93F",
  5: "#8FA85E",
  6: "#4C7A4C",
  7: "#1F4A2E",
};

// Verified against the source spreadsheet — each row is [group1..group7] counts,
// summing to the class size. Do not edit without re-verifying against the source.
export const HIST_DATA = {
  17: [
    [1, 2, 3, 5, 3, 2, 1], // היסטוגרמה א
    [1, 2, 2, 7, 2, 2, 1], // היסטוגרמה ב
    [1, 1, 3, 7, 3, 1, 1], // היסטוגרמה ג
    [1, 3, 3, 3, 3, 3, 1], // היסטוגרמה ד
  ],
  16: [
    [1, 2, 2, 6, 2, 2, 1],
    [1, 2, 3, 4, 3, 2, 1],
    [1, 1, 3, 6, 3, 1, 1],
  ],
  15: [
    [1, 2, 2, 5, 2, 2, 1],
    [1, 2, 3, 3, 3, 2, 1],
    [1, 1, 3, 5, 3, 1, 1],
  ],
  14: [
    [1, 1, 3, 4, 3, 1, 1],
    [1, 2, 2, 4, 2, 2, 1],
    [1, 1, 2, 6, 2, 1, 1],
  ],
};

export const VARIANT_NAMES = ["א", "ב", "ג", "ד"];

export const WEIGHT_VALUES = { גבוה: 12, רגיל: 10, נמוך: 8 };
