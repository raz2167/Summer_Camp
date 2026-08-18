import { useMemo, useState } from "react";
import { HIST_COLORS, HIST_DATA, OBS_TRAITS, TRAITS, VARIANT_NAMES } from "../constants.js";
import {
  assignToHistogram,
  computeLiveDistribution,
  computeObsAverage,
  computeScore,
  computeSpread,
  computeWithinGroupSumOfSquares,
  findScoreTieGroups,
  sortWeakToStrongWithTieBreak,
} from "../logic.js";
import HistogramGrid from "./HistogramGrid.jsx";
import PageStudentScore from "./PageStudentScore.jsx";

export default function PageScoring({ setup, session, setSession, onBack }) {
  const { active } = setup;
  const [openStudent, setOpenStudent] = useState(null);
  const scores = session.scores;
  const obsScores = session.obsScores;
  const weights = session.weights;
  const selectedVariant = session.selectedVariant;
  const activeCount = active.length;

  const setScore = (student, traitIdx, val) => {
    const clean = Math.max(0, Math.min(7, Number(val) || 0));
    setSession((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [student]: prev.scores[student].map((v, i) => (i === traitIdx ? clean : v)),
      },
    }));
  };
  const setObsScore = (student, idx, val) => {
    const clean = Math.max(0, Math.min(7, Number(val) || 0));
    setSession((prev) => ({
      ...prev,
      obsScores: {
        ...prev.obsScores,
        [student]: prev.obsScores[student].map((v, i) => (i === idx ? clean : v)),
      },
    }));
  };
  const setWeights = (updater) => {
    setSession((prev) => ({ ...prev, weights: updater(prev.weights) }));
  };
  const setSelectedVariant = (i) => {
    setSession((prev) => ({ ...prev, selectedVariant: i }));
  };

  // TEMP TESTING TOOLS — remove before shipping.
  // bias > 1 skews toward low scores (weak class), bias < 1 skews toward
  // high scores (strong class), bias = 1 is a uniform draw.
  const biasedScore = (bias) => 1 + Math.round(Math.pow(Math.random(), bias) * 6);
  const fillRandom = (bias = 1) => {
    setSession((prev) => ({
      ...prev,
      scores: Object.fromEntries(
        active.map((c) => [c, Array(7).fill(0).map(() => biasedScore(bias))])
      ),
      obsScores: Object.fromEntries(
        active.map((c) => [c, Array(2).fill(0).map(() => biasedScore(bias))])
      ),
    }));
  };
  const resetScores = () => {
    setSession((prev) => ({
      ...prev,
      scores: Object.fromEntries(active.map((c) => [c, Array(7).fill(0)])),
      obsScores: Object.fromEntries(active.map((c) => [c, Array(2).fill(0)])),
      selectedVariant: null,
    }));
  };

  const computed = useMemo(() => {
    // Only ever iterate over the CURRENT active list — a student number that
    // was removed (e.g. marked as dropped) never appears in totals, rank,
    // or the weak->strong ordering, so it cannot show up in any histogram.
    const totals = {};
    const spreads = {};
    const obsAverages = {};
    active.forEach((c) => {
      totals[c] = computeScore(scores[c] || Array(7).fill(0), weights);
      spreads[c] = computeSpread(scores[c] || []);
      obsAverages[c] = computeObsAverage(obsScores[c] || []);
    });

    // Only students with at least one non-zero score participate in either
    // histogram — this lets both fill in gradually as scores are typed,
    // instead of jumping from empty to full.
    const scoredActive = active.filter((c) => (scores[c] || []).some((v) => v > 0));

    // Both histograms use the same deterministic weak-to-strong ordering
    // and tie-break rule (lower spread, then higher obs-trait average, then
    // lower student number — see sortWeakToStrongWithTieBreak in logic.js),
    // so neither one can ever bunch more than one student into group 1 or
    // group 7 except where the underlying rule genuinely allows it.
    const scoredWeakToStrong = sortWeakToStrongWithTieBreak(
      scoredActive,
      totals,
      spreads,
      obsAverages
    );
    const tieGroups = findScoreTieGroups(scoredActive, totals);

    // The "true distribution" chart's shape is derived from how the real
    // scores actually cluster — see computeLiveDistribution in logic.js.
    // Only the single weakest/strongest students ever land in groups 1/7,
    // and (once >= 7 students are scored) no middle column is ever empty.
    const liveGrid = computeLiveDistribution(scoredWeakToStrong, totals);

    // Same grouping as the "true distribution" chart, indexed by student —
    // used to color the ranking row in the table below with the identical
    // group colors as the fixed histograms (HIST_COLORS).
    const groupByStudent = {};
    Object.entries(liveGrid).forEach(([g, list]) => {
      list.forEach((s) => {
        groupByStudent[s] = Number(g);
      });
    });

    return { totals, spreads, liveGrid, groupByStudent, scoredWeakToStrong, tieGroups };
  }, [scores, obsScores, weights, active]);

  const histVariants = HIST_DATA[activeCount] || [];
  const fixedGrids = histVariants.map((counts) =>
    assignToHistogram(counts, computed.scoredWeakToStrong)
  );
  // Shared across every fixed-template card so they all reserve the same
  // vertical space for their bars — same frame size, same baseline — no
  // matter how much shorter a given card's own tallest column is.
  const fixedMaxSlots = histVariants.length > 0 ? Math.max(...histVariants.flat()) : 0;
  // Shared between the live "true distribution" chart and the selected
  // fixed template in the side-by-side comparison, so both baselines line
  // up regardless of which one's tallest column is actually taller.
  const liveMaxSlots = Math.max(0, ...Object.values(computed.liveGrid).map((arr) => arr.length));
  const comparisonMinSlots = Math.max(fixedMaxSlots, liveMaxSlots);
  // Purely informational: which fixed template's groups best match the real
  // scores (lowest within-group sum of squared deviations — see
  // computeWithinGroupSumOfSquares in logic.js). The user still picks.
  const fitScores =
    computed.scoredWeakToStrong.length > 0
      ? fixedGrids.map((grid) => computeWithinGroupSumOfSquares(grid, computed.totals))
      : [];
  const bestVariantIndex =
    fitScores.length > 0
      ? fitScores.reduce((bestIdx, score, i) => (score < fitScores[bestIdx] ? i : bestIdx), 0)
      : null;
  const allScoresEntered = active.every((c) => (scores[c] || []).every((v) => v > 0));

  if (openStudent != null) {
    return (
      <PageStudentScore
        student={openStudent}
        active={active}
        scores={scores}
        obsScores={obsScores}
        setScore={setScore}
        setObsScore={setObsScore}
        onNavigate={setOpenStudent}
        onFinish={() => setOpenStudent(null)}
      />
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-20">
      <div className="mb-8">
        <button
          className="bg-transparent border-none text-muted text-[13px] font-semibold cursor-pointer p-0 mb-5 font-heebo hover:text-ink"
          onClick={onBack}
        >
          → חזרה
        </button>
        <div className="text-xs font-bold tracking-wider text-cta uppercase mb-2">
          שלב ב׳ · {activeCount} חניכים פעילים
        </div>
        <h1 className="text-[34px] font-extrabold m-0 tracking-tight">הזנת ציונים</h1>

        {/* TEMP TESTING TOOLS — remove before shipping. */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            className="bg-gold text-ink border-none py-2 px-4 text-[13px] font-bold rounded font-heebo cursor-pointer hover:opacity-90"
            onClick={() => fillRandom(1)}
          >
            🎲 מלא אקראית (בדיקה)
          </button>
          <button
            className="bg-green text-cream border-none py-2 px-4 text-[13px] font-bold rounded font-heebo cursor-pointer hover:opacity-90"
            onClick={() => fillRandom(0.35)}
          >
            💪 מלא אקראי — כיתה חזקה
          </button>
          <button
            className="bg-warn text-cream border-none py-2 px-4 text-[13px] font-bold rounded font-heebo cursor-pointer hover:opacity-90"
            onClick={() => fillRandom(2.5)}
          >
            📉 מלא אקראי — כיתה חלשה
          </button>
          <button
            className="bg-transparent border border-sand text-muted py-2 px-4 text-[13px] font-bold rounded font-heebo cursor-pointer hover:border-muted"
            onClick={resetScores}
          >
            איפוס
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-cream border border-sand rounded-md mb-6">
        <table className="border-collapse w-full text-[13px]">
          <thead>
            <tr>
              <th className="border border-cream-line p-1 text-right min-w-[180px] bg-ink text-cream font-bold py-2.5 px-1 sticky top-0">
                תכונה
              </th>
              {active.map((c) => (
                <th
                  key={c}
                  className="border border-cream-line p-0 text-center min-w-[42px] bg-ink text-cream font-bold sticky top-0"
                >
                  <button
                    className="w-full h-full py-2.5 px-1 bg-transparent border-none text-cream font-bold font-heebo cursor-pointer hover:bg-white/10"
                    onClick={() => setOpenStudent(c)}
                    aria-label={`פתח הזנת ציונים לתלמיד ${c}`}
                  >
                    {c}
                  </button>
                </th>
              ))}
              <th className="border border-cream-line p-1 text-center min-w-[90px] bg-ink text-cream font-bold py-2.5 px-1 sticky top-0">
                משקל
              </th>
            </tr>
          </thead>
          <tbody>
            {TRAITS.map((trait, tIdx) => (
              <tr key={trait}>
                <td className="border border-cream-line text-right font-semibold py-2 px-3 bg-cream-dim whitespace-nowrap">
                  {trait}
                </td>
                {active.map((c) => (
                  <td key={c} className="border border-cream-line p-1 text-center min-w-[42px]">
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${trait} — תלמיד ${c}`}
                      min={1}
                      max={7}
                      value={(scores[c] && scores[c][tIdx]) || ""}
                      onChange={(e) => setScore(c, tIdx, e.target.value)}
                      className="w-9 h-[30px] text-center border border-sand rounded font-bold text-base font-heebo bg-input text-input-text focus:outline-none focus:border-green focus:shadow-[0_0_0_2px_rgba(46,92,62,0.2)]"
                    />
                  </td>
                ))}
                <td className="border border-cream-line p-1 text-center min-w-[42px]">
                  <select
                    value={weights[tIdx]}
                    onChange={(e) =>
                      setWeights((prev) => prev.map((w, i) => (i === tIdx ? e.target.value : w)))
                    }
                    className="font-heebo text-xs p-1 rounded border border-sand bg-cream"
                  >
                    <option>גבוה</option>
                    <option>רגיל</option>
                    <option>נמוך</option>
                  </select>
                </td>
              </tr>
            ))}
            {OBS_TRAITS.map((trait, oIdx) => (
              <tr key={trait} className="bg-obs-bg">
                <td className="border border-cream-line text-right font-semibold py-2 px-3 whitespace-nowrap text-obs italic bg-obs-bg">
                  {trait}
                </td>
                {active.map((c) => (
                  <td
                    key={c}
                    className="border border-cream-line p-1 text-center min-w-[42px] bg-obs-bg"
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${trait} — תלמיד ${c} (לצפייה בלבד)`}
                      min={1}
                      max={7}
                      value={(obsScores[c] && obsScores[c][oIdx]) || ""}
                      onChange={(e) => setObsScore(c, oIdx, e.target.value)}
                      className="w-9 h-[30px] text-center border border-sand rounded font-bold text-base font-heebo bg-input text-obs focus:outline-none focus:border-green"
                    />
                  </td>
                ))}
                <td className="border border-cream-line p-1 text-center text-[11px] text-obs italic bg-obs-bg">
                  לצפייה בלבד
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-cream-line text-right font-semibold py-2 px-3 bg-cream-line font-extrabold">
                ציון
              </td>
              {active.map((c) => (
                <td
                  key={c}
                  className="border border-cream-line p-1 text-center bg-cream-line font-extrabold text-sm"
                >
                  {computed.totals[c]}
                </td>
              ))}
              <td className="border border-cream-line bg-cream-line" />
            </tr>
            <tr>
              <td className="border border-cream-line text-right font-semibold py-2 px-3 text-xs">
                משרעת
              </td>
              {active.map((c) => {
                const spread = computeSpread(scores[c] || []);
                return (
                  <td
                    key={c}
                    className={
                      "border border-cream-line p-1 text-center text-xs " +
                      (spread <= 2
                        ? "bg-warn-bg text-warn font-extrabold"
                        : "text-muted-2")
                    }
                  >
                    {spread || "—"}
                  </td>
                );
              })}
              <td className="border border-cream-line" />
            </tr>
            <tr>
              <td
                colSpan={active.length + 2}
                className="border-t-2 border-ink pt-3 pb-1 px-3 text-right text-xs font-extrabold"
              >
                דירוג תלמידים
              </td>
            </tr>
            <tr>
              <td className="border border-cream-line text-right font-semibold py-2 px-3 text-xs">
                דירוג
              </td>
              {active.map((_, i) => {
                const student = computed.scoredWeakToStrong[i];
                if (student == null) {
                  return (
                    <td
                      key={i}
                      className="border border-cream-line p-1 text-center text-xs text-muted-2"
                    >
                      —
                    </td>
                  );
                }
                const group = computed.groupByStudent[student];
                const light = group <= 2 || group === 7;
                return (
                  <td
                    key={i}
                    className="border border-cream-line p-1 text-center text-xs font-bold"
                    style={{ background: HIST_COLORS[group], color: light ? "#F5F1E8" : "#1C2321" }}
                  >
                    {student}
                  </td>
                );
              })}
              <td className="border border-cream-line" />
            </tr>
            <tr>
              <td className="border border-cream-line text-right font-semibold py-2 px-3 text-xs">
                ציון
              </td>
              {active.map((_, i) => {
                const student = computed.scoredWeakToStrong[i];
                return (
                  <td
                    key={i}
                    className="border border-cream-line p-1 text-center text-xs text-muted-2"
                  >
                    {student != null ? computed.totals[student] : "—"}
                  </td>
                );
              })}
              <td className="border border-cream-line" />
            </tr>
          </tbody>
        </table>
      </div>

      {!allScoresEntered && (
        <div className="bg-hint border border-hint-border text-hint-text py-3 px-[18px] rounded-md text-[13px] font-semibold mb-8">
          מלא ציון (1–7) לכל תכונה ולכל חניך כדי לראות את ההיסטוגרמה המלאה
        </div>
      )}

      <section className="mt-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-lg font-extrabold mb-5">
              <span className="block text-[11px] font-bold tracking-wider text-green uppercase mb-1">
                התפלגות אמיתית
              </span>
              התפלגות נורמלית לפי הציונים שהזנת עד כה
            </div>
            <HistogramGrid groups={computed.liveGrid} minSlots={comparisonMinSlots} />
          </div>
          <div>
            <div className="text-lg font-extrabold mb-5">
              <span className="block text-[11px] font-bold tracking-wider text-cta uppercase mb-1">
                השוואה
              </span>
              {bestVariantIndex == null ? (
                "טרם ניתן לחשב היסטוגרמה מומלצת"
              ) : selectedVariant == null || selectedVariant === bestVariantIndex ? (
                <>
                  היסטוגרמה מומלצת — היסטוגרמה {VARIANT_NAMES[bestVariantIndex]} · שונות
                  פנימית {Math.round(fitScores[bestVariantIndex])}
                </>
              ) : (
                <>
                  היסטוגרמה {VARIANT_NAMES[selectedVariant]} · שונות פנימית{" "}
                  {Math.round(fitScores[selectedVariant])} — קיימת התאמה טובה יותר: היסטוגרמה{" "}
                  {VARIANT_NAMES[bestVariantIndex]} (שונות {Math.round(fitScores[bestVariantIndex])})
                </>
              )}
            </div>
            {bestVariantIndex != null ? (
              <HistogramGrid
                groups={
                  fixedGrids[selectedVariant != null ? selectedVariant : bestVariantIndex]
                }
                minSlots={comparisonMinSlots}
              />
            ) : (
              <p className="text-xs text-muted-2 px-4">
                מלא ציונים לפחות לתלמיד אחד כדי לראות כאן היסטוגרמה מומלצת.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="text-lg font-extrabold mb-5">
          <span className="block text-[11px] font-bold tracking-wider text-cta uppercase mb-1">
            שלב ג׳
          </span>
          בחר את ההיסטוגרמה הקבועה המתאימה ביותר
        </div>

        {computed.tieGroups.length > 0 && (
          <div className="bg-hint border border-hint-border text-hint-text py-3 px-[18px] rounded-md text-[13px] font-semibold mb-6">
            הערה: מבנה ההיסטוגרמות הקבועות (וגם ההתפלגות האמיתית) קבוע ואינו משתנה. כאשר
            לכמה תלמידים יש ציון זהה והם מתחרים על אותו מקום, השיבוץ נקבע לפי משרעת נמוכה
            יותר קודם; אם גם המשרעת זהה — לפי ממוצע כושר גופני והתאמה לפעילות שטח (גבוה
            יותר עדיף); ואם גם זה זהה — לפי מספר תלמיד נמוך יותר.
            <ul className="list-disc pr-5 mt-2 font-normal">
              {computed.tieGroups.map((group) => (
                <li key={group.join("-")}>
                  תלמידים {group.slice().sort((a, b) => a - b).join(", ")} — ציון זהה (
                  {computed.totals[group[0]]})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {fixedGrids.map((grid, i) => (
            <div
              key={i}
              className={
                "border-2 rounded-2xl p-[18px] cursor-pointer transition-all overflow-x-auto hover:-translate-y-px " +
                (selectedVariant === i
                  ? "border-green bg-[#EAF0E4] shadow-[0_4px_14px_rgba(46,92,62,0.15)]"
                  : "border-cream-line bg-cream hover:border-gold-dim")
              }
              onClick={() => setSelectedVariant(i)}
            >
              <div className="font-extrabold text-[15px] mb-3.5 flex items-center gap-2.5 flex-wrap">
                היסטוגרמה {VARIANT_NAMES[i]}
                {selectedVariant === i && (
                  <span className="bg-green text-cream text-[11px] py-[3px] px-2.5 rounded-full font-bold">
                    נבחר
                  </span>
                )}
                {bestVariantIndex === i && (
                  <span className="bg-gold text-ink text-[11px] py-[3px] px-2.5 rounded-full font-bold">
                    התאמה טובה ביותר
                  </span>
                )}
              </div>
              <HistogramGrid groups={grid} minSlots={fixedMaxSlots} />
              {fitScores.length > 0 && (
                <div className="text-xs text-muted-2 mt-2 px-1">
                  שונות פנימית: {Math.round(fitScores[i])}
                  {bestVariantIndex === i && " (הנמוכה ביותר)"}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
