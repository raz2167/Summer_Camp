import { TRAITS, WEIGHT_VALUES } from "./constants.js";

export function computeScore(cadetScores, weights) {
  return TRAITS.reduce((sum, _, i) => {
    const w = WEIGHT_VALUES[weights[i]] ?? 10;
    return sum + (cadetScores[i] || 0) * w;
  }, 0);
}

export function computeSpread(cadetScores) {
  const valid = cadetScores.filter((v) => v > 0);
  if (valid.length === 0) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

// Builds a fixed histogram's shape (groups 1-7) and fills it with cadet
// numbers weak-to-strong: weakest always lands in group 1, strongest in
// group 7. Slots beyond how many cadets have been scored so far stay null
// so the caller can render an empty (but colored) cell.
export function assignToHistogram(counts, cadetsWeakToStrong) {
  const slots = [];
  counts.forEach((count, gIdx) => {
    for (let i = 0; i < count; i++) slots.push(gIdx + 1);
  });
  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  slots.forEach((g, i) => {
    groups[g].push(i < cadetsWeakToStrong.length ? cadetsWeakToStrong[i] : null);
  });
  return groups;
}

// Live (non-fixed) bell-curve group assignment: group 4 is the center,
// groups 1/7 the extremes, based on each cadet's percentile rank.
export function computeLiveGroups(activeCount, rankMap) {
  const groups = {};
  Object.entries(rankMap).forEach(([cadet, rank]) => {
    if (activeCount === 1) {
      groups[cadet] = 4;
      return;
    }
    const pct = (activeCount - rank) / (activeCount - 1);
    let g = 4 + Math.round((pct - 0.5) * 6);
    g = Math.max(1, Math.min(7, g));
    groups[cadet] = g;
  });
  return groups;
}

export function buildLiveHistogramGrid(activeCadetNums, groups) {
  const byGroup = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  activeCadetNums.forEach((c) => {
    const g = groups[c];
    if (g) byGroup[g].push(c);
  });
  return byGroup;
}
