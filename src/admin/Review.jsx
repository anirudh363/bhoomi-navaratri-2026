import { useMemo, useState } from "react";
import { isCorrect, needsReview } from "../lib/grading.js";
import { OverrideToggle } from "./Participants.jsx";

const FILTERS = {
  review: { label: "Close calls (needs review)", test: (a, th) => needsReview(a, th) },
  wrong: { label: "All answers marked wrong", test: (a) => a?.guess && !isCorrect(a) },
  right: { label: "All answers marked correct", test: (a) => a?.guess && isCorrect(a) },
  overridden: { label: "Manually graded", test: (a) => a?.guess && a.override != null },
};

export default function Review({ people, threshold, gaades }) {
  const [filter, setFilter] = useState("review");
  const [gaade, setGaade] = useState("all");

  const items = useMemo(() => {
    const out = [];
    for (const p of people) {
      (p.answers || []).forEach((a, k) => {
        if ((gaade === "all" || Number(gaade) === k) && FILTERS[filter].test(a, threshold)) out.push({ p, a, k });
      });
    }
    return out.sort((x, y) => x.k - y.k || (y.a.sim || 0) - (x.a.sim || 0));
  }, [people, filter, gaade, threshold]);

  return (
    <div>
      <div className="note">
        Answers are graded automatically by how closely they match the gaade (spelling slips, Kanglish and missing punctuation are
        tolerated). A wrong answer that scored within 20 points of the pass mark ({Math.round(threshold * 100)}%) is a{" "}
        <b>close call</b> — decide those here. Your choice updates the person&apos;s score straight away.
      </div>
      <div className="toolbar">
        <select aria-label="Which answers" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {Object.entries(FILTERS).map(([k, f]) => (
            <option key={k} value={k}>
              {f.label}
            </option>
          ))}
        </select>
        <select aria-label="Gaade" value={gaade} onChange={(e) => setGaade(e.target.value)}>
          <option value="all">All gaades</option>
          {gaades.map((_, k) => (
            <option key={k} value={k}>
              Gaade {k + 1}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontWeight: 700 }}>
          {items.length} {items.length === 1 ? "answer" : "answers"}
        </span>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        {items.length === 0 ? (
          <div className="empty">{filter === "review" ? "Nothing to review right now. 🎉" : "No answers here."}</div>
        ) : (
          items.map(({ p, a, k }) => (
            <div className="review-item" key={`${p.id}-${k}`}>
              <div>
                <div className="who">
                  {p.name} · gaade {k + 1} · {Math.round((a.sim || 0) * 100)}% match
                </div>
                <div className={`guess ${/[ಀ-೿]/.test(a.guess) ? "kn-t" : ""}`}>{a.guess}</div>
                <div className="target">
                  <span className="gaade-kn">{gaades[k].answer}</span> · <span className="gaade-iast">{gaades[k].iast}</span>
                </div>
              </div>
              <OverrideToggle person={p} k={k} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
