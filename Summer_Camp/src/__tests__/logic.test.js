import { describe, expect, it } from "vitest";
import { HIST_DATA } from "../constants.js";
import {
  assignToHistogram,
  computeLiveDistribution,
  computeObsAverage,
  computeOptimalPartitionCounts,
  computeScore,
  computeSpread,
  computeWithinGroupSumOfSquares,
  findScoreTieGroups,
  sortWeakToStrongWithTieBreak,
} from "../logic.js";

describe("computeScore", () => {
  it("sums trait scores weighted by their configured weight", () => {
    const scores = [7, 7, 7, 7, 7, 7, 7];
    const weights = Array(7).fill("רגיל");
    expect(computeScore(scores, weights)).toBe(7 * 10 * 7);
  });

  it("treats unscored traits as zero", () => {
    expect(computeScore(Array(7).fill(0), Array(7).fill("רגיל"))).toBe(0);
  });
});

describe("computeSpread", () => {
  it("is the max-min across scored traits", () => {
    expect(computeSpread([1, 7, 3, 0, 0, 0, 0])).toBe(6);
  });

  it("is 0 when nothing is scored yet", () => {
    expect(computeSpread([0, 0, 0, 0, 0, 0, 0])).toBe(0);
  });
});

describe("computeObsAverage", () => {
  it("averages the observational scores", () => {
    expect(computeObsAverage([4, 6])).toBe(5);
  });

  it("is 0 when there are no observational scores", () => {
    expect(computeObsAverage([])).toBe(0);
  });
});

describe("assignToHistogram", () => {
  it("fills every slot defined by counts, weakest to group 1, strongest to group 7", () => {
    const counts = [1, 2, 3, 5, 3, 2, 1]; // 17-student histogram א
    const weakToStrong = Array.from({ length: 17 }, (_, i) => i + 1);
    const groups = assignToHistogram(counts, weakToStrong);
    expect(groups[1]).toEqual([1]);
    expect(groups[7]).toEqual([17]);
    expect(groups[4]).toHaveLength(5);
    const totalSlots = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    expect(totalSlots).toBe(17);
  });

  it("leaves unscored slots as null instead of throwing", () => {
    const counts = [1, 2, 3, 5, 3, 2, 1];
    const groups = assignToHistogram(counts, [1, 2, 3]); // only 3 students scored so far
    const flat = Object.values(groups).flat();
    expect(flat.filter((v) => v !== null)).toHaveLength(3);
    expect(flat).toHaveLength(17);
  });

  it("matches HIST_DATA row sums to the declared class size for every size/variant", () => {
    Object.entries(HIST_DATA).forEach(([size, variants]) => {
      variants.forEach((counts) => {
        const sum = counts.reduce((a, b) => a + b, 0);
        expect(sum).toBe(Number(size));
      });
    });
  });
});

describe("computeWithinGroupSumOfSquares", () => {
  it("is 0 when every member of every group shares the same total", () => {
    const groups = { 1: [1], 4: [2, 3, 4], 7: [5] };
    const totals = { 1: 100, 2: 200, 3: 200, 4: 200, 5: 300 };
    expect(computeWithinGroupSumOfSquares(groups, totals)).toBe(0);
  });

  it("matches a hand-computed sum of squared deviations", () => {
    const groups = { 4: [1, 2, 3] };
    const totals = { 1: 10, 2: 20, 3: 30 }; // mean 20, deviations -10/0/10
    expect(computeWithinGroupSumOfSquares(groups, totals)).toBe(200);
  });

  it("ignores null placeholder slots", () => {
    const groups = { 4: [1, null, 2] };
    const totals = { 1: 10, 2: 10 };
    expect(computeWithinGroupSumOfSquares(groups, totals)).toBe(0);
  });
});

describe("computeOptimalPartitionCounts", () => {
  it("sums to n for every class size in the supported 14-17 range", () => {
    [14, 15, 16, 17].forEach((n) => {
      const totals = Array.from({ length: n }, (_, i) => i + 1);
      expect(computeOptimalPartitionCounts(totals).reduce((a, b) => a + b, 0)).toBe(n);
    });
  });

  it("forces exactly one student in group 1 and group 7 once n >= 7", () => {
    for (let n = 7; n <= 20; n++) {
      const totals = Array.from({ length: n }, (_, i) => i + 1);
      const counts = computeOptimalPartitionCounts(totals);
      expect(counts[0]).toBe(1);
      expect(counts[6]).toBe(1);
    }
  });

  it("never leaves a middle column empty once n >= 7", () => {
    for (let n = 7; n <= 20; n++) {
      const totals = Array.from({ length: n }, (_, i) => i + 1);
      const counts = computeOptimalPartitionCounts(totals);
      [1, 2, 3, 4, 5].forEach((i) => expect(counts[i]).toBeGreaterThan(0));
    }
  });
});

