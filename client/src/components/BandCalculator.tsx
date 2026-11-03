import { useId, useMemo, useState } from "react";

/* ====================================================================== *
 *  THE BAND CALCULATOR                                                   *
 *                                                                        *
 *  The one thing on the IELTS page a visitor can actually do, and the    *
 *  one piece of it that belongs to IELTS and to nothing else: the band   *
 *  scale, and the specific way four skill scores collapse into one.      *
 *                                                                        *
 *  Every other prep site prints "7+" as a claim. The scale itself is     *
 *  the subject's own structure, so the page is built around it rather    *
 *  than around an adjective.                                             *
 *                                                                        *
 *  Works with a thumb: native range inputs, so they are draggable,       *
 *  keyboard-operable and screen-reader-labelled without any of that      *
 *  being rebuilt. The result is announced politely rather than on every  *
 *  intermediate value, so dragging a slider does not produce a stream of *
 *  speech.                                                               *
 * ====================================================================== */

/** The four papers, in the order the test is actually sat. */
const SKILLS = [
  { key: "listening", label: "Listening", detail: "30 min · 40 questions" },
  { key: "reading", label: "Reading", detail: "60 min · 40 questions" },
  { key: "writing", label: "Writing", detail: "60 min · 2 tasks" },
  { key: "speaking", label: "Speaking", detail: "11–14 min · 3 parts" },
] as const;

type SkillKey = (typeof SKILLS)[number]["key"];

/** The official descriptors. These are IELTS's own words for each band,
 *  not a marketing gloss, which is why they are worth printing. */
const DESCRIPTOR: Record<number, string> = {
  9: "Expert user",
  8.5: "Very good user",
  8: "Very good user",
  7.5: "Good user",
  7: "Good user",
  6.5: "Competent user",
  6: "Competent user",
  5.5: "Modest user",
  5: "Modest user",
  4.5: "Limited user",
  4: "Limited user",
  3.5: "Extremely limited user",
  3: "Extremely limited user",
  2.5: "Intermittent user",
  2: "Intermittent user",
  1.5: "Non-user",
  1: "Non-user",
  0.5: "Non-user",
  0: "Did not attempt",
};

/**
 * The overall band: the mean of the four, rounded to the nearest half band,
 * with an average ending in .25 going UP to the next half band and one
 * ending in .75 going UP to the next whole band.
 *
 * `Math.round(avg * 2) / 2` is exactly that rule and not an approximation of
 * it: JavaScript's Math.round breaks a tie upward, so 6.25 → 12.5 → 13 → 6.5
 * and 6.75 → 13.5 → 14 → 7.0, while 6.125 → 12.25 → 12 → 6.0 rounds down as
 * it should. Every possible average here is a multiple of 0.125, all of which
 * are exact in binary floating point, so no value sits on a fuzzy edge.
 */
export function overallBand(scores: number[]): number {
  const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length;
  return Math.round(avg * 2) / 2;
}

/** 7.0 prints as "7.0", not "7" — a band is always written to one decimal. */
function band(n: number): string {
  return n.toFixed(1);
}

/** How far short, in the words a person would use. "1.0 bands" is how a
 *  machine says it; "One band" is how the office says it. */
function shortfall(gap: number): string {
  if (gap === 0.5) return "Half a band";
  if (gap === 1) return "One band";
  return `${band(gap)} bands`;
}

type Props = {
  /** The band the course is aimed at, marked on the scale as a target. */
  target?: number;
  /** Compact enough to sit in the hero beside the headline. */
  tone?: "ink" | "light";
};

export default function BandCalculator({ target = 7, tone = "ink" }: Props) {
  const uid = useId();
  const [scores, setScores] = useState<Record<SkillKey, number>>({
    listening: 6,
    reading: 5.5,
    writing: 5.5,
    speaking: 6,
  });

  const overall = useMemo(
    () => overallBand(SKILLS.map(s => scores[s.key])),
    [scores]
  );

  const hitsTarget = overall >= target;
  const gap = Math.round((target - overall) * 2) / 2;

  return (
    <div className={`bc bc-${tone} ${tone === "ink" ? "bc-inset" : ""}`}>
      {/* The number leads and the instruction supports it, rather than a
          small label sitting above the big figure: that shape is an eyebrow,
          and it is the one thing this design system bans outright. */}
      <div className="bc-result">
        <div className="bc-score" aria-hidden="true">
          {band(overall)}
        </div>
        <div className="bc-meaning">
          <p className="bc-descriptor">{DESCRIPTOR[overall] ?? "—"}</p>
          <p className="bc-verdict" aria-live="polite">
            {hitsTarget
              ? `That is at or above band ${band(target)}.`
              : `${shortfall(gap)} short of ${band(target)}.`}
          </p>
        </div>
      </div>

      {/* The scale, drawn once, with the target marked. The one ornament the
          page allows itself is the gold rule, and a band scale IS a ruled
          line with marks, so the motif and the subject are the same shape. */}
      <div className="bc-scale" aria-hidden="true">
        <div className="bc-scale-line">
          <span
            className="bc-scale-fill"
            style={{ width: `${(overall / 9) * 100}%` }}
          />
          {/* The distance still to cover, drawn. A bare target tick left the
              visitor to measure the gap for themselves. */}
          {!hitsTarget && (
            <span
              className="bc-scale-gap"
              style={{
                left: `${(overall / 9) * 100}%`,
                width: `${((target - overall) / 9) * 100}%`,
              }}
            />
          )}
          <span
            className="bc-scale-target"
            style={{ left: `${(target / 9) * 100}%` }}
          />
          <span
            className="bc-scale-label"
            style={{ left: `${(target / 9) * 100}%` }}
          >
            target {band(target)}
          </span>
        </div>
        <div className="bc-scale-ticks">
          {[0, 3, 6, 9].map(n => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>

      <div className="bc-rows">
        {SKILLS.map(skill => (
          <div className="bc-row" key={skill.key}>
            <label className="bc-label" htmlFor={`${uid}-${skill.key}`}>
              <span className="bc-label-name">{skill.label}</span>
              <span className="bc-label-detail">{skill.detail}</span>
            </label>
            <input
              id={`${uid}-${skill.key}`}
              className="bc-range"
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={scores[skill.key]}
              onChange={e =>
                setScores(prev => ({
                  ...prev,
                  [skill.key]: Number(e.target.value),
                }))
              }
            />
            <output className="bc-value" htmlFor={`${uid}-${skill.key}`}>
              {band(scores[skill.key])}
            </output>
          </div>
        ))}
      </div>

      <p className="bc-note">
        Your overall band. Move each slider to the score you are getting now.
      </p>

      <p className="bc-rule">
        The average of the four, rounded to the nearest half band.
      </p>
    </div>
  );
}
