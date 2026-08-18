import { OBS_TRAITS, TRAITS } from "../constants.js";

function SliderRow({ label, value, onChange, obs = false }) {
  return (
    <div className={"py-5 border-b border-cream-line " + (obs ? "bg-obs-bg -mx-6 px-6" : "")}>
      <div className="flex items-baseline justify-between mb-2">
        <span className={"font-semibold text-[15px] " + (obs ? "italic text-obs" : "")}>
          {label}
          {obs && <span className="text-[11px] font-normal mr-2">(לצפייה בלבד)</span>}
        </span>
        <span className={"text-2xl font-black " + (obs ? "text-obs" : "text-green")}>
          {value || "—"}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={7}
        step={1}
        value={value || 4}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-8 accent-green"
      />
      <div className="flex justify-between px-0.5 mt-1">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className="text-xs font-semibold text-muted-2 w-4 text-center">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PageStudentScore({
  student,
  active,
  scores,
  obsScores,
  setScore,
  setObsScore,
  onNavigate,
  onFinish,
}) {
  const idx = active.indexOf(student);
  const hasPrev = idx > 0;
  const hasNext = idx < active.length - 1;

  return (
    <div className="max-w-[600px] mx-auto px-6 pt-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <button
          className="bg-transparent border-none text-muted text-[13px] font-semibold cursor-pointer p-0 font-heebo hover:text-ink"
          onClick={onFinish}
        >
          → חזרה לטבלה
        </button>
        <button
          className="bg-cta text-cream border-none py-2 px-4 text-[13px] font-bold rounded font-heebo cursor-pointer hover:bg-cta-hover"
          onClick={onFinish}
        >
          סיים
        </button>
      </div>

      <div className="text-xs font-bold tracking-wider text-cta uppercase mb-2">
        תלמיד {idx + 1} מתוך {active.length}
      </div>
      <h1 className="text-[32px] font-extrabold mb-6 tracking-tight">תלמיד {student}</h1>

      {TRAITS.map((trait, tIdx) => (
        <SliderRow
          key={trait}
          label={trait}
          value={(scores[student] && scores[student][tIdx]) || 0}
          onChange={(v) => setScore(student, tIdx, v)}
        />
      ))}
      {OBS_TRAITS.map((trait, oIdx) => (
        <SliderRow
          key={trait}
          label={trait}
          obs
          value={(obsScores[student] && obsScores[student][oIdx]) || 0}
          onChange={(v) => setObsScore(student, oIdx, v)}
        />
      ))}

      <div className="flex gap-3 mt-8">
        <button
          className="flex-1 bg-cream border border-sand text-ink py-4 px-4 text-base font-bold rounded font-heebo disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-green"
          disabled={!hasPrev}
          onClick={() => onNavigate(active[idx - 1])}
        >
          → הקודם
        </button>
        {hasNext ? (
          <button
            className="flex-1 bg-cta text-cream border-none py-4 px-4 text-base font-bold rounded font-heebo cursor-pointer hover:bg-cta-hover"
            onClick={() => onNavigate(active[idx + 1])}
          >
            הבא ←
          </button>
        ) : (
          <button
            className="flex-1 bg-green text-cream border-none py-4 px-4 text-base font-bold rounded font-heebo cursor-pointer hover:opacity-90"
            onClick={onFinish}
          >
            סיים ✓
          </button>
        )}
      </div>
    </div>
  );
}
