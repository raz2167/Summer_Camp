import { describe, expect, it } from "vitest";
import { HIST_DATA } from "../constants.js";
import {
  assignToHistogram,
  buildLiveHistogramGrid,
  computeLiveGroups,
  computeScore,
  computeSpread,
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

describe("assignToHistogram", () => {
  it("fills every slot defined by counts, weakest to group 1, strongest to group 7", () => {
    const counts = [1, 2, 3, 5, 3, 2, 1]; // 17-cadet histogram א
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
    const groups = assignToHistogram(counts, [1, 2, 3]); // only 3 cadets scored so far
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

describe("computeLiveGroups", () => {
  it("puts the single scored cadet in the center group", () => {
    expect(computeLiveGroups(1, { 5: 1 })).toEqual({ 5: 4 });
  });

  it("spreads ranks from weakest (group 1) to strongest (group 7)", () => {
    const rankMap = { a: 1, b: 2, c: 3 }; // rank 1 = strongest
    const groups = computeLiveGroups(3, rankMap);
    expect(groups.a).toBe(7);
    expect(groups.c).toBe(1);
  });
});

describe("buildLiveHistogramGrid", () => {
  it("buckets cadets by their assigned group", () => {
    const grid = buildLiveHistogramGrid([1, 2, 3], { 1: 4, 2: 4, 3: 7 });
    expect(grid[4]).toEqual([1, 2]);
    expect(grid[7]).toEqual([3]);
    expect(grid[1]).toEqual([]);
  });
});