describe("computeLiveDistribution", () => {
  it("puts the single student in the center", () => {
    const grid = computeLiveDistribution([5], { 5: 200 });
    expect(grid[4]).toEqual([5]);
  });

  it("reproduces the bug report: the two highest scorers (400, 390) must not both land in group 7", () => {
    const students = [1, 2, 3, 4, 5, 6, 12, 15];
    const totals = { 1: 200, 2: 270, 3: 270, 4: 290, 5: 290, 6: 300, 12: 400, 15: 390 };
    const weakToStrong = [...students].sort((a, b) => totals[a] - totals[b]);
    const grid = computeLiveDistribution(weakToStrong, totals);
    expect(grid[7]).toEqual([12]);
    expect(grid[7]).not.toContain(15);
  });

  it("never leaves a middle column empty when real scores cluster, even with 17 students", () => {
    // Regression for a real report: 17 students with scores clustered
    // together (190-430) all landed in group 4 under earlier approaches.
    const weakToStrong = [8, 4, 10, 15, 7, 16, 2, 5, 3, 14, 11, 12, 13, 9, 1, 6, 17];
    const totals = {
      8: 190,
      4: 200,
      10: 210,
      15: 250,
      7: 250,
      16: 260,
      2: 260,
      5: 270,
      3: 270,
      14: 280,
      11: 280,
      12: 290,
      13: 320,
      9: 340,
      1: 380,
      6: 380,
      17: 430,
    };
    const grid = computeLiveDistribution(weakToStrong, totals);
    expect(grid[1]).toEqual([8]);
    expect(grid[7]).toEqual([17]);
    [2, 3, 4, 5, 6].forEach((g) => expect(grid[g].length).toBeGreaterThan(0));
  });

  it("isolates a clear outlier into its own column instead of grouping it with a tight cluster", () => {
    // 9 students: a tight cluster of scores plus two far outliers on the
    // strong end. The optimal partition should never merge the outliers
    // into the same group as the tightly-clustered scores.
    const students = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    const totals = {
      a: 50,
      b: 101,
      c: 102,
      d: 103,
      e: 104,
      f: 105,
      g: 900,
      h: 950,
      i: 999,
    };
    const grid = computeLiveDistribution(students, totals);
    const groupOf = (student) =>
      Object.entries(grid).find(([, members]) => members.includes(student))[0];
    expect(groupOf("g")).not.toBe(groupOf("f"));
  });
});

describe("sortWeakToStrongWithTieBreak", () => {
  it("sorts by total score ascending when there is no tie", () => {
    const totals = { 1: 100, 2: 300, 3: 200 };
    const spreads = { 1: 0, 2: 0, 3: 0 };
    expect(sortWeakToStrongWithTieBreak([1, 2, 3], totals, spreads)).toEqual([1, 3, 2]);
  });

  it("on a tied score, places the lower-spread student closer to the strong end", () => {
    const totals = { 1: 200, 17: 200 };
    const spreads = { 1: 4, 17: 1 }; // 17 is more consistent
    // 17 should end up last (strong end) since it has the lower spread.
    expect(sortWeakToStrongWithTieBreak([1, 17], totals, spreads)).toEqual([1, 17]);
    expect(sortWeakToStrongWithTieBreak([17, 1], totals, spreads)).toEqual([1, 17]);
  });

  it("on tied score AND spread, places the higher obs-trait average closer to the strong end", () => {
    const totals = { 1: 200, 17: 200 };
    const spreads = { 1: 3, 17: 3 };
    const obsAverages = { 1: 4, 17: 6 }; // 17 has the higher observational average
    expect(sortWeakToStrongWithTieBreak([1, 17], totals, spreads, obsAverages)).toEqual([1, 17]);
    expect(sortWeakToStrongWithTieBreak([17, 1], totals, spreads, obsAverages)).toEqual([1, 17]);
  });

  it("falls back to the lower student number when everything else ties", () => {
    const totals = { 1: 200, 17: 200 };
    const spreads = { 1: 3, 17: 3 };
    const obsAverages = { 1: 5, 17: 5 };
    // 1 has final priority for the strong end, so it sorts last.
    expect(sortWeakToStrongWithTieBreak([17, 1], totals, spreads, obsAverages)).toEqual([17, 1]);
  });
});

describe("findScoreTieGroups", () => {
  it("returns only groups with more than one student sharing a total", () => {
    const totals = { 1: 200, 2: 200, 3: 150 };
    expect(findScoreTieGroups([1, 2, 3], totals)).toEqual([[1, 2]]);
  });

  it("returns nothing when every score is unique", () => {
    const totals = { 1: 100, 2: 200, 3: 300 };
    expect(findScoreTieGroups([1, 2, 3], totals)).toEqual([]);
  });
});
