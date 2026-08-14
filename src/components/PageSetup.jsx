import { useState } from "react";

export default function PageSetup({ initialSetup, onContinue }) {
  const [size, setSize] = useState(initialSetup?.size || 17);
  const [missing, setMissing] = useState(() => {
    if (!initialSetup) return [];
    const activeSet = new Set(initialSetup.active);
    return Array.from({ length: initialSetup.size }, (_, i) => i + 1).filter(
      (n) => !activeSet.has(n)
    );
  });
  const activeCount = size - missing.length;
  const validSize = activeCount >= 14 && activeCount <= 17;

  const toggleMissing = (n) => {
    setMissing((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-20">
      <div className="text-xs font-bold tracking-wider text-cta uppercase mb-2">שלב א׳</div>
      <h1 className="text-[34px] font-extrabold mb-3 tracking-tight">כמה מלש״בים בכיתה?</h1>
      <p className="text-[15px] text-muted max-w-[520px] leading-relaxed mb-10">
        בחר את גודל הכיתה המקורי, ולאחר מכן סמן אילו מספרי ברזל אינם פעילים (פרשו).
      </p>

      <div className="flex gap-3 mb-10 flex-wrap">
        {[17, 16, 15, 14].map((s) => (
          <button
            key={s}
            className={
              "w-[72px] h-[72px] rounded font-heebo text-[26px] font-extrabold border-2 transition-all " +
              (size === s
                ? "bg-green border-green text-cream"
                : "bg-cream border-sand text-ink hover:border-green")
            }
            onClick={() => {
              setSize(s);
              setMissing((prev) => prev.filter((n) => n <= s));
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-cream border border-sand rounded-md p-6 mb-7">
        <div className="text-[13px] font-bold text-muted mb-4">מספרי ברזל שאינם פעילים</div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={
                "w-11 h-11 rounded font-heebo text-[15px] font-bold border-2 border-transparent transition-all " +
                (missing.includes(n)
                  ? "bg-warn text-cream line-through"
                  : "bg-cream-line text-ink hover:bg-sand-dim")
              }
              onClick={() => toggleMissing(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2.5 mb-8 py-4 px-5 bg-ink rounded-md text-cream flex-wrap">
        <span className="text-3xl font-black text-gold">{activeCount}</span>
        <span className="text-sm text-sand">חניכים פעילים</span>
        {!validSize && (
          <span className="mr-auto text-[13px] text-[#E08B5E] font-semibold">
            טווח נתמך: 14–17 חניכים פעילים
          </span>
        )}
      </div>

      <button
        className="bg-cta text-cream border-none py-4 px-8 text-base font-bold rounded font-heebo transition-all disabled:bg-sand disabled:cursor-not-allowed enabled:hover:bg-cta-hover enabled:cursor-pointer"
        disabled={!validSize}
        onClick={() =>
          onContinue({
            size,
            active: Array.from({ length: size }, (_, i) => i + 1).filter(
              (n) => !missing.includes(n)
            ),
          })
        }
      >
        המשך להזנת ציונים ←
      </button>
    </div>
  );
}
