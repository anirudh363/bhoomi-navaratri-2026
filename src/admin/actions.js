import { N } from "../data/gaades.js";
import { answeredOf, gradeAll, isCorrect, scoreOf } from "../lib/grading.js";
import { updateParticipant, updateParticipantsBulk } from "../lib/db.js";

/** value: true (correct), false (wrong) or null (use the automatic grade). */
export function setOverride(person, k, value) {
  const answers = (person.answers || []).map((a, j) => (j === k ? { ...a, override: value } : a));
  return updateParticipant(person.id, { answers, score: scoreOf(answers) });
}

/** Re-run auto-grading for everyone (keeps admin overrides). Returns how many docs changed. */
export async function regradeAll(people, config, gaades) {
  const updates = [];
  for (const p of people) {
    if (!p.answers?.length) continue;
    const answers = gradeAll(p.answers.map((a) => a?.guess || ""), config, p.answers, gaades);
    const changed = answers.some((a, k) => a.auto !== p.answers[k]?.auto || a.sim !== p.answers[k]?.sim);
    const score = p.status === "skipped" ? null : scoreOf(answers);
    if (changed || score !== p.score) updates.push({ id: p.id, data: { answers, score, answered: answeredOf(answers) } });
  }
  await updateParticipantsBulk(updates);
  return updates.length;
}

const fmtDate = (d) => (d ? d.toLocaleString() : "");

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(people) {
  const head = ["Name", "Status", "Score", "Answered", "Started", "Finished"];
  for (let k = 1; k <= N; k++) head.push(`Gaade ${k} guess`, `Gaade ${k} correct`);
  const rows = people.map((p) => {
    const r = [p.name, p.status, p.score ?? "", p.answered ?? answeredOf(p.answers), fmtDate(p.createdAt), fmtDate(p.completedAt)];
    for (let k = 0; k < N; k++) {
      const a = p.answers?.[k];
      r.push(a?.guess || "", a?.guess ? (isCorrect(a) ? "yes" : "no") : "");
    }
    return r;
  });
  const csv = "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `golu-gaade-participants-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const shortGaade = (gaades, k) => {
  const words = gaades[k].answer.replace(/[.?!]/g, "").trim().split(/\s+/);
  return `${k + 1}. ${words.slice(0, 2).join(" ")}${words.length > 2 ? "…" : ""}`;
};

export { N };
