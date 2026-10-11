import { useMemo } from "react";
import { isCorrect } from "../lib/grading.js";
import { ColumnChart, Donut, PercentBars } from "./charts.jsx";
import { N, shortGaade } from "./actions.js";

const STATUS = [
  { key: "completed", label: "Finished", color: "var(--c1)" },
  { key: "started", label: "In progress / left", color: "var(--c2)" },
  { key: "skipped", label: "Skipped to answers", color: "var(--c3)" },
];

const HOUR = 3600e3;

function timeline(people) {
  const times = people.map((p) => p.createdAt?.getTime()).filter(Boolean);
  if (!times.length) return { data: [], unit: "hour" };
  const min = Math.min(...times);
  const max = Math.max(...times);
  const byDay = max - min > 48 * HOUR;
  const floor = (t) => {
    const d = new Date(t);
    if (byDay) d.setHours(0, 0, 0, 0);
    else d.setMinutes(0, 0, 0);
    return d.getTime();
  };
  const step = (t) => {
    const d = new Date(t);
    if (byDay) d.setDate(d.getDate() + 1);
    else d.setHours(d.getHours() + 1);
    return d.getTime();
  };
  const counts = new Map();
  times.forEach((t) => counts.set(floor(t), (counts.get(floor(t)) || 0) + 1));
  const data = [];
  for (let t = floor(min); t <= floor(max); t = step(t)) {
    const d = new Date(t);
    const label = byDay
      ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
      : d.toLocaleTimeString(undefined, { hour: "numeric" });
    const full = byDay ? d.toLocaleDateString() : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric" });
    const v = counts.get(t) || 0;
    data.push({ key: t, label, value: v, tip: `${full}: ${v} joined` });
  }
  return { data, unit: byDay ? "day" : "hour" };
}

export default function Dashboard({ people, gaades }) {
  const s = useMemo(() => {
    const completed = people.filter((p) => p.status === "completed");
    const scores = completed.map((p) => p.score ?? 0).sort((a, b) => a - b);
    const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
    const median = scores.length ? scores[Math.floor((scores.length - 1) / 2)] : 0;
    const dist = Array.from({ length: N + 1 }, (_, k) => {
      const v = scores.filter((x) => x === k).length;
      return { key: k, label: String(k), value: v, tip: `Score ${k}: ${v} ${v === 1 ? "person" : "people"}` };
    });
    const perGaade = gaades.map((_, k) => {
      const right = completed.filter((p) => isCorrect(p.answers?.[k])).length;
      const tried = completed.filter((p) => p.answers?.[k]?.guess).length;
      const value = completed.length ? right / completed.length : 0;
      return {
        key: k,
        label: shortGaade(gaades, k),
        value,
        tip: `Gaade ${k + 1}: ${right} of ${completed.length} correct · ${completed.length - tried} left blank`,
      };
    });
    const leaders = [...completed]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.completedAt ?? 0) - (b.completedAt ?? 0))
      .slice(0, 10);
    const status = STATUS.map((st) => ({ ...st, value: people.filter((p) => p.status === st.key).length }));
    const hardest = [...perGaade].sort((a, b) => a.value - b.value)[0];
    return { completed, scores, avg, median, dist, perGaade, leaders, status, hardest, tl: timeline(people) };
  }, [people, gaades]);

  if (!people.length) return <div className="empty">No participants yet. Share the game link and they will appear here live.</div>;

  const top = s.scores.length ? s.scores[s.scores.length - 1] : 0;

  return (
    <div className="dash">
      <div className="tiles">
        <div className="tile">
          <div className="lbl">Participants</div>
          <div className="val">{people.length}</div>
        </div>
        <div className="tile">
          <div className="lbl">Finished the quiz</div>
          <div className="val">
            {s.completed.length} <small>({Math.round((s.completed.length / people.length) * 100)}%)</small>
          </div>
        </div>
        <div className="tile">
          <div className="lbl">Average score</div>
          <div className="val">
            {s.avg.toFixed(1)} <small>/ {N}</small>
          </div>
        </div>
        <div className="tile">
          <div className="lbl">Median · top score</div>
          <div className="val">
            {s.median} · {top} <small>/ {N}</small>
          </div>
        </div>
      </div>

      <section className="panel span4">
        <h3>Participation</h3>
        <p className="desc">Everyone who entered a name, by how far they got.</p>
        <Donut data={s.status} centerLabel="people" ariaLabel="Participants by status" />
      </section>

      <section className="panel span8">
        <h3>Score distribution</h3>
        <p className="desc">Number of finishers at each score (0–{N}).</p>
        {s.completed.length ? (
          <ColumnChart data={s.dist} color="var(--c2)" ariaLabel="Score distribution" />
        ) : (
          <div className="empty">No one has finished yet.</div>
        )}
      </section>

      <section className="panel span6">
        <h3>Correct answers per gaade</h3>
        <p className="desc">
          Share of finishers who got each gaade right.
          {s.completed.length > 0 && ` Hardest: gaade ${s.hardest.key + 1} (${Math.round(s.hardest.value * 100)}%).`}
        </p>
        {s.completed.length ? <PercentBars data={s.perGaade} ariaLabel="Percent correct per gaade" /> : <div className="empty">No data yet.</div>}
      </section>

      <section className="panel span6">
        <h3>Leaderboard</h3>
        <p className="desc">Top 10 finishers; ties go to whoever finished first.</p>
        {s.leaders.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num-c">#</th>
                  <th>Name</th>
                  <th className="num-c">Score</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {s.leaders.map((p, k) => (
                  <tr key={p.id}>
                    <td className="num-c">{k + 1}</td>
                    <td>{p.name}</td>
                    <td className="num-c">
                      <b>{p.score}</b> / {N}
                    </td>
                    <td className="muted">{p.completedAt?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No finishers yet.</div>
        )}
      </section>

      <section className="panel">
        <h3>Sign-ups over time</h3>
        <p className="desc">New participants per {s.tl.unit}.</p>
        <ColumnChart
          data={s.tl.data}
          color="var(--c1)"
          height={200}
          labelEvery={Math.max(1, Math.ceil(s.tl.data.length / 12))}
          ariaLabel="Sign-ups over time"
        />
      </section>
    </div>
  );
}
