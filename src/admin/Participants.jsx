import { Fragment, useMemo, useState } from "react";
import { answeredOf, needsReview } from "../lib/grading.js";
import { deleteParticipant } from "../lib/db.js";
import { N, exportCsv, setOverride } from "./actions.js";

const STATUS_LABEL = { completed: "Finished", started: "In progress", skipped: "Skipped" };

export function OverrideToggle({ person, k }) {
  const [busy, setBusy] = useState(false);
  const a = person.answers?.[k];
  const cur = a?.override ?? null;
  const set = async (v) => {
    setBusy(true);
    try {
      await setOverride(person, k, v);
    } catch (e) {
      alert("Could not save: " + e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="ovr" role="group" aria-label={`Grade for gaade ${k + 1}`}>
      <button className="a" aria-pressed={cur === null} disabled={busy} onClick={() => set(null)} title="Use the automatic grade">
        Auto ({a?.auto ? "✓" : "✗"})
      </button>
      <button className="y" aria-pressed={cur === true} disabled={busy} onClick={() => set(true)}>
        ✓ Correct
      </button>
      <button className="n" aria-pressed={cur === false} disabled={busy} onClick={() => set(false)}>
        ✗ Wrong
      </button>
    </span>
  );
}

function AnswerTable({ person, threshold, gaades }) {
  if (!person.answers?.length) return <div className="empty">No answers — this person skipped straight to the answers.</div>;
  return (
    <div style={{ padding: ".6rem .8rem 1rem" }}>
      <table className="tbl ans-table">
        <thead>
          <tr>
            <th className="num-c">#</th>
            <th>Their guess</th>
            <th>Expected</th>
            <th className="num-c">Match</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {gaades.map(({ answer: ans, iast }, k) => {
            const a = person.answers[k] || {};
            return (
              <tr key={k}>
                <td className="num-c">{k + 1}</td>
                <td>
                  {a.guess ? <span className={/[ಀ-೿]/.test(a.guess) ? "kn-t" : ""}>{a.guess}</span> : <span className="muted">— blank —</span>}{" "}
                  {needsReview(a, threshold) && <span className="flag">review</span>}
                </td>
                <td>
                  <div className="gaade-kn">{ans}</div>
                  <div className="gaade-iast">{iast}</div>
                </td>
                <td className="num-c">{a.guess ? `${Math.round((a.sim || 0) * 100)}%` : ""}</td>
                <td>{a.guess ? <OverrideToggle person={person} k={k} /> : <span className="ok-n">✗</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const COLS = [
  ["name", "Name"],
  ["status", "Status"],
  ["score", "Score", true],
  ["answered", "Answered", true],
  ["review", "To review", true],
  ["createdAt", "Started"],
  ["completedAt", "Finished"],
];

export default function Participants({ people, threshold, gaades }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState({ key: "createdAt", dir: -1 });
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = people
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => !needle || (p.name || "").toLowerCase().includes(needle))
      .map((p) => ({
        ...p,
        answeredN: p.answered ?? answeredOf(p.answers),
        reviewN: (p.answers || []).filter((a) => needsReview(a, threshold)).length,
      }));
    const val = (p) =>
      sort.key === "answered" ? p.answeredN : sort.key === "review" ? p.reviewN : sort.key === "name" ? (p.name || "").toLowerCase() : p[sort.key];
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
  }, [people, q, status, sort, threshold]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "name" ? 1 : -1 }));

  const remove = async (p) => {
    if (!confirm(`Delete ${p.name}'s entry? This cannot be undone.`)) return;
    try {
      await deleteParticipant(p.id);
    } catch (e) {
      alert("Could not delete: " + e.message);
    }
  };

  const fmt = (d) => (d ? d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

  return (
    <div>
      <div className="toolbar">
        <input className="grow" type="search" placeholder="Search by name…" aria-label="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="completed">Finished</option>
          <option value="started">In progress</option>
          <option value="skipped">Skipped</option>
        </select>
        <button className="btn ghost sm" onClick={() => exportCsv(rows)} disabled={!rows.length}>
          Download CSV
        </button>
      </div>
      <p className="muted" style={{ margin: "0 0 .6rem", fontSize: ".9rem" }}>
        {rows.length} of {people.length} shown · click a row to see answers and correct the grading
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {COLS.map(([key, label, num]) => (
                <th key={key} className={num ? "num-c" : ""} aria-sort={sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
                  <button onClick={() => toggleSort(key)}>
                    {label}
                    {sort.key === key ? (sort.dir > 0 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1} className="empty">
                  No matching participants.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <Fragment key={p.id}>
                <tr
                  className={`row ${open === p.id ? "open" : ""}`}
                  onClick={() => setOpen(open === p.id ? null : p.id)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(open === p.id ? null : p.id))}
                  aria-expanded={open === p.id}
                >
                  <td>
                    <b>{p.name || "—"}</b>
                  </td>
                  <td>
                    <span className={`status ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
                  </td>
                  <td className="num-c">{p.status === "skipped" ? "—" : `${p.score ?? 0} / ${N}`}</td>
                  <td className="num-c">{p.answeredN}</td>
                  <td className="num-c">{p.reviewN ? <span className="flag">{p.reviewN}</span> : ""}</td>
                  <td className="muted">{fmt(p.createdAt)}</td>
                  <td className="muted">{fmt(p.completedAt)}</td>
                  <td>
                    <button
                      className="btn danger sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(p);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {open === p.id && (
                  <tr className="sub-row">
                    <td colSpan={COLS.length + 1}>
                      <AnswerTable person={p} threshold={threshold} gaades={gaades} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

