import { HIST_COLORS } from "../constants.js";

// Order 7→1 left-to-right. The page is RTL, but this row is forced
// direction: ltr so 7 always sits on the left and 1 on the right — an
// explicit client design decision, not a bug.
const ORDER = [7, 6, 5, 4, 3, 2, 1];

export default function HistogramGrid({ groups, showNumbers = true }) {
  return (
    <div>
      <div className="flex gap-2.5 items-end px-4 pt-5 pb-2" dir="ltr">
        {ORDER.map((g) => {
          const members = groups[g] || [];
          return (
            <div className="flex flex-col items-center w-14" key={g}>
              <div className="flex flex-col-reverse gap-[3px] w-full min-h-[34px]">
                {members.map((student, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg flex items-center justify-center font-bold text-[13px] min-h-[30px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] animate-hist-grow"
                    style={{
                      background: HIST_COLORS[g],
                      color: g <= 2 || g === 7 ? "#F5F1E8" : "#1C2321",
                    }}
                  >
                    {showNumbers && student != null ? student : ""}
                  </div>
                ))}
                {members.length === 0 && <div className="min-h-[30px]" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2.5 px-4" dir="ltr">
        {ORDER.map((g) => (
          <div
            key={g}
            className="w-14 text-center text-xs font-semibold text-muted-2 pt-1.5 border-t border-sand-dim"
          >
            {g}
          </div>
        ))}
      </div>
    </div>
  );
}
