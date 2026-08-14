import { useMemo } from "react";
import { HIST_DATA, OBS_TRAITS, TRAITS, VARIANT_NAMES } from "../constants.js";
import {
  assignToHistogram,
  buildLiveHistogramGrid,
  computeLiveGroups,
  computeScore,
  computeSpread,
} from "../logic.js";
import HistogramGrid from "./HistogramGrid.jsx";

export default function PageScoring({ setup, session, setSession, onBack }) {
  const { active } = setup;
  const scores = session.scores;
  const obsScores = session.obsScores;
  const weights = session.weights;
  const selectedVariant = session.selectedVariant;
  const activeCount = active.length;

  const setScore = (cadet, traitIdx, val) => {
    const clean = Math.max(0, Math.min(7, Number(val) || 0));
    setSession((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [cadet]: prev.scores[cadet].map((v, i) => (i === traitIdx ? clean : v)),
      },
    }));
  };
  const setObsScore = (cadet, idx, val) => {
    const clean = Math.max(0, Math.min(7, Number(val) || 0));
    setSession((prev) => ({
      ...prev,
      obsScores: {
        ...prev.obsScores,
        [cadet]: prev.obsScores[cadet].map((v, i) => (i === idx ? clean : v)),
      },
    }));
  };
  const setWeights = (updater) => {
    setSession((prev) => ({ ...prev, weights: updater(prev.weights) }));
  };
  const setSelectedVariant = (i) => {
    setSession((prev) => ({ ...prev, selectedVariant: i }));
  };

  const computed = useMemo(() => {
    // Only ever iterate over the CURRENT active list — a cadet number that
    // was removed (e.g. marked as dropped) never appears in totals, rank,
    // or the weak->strong ordering, so it cannot show up in any histogram.
    const totals = {};
    active.forEach((c) => {
      totals[c] = computeScore(scores[c] || Array(7).fill(0), weights);
    });

    // Only cadets with at least one non-zero score participate in the
    // live histogram — this lets it fill in gradually as scores are typed,
    // instead of jumping from empty to full.
    const scoredActive = active.filter((c) => (scores[c] || []).some((v) => v > 0));

    const scoredSorted = [...scoredActive].sort((a, b) => totals[b] - totals[a]);
    const liveRankMap = {};
    scoredSorted.forEach((c, i) => {
      liveRankMap[c] = i + 1;
    });
    const liveGroups = computeLiveGroups(scoredActive.length, liveRankMap);
    const liveGrid = buildLiveHistogramGrid(scoredActive, liveGroups);

    return { totals, liveGrid };
  }, [scores, weights, active]);

  const histVariants = HIST_DATA[activeCount] || [];
  const scoredWeakToStrong = useMemo(() => {
    const scoredActive = active.filter((c) => (scores[c] || []).some((v) => v > 0));
    return [...scoredActive].sort((a, b) => computed.totals[a] - computed.totals[b]);
  }, [active, scores, computed.totals]);
  const fixedGrids = histVariants.map((counts) => assignToHistogram(counts, scoredWeakToStrong));
  const allScoresEntered = active.every((c) => (scores[c] || []).every((v) => v > 0));

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
                  className="border border-cream-line p-1 text-center min-w-[42px] bg-ink text-cream font-bold py-2.5 px-1 sticky top-0"
                >
                  {c}
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
                      aria-label={`${trait} — מלש"ב ${c}`}
                      min={1}
                      max={7}
                      value={(scores[c] && scores[c][tIdx]) || ""}
                      onChange={(e) => setScore(c, tIdx, e.target.value)}
                      className="w-9 h-[30px] text-center border border-sand rounded font-bold text-sm font-heebo bg-input text-input-text focus:outline-none focus:border-green focus:shadow-[0_0_0_2px_rgba(46,92,62,0.2)]"
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
                      aria-label={`${trait} — מלש"ב ${c} (לצפייה בלבד)`}
                      min={1}
                      max={7}
                      value={(obsScores[c] && obsScores[c][oIdx]) || ""}
                      onChange={(e) => setObsScore(c, oIdx, e.target.value)}
                      className="w-9 h-[30px] text-center border border-sand rounded font-bold text-sm font-heebo bg-input text-obs focus:outline-none focus:border-green"
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
          </tbody>
        </table>
      </div>

      {!allScoresEntered && (
        <div className="bg-hint border border-hint-border text-hint-text py-3 px-[18px] rounded-md text-[13px] font-semibold mb-8">
          מלא ציון (1–7) לכל תכונה ולכל חניך כדי לראות את ההיסטוגרמה המלאה
        </div>
      )}

      <section className="mt-12">
        <div className="text-lg font-extrabold mb-5">
          <span className="block text-[11px] font-bold tracking-wider text-green uppercase mb-1">
            התפלגות אמיתית
          </span>
          התפלגות נורמלית לפי הציונים שהזנת עד כה
        </div>
        <HistogramGrid groups={computed.liveGrid} />
      </section>

      <section className="mt-12">
        <div className="text-lg font-extrabold mb-5">
          <span className="block text-[11px] font-bold tracking-wider text-cta uppercase mb-1">
            שלב ג׳
          </span>
          בחר את ההיסטוגרמה הקבועה המתאימה ביותר
        </div>
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
              <div className="font-extrabold text-[15px] mb-3.5 flex items-center gap-2.5">
                היסטוגרמה {VARIANT_NAMES[i]}
                {selectedVariant === i && (
                  <span className="bg-green text-cream text-[11px] py-[3px] px-2.5 rounded-full font-bold">
                    נבחר
                  </span>
                )}
              </div>
              <HistogramGrid groups={grid} showNumbers={false} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
