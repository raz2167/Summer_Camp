import { useState } from "react";
import PageSetup from "./components/PageSetup.jsx";
import PageScoring from "./components/PageScoring.jsx";

export default function App() {
  const [step, setStep] = useState("setup");
  const [setup, setSetup] = useState(null);
  // Session state lives here, at App level, so going back to page 1
  // and returning to page 2 without changing active students keeps everything.
  const [session, setSession] = useState(null); // { scores, obsScores, weights, selectedVariant }

  const handleContinue = (data) => {
    setSession((prev) => {
      // If the active-student set is unchanged, keep existing session data
      if (
        prev &&
        setup &&
        data.active.length === setup.active.length &&
        data.active.every((n, i) => n === setup.active[i])
      ) {
        return prev;
      }
      // Otherwise (first time, or active list changed) start a fresh session
      // but preserve any scores for students that are still active.
      const prevScores = prev?.scores || {};
      const prevObs = prev?.obsScores || {};
      return {
        scores: Object.fromEntries(
          data.active.map((n) => [n, prevScores[n] ? [...prevScores[n]] : Array(7).fill(0)])
        ),
        obsScores: Object.fromEntries(
          data.active.map((n) => [n, prevObs[n] ? [...prevObs[n]] : Array(2).fill(0)])
        ),
        weights: prev?.weights || Array(7).fill("רגיל"),
        selectedVariant: null,
      };
    });
    setSetup(data);
    setStep("scoring");
  };

  return (
    <div dir="rtl">
      <header className="bg-ink border-b-[3px] border-gold">
        <div className="max-w-[1100px] mx-auto py-[18px] px-6 flex items-baseline gap-3">
          <span className="font-black text-[22px] text-cream tracking-tight">מחנה קיץ - צופים</span>
          <span className="text-[13px] text-brand-sub font-medium">מערכת הערכת תלמידים</span>
        </div>
      </header>
      {step === "setup" && <PageSetup initialSetup={setup} onContinue={handleContinue} />}
      {step === "scoring" && setup && session && (
        <PageScoring
          setup={setup}
          session={session}
          setSession={setSession}
          onBack={() => setStep("setup")}
        />
      )}
    </div>
  );
}
