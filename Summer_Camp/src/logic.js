import { TRAITS, WEIGHT_VALUES } from "./constants.js";

export function computeScore(studentScores, weights) {
  return TRAITS.reduce((sum, _, i) => {
    const w = WEIGHT_VALUES[weights[i]] ?? 10;
    return sum + (studentScores[i] || 0) * w;
  }, 0);
}

export function computeSpread(studentScores) {
  const valid = studentScores.filter((v) => v > 0);
  if (valid.length === 0) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

// Average of the two view-only observational traits (physical fitness,
// field-activity suitability) — used only as a tie-break, never in the
// main score or ranking.
export function computeObsAverage(obsScores) {
  if (!obsScores || obsScores.length === 0) return 0;
  return obsScores.reduce((a, b) => a + b, 0) / obsScores.length;
}

// Deterministic ordering for placing students into a histogram (weakest
// first, strongest last). A histogram's shape (slot counts per group) is
// fixed and must never bunch more than one student into an extreme group,
// so when students tie on total score, the tie is broken in order:
//   1) total score, ascending
//   2) lower spread wins the more extreme (stronger) slot — a tighter
//      spread is a more consistent, trustworthy score
//   3) if spread also ties, the higher combined average of the two
//      observational traits (physical fitness, field-activity suitability)
//      wins the more extreme (stronger) slot
//   4) if that also ties, the lower student number wins the more extreme
//      (stronger) slot — a final deterministic tie-break
export function sortWeakToStrongWithTieBreak(students, totals, spreads, obsAverages = {}) {
  return [...students].sort((a, b) => {
    if (totals[a] !== totals[b]) return totals[a] - totals[b];
    if (spreads[a] !== spreads[b]) return spreads[b] - spreads[a];
    const obsA = obsAverages[a] ?? 0;
    const obsB = obsAverages[b] ?? 0;
    if (obsA !== obsB) return obsA - obsB;
    return b - a;
  });
}

// Groups of students sharing the exact same total score — used to surface a
// note explaining that the tie-break rule above was actually invoked.
export function findScoreTieGroups(students, totals) {
  const byTotal = {};
  students.forEach((s) => {
    if (!byTotal[totals[s]]) byTotal[totals[s]] = [];
    byTotal[totals[s]].push(s);
  });
  return Object.values(byTotal).filter((group) => group.length > 1);
}

// Builds a histogram's shape (groups 1-7) and fills it with student
// numbers weak-to-strong: weakest always lands in group 1, strongest in
// group 7. Slots beyond how many students have been scored so far stay null
// so the caller can render an empty (but colored) cell.
export function assignToHistogram(counts, studentsWeakToStrong) {
  const slots = [];
  counts.forEach((count, gIdx) => {
    for (let i = 0; i < count; i++) slots.push(gIdx + 1);
  });
  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  slots.forEach((g, i) => {
    groups[g].push(i < studentsWeakToStrong.length ? studentsWeakToStrong[i] : null);
  });
  return groups;
}

// Sum of squared deviations from the mean, within each group of a
// histogram grid (whatever assignToHistogram returns), using the real
// totals. Lower = the students placed together actually have similar
// scores — the standard statistical measure of how well a given partition
// shape fits the real data (smaller within-group variance = better fit).
export function computeWithinGroupSumOfSquares(groups, totals) {
  let sum = 0;
  Object.values(groups).forEach((members) => {
    const values = members.filter((m) => m != null).map((m) => totals[m]);
    if (values.length === 0) return;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    values.forEach((v) => {
      sum += (v - mean) ** 2;
    });
  });
  return sum;
}

// Finds the 7-group partition of the weak-to-strong sorted totals that best
// describes the real clustering in the data: group 1 and group 7 are forced
// to exactly one student each (the weakest and the strongest), and groups
// 2-6 are forced to at least one student each (no empty column) — subject
// to those constraints, the boundaries between groups 2-6 are chosen to
// minimize total within-group sum of squared deviations, i.e. each group's
// members are as close in score to each other as the constraints allow.
// This is the same idea as Fisher/Jenks natural-breaks optimal 1-D
// clustering, solved here by dynamic programming over prefix sums (n is at
// most ~17, so a direct O(n^2) DP is more than fast enough).
//
// Once n >= 7 this always yields a strictly positive count in every column;
// below that there aren't enough scored students to fill every column, so
// this falls back to spreading them out with an empty column wherever
// necessary.
export function computeOptimalPartitionCounts(sortedTotals) {
  const n = sortedTotals.length;
  if (n === 0) return [0, 0, 0, 0, 0, 0, 0];
  if (n < 7) {
    // Not enough students to guarantee every column is non-empty. Spread
    // them out from the center — this is a transient state (still typing
    // in scores), not the steady-state 14-17-student case.
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      counts[Math.round(((n === 1 ? 0.5 : i / (n - 1)) * 6))]++;
    }
    return counts;
  }

  // Only the middle n-2 students need to be partitioned (group 1 and group
  // 7 are fixed to the single weakest/strongest).
  const middle = sortedTotals.slice(1, n - 1);
  const m = middle.length;

  const prefixSum = [0];
  const prefixSumSq = [0];
  middle.forEach((v) => {
    prefixSum.push(prefixSum[prefixSum.length - 1] + v);
    prefixSumSq.push(prefixSumSq[prefixSumSq.length - 1] + v * v);
  });
  // Cost of grouping middle[a..b] (0-indexed, inclusive) into one segment.
  const segmentCost = (a, b) => {
    const count = b - a + 1;
    const sum = prefixSum[b + 1] - prefixSum[a];
    const sumSq = prefixSumSq[b + 1] - prefixSumSq[a];
    return sumSq - (sum * sum) / count;
  };

  const SEGMENTS = 5; // groups 2-6
  // dp[k][i] = min cost partitioning the first i middle students into k
  // non-empty segments. choice[k][i] = the split point achieving it.
  const dp = Array.from({ length: SEGMENTS + 1 }, () => Array(m + 1).fill(Infinity));
  const choice = Array.from({ length: SEGMENTS + 1 }, () => Array(m + 1).fill(0));
  dp[0][0] = 0;
  for (let k = 1; k <= SEGMENTS; k++) {
    for (let i = k; i <= m - (SEGMENTS - k); i++) {
      for (let j = k - 1; j < i; j++) {
        if (dp[k - 1][j] === Infinity) continue;
        const cost = dp[k - 1][j] + segmentCost(j, i - 1);
        if (cost < dp[k][i]) {
          dp[k][i] = cost;
          choice[k][i] = j;
        }
      }
    }
  }

  // Backtrack to recover the 5 middle segment sizes.
  const boundaries = [m];
  let i = m;
  for (let k = SEGMENTS; k >= 1; k--) {
    const j = choice[k][i];
    boundaries.unshift(j);
    i = j;
  }
  const middleCounts = [];
  for (let s = 0; s < SEGMENTS; s++) {
    middleCounts.push(boundaries[s + 1] - boundaries[s]);
  }

  return [1, ...middleCounts, 1];
}

// Builds the "true distribution" chart: the shape that best describes how
// the real scores actually cluster (see computeOptimalPartitionCounts),
// filled weak-to-strong. This is intentionally independent of the fixed
// histogram templates below it — it always has exactly one student in
// group 1 and group 7 and never an empty middle column (once n >= 7), but
// its shape is derived from the real data, not forced to match any
// selectable template.
export function computeLiveDistribution(studentsWeakToStrong, totals) {
  const sortedTotals = studentsWeakToStrong.map((s) => totals[s]);
  const counts = computeOptimalPartitionCounts(sortedTotals);
  return assignToHistogram(counts, studentsWeakToStrong);
}
