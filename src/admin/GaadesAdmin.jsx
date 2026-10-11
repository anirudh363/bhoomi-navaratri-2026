import { useEffect, useState } from "react";
import { N } from "../data/gaades.js";
import { DEFAULT_THRESHOLD, isCorrect } from "../lib/grading.js";
import { deleteImage, saveGaade, saveGrading, saveImage, seedDefaults } from "../lib/db.js";
import { compressImage } from "../lib/image.js";
import { regradeAll } from "./actions.js";

function SeedPanel({ seeded, hasGrading }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const complete = seeded === N && hasGrading;

  const seed = async () => {
    if (complete && !confirm("Reset all 16 gaades to the original text? Photos, accepted versions and the pass mark are kept.")) return;
    setBusy(true);
    setMsg("");
    try {
      await seedDefaults();
      setMsg("Done — the gaades and grading settings are now in Firestore.");
    } catch (e) {
      setMsg("Seeding failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={complete ? "panel" : "panel seed-needed"}>
      <h3>{complete ? "Firestore data" : "Set up Firestore data"}</h3>
      <p className="desc">
        {complete
          ? "All 16 gaades and the grading settings are stored in Firestore. Use reset only if you want the original gaade text back."
          : `Only ${seeded} of ${N} gaades${hasGrading ? "" : " and no grading settings"} are in Firestore yet. Click Seed to load the 16 gaades and default grading settings. Until then the game uses its built-in copy.`}
      </p>
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <button className={complete ? "btn ghost sm" : "btn"} onClick={seed} disabled={busy}>
          {busy ? "Seeding…" : complete ? "Reset gaades to original text" : "Seed Firestore"}
        </button>
        {msg && <span style={{ fontWeight: 700 }}>{msg}</span>}
      </div>
    </section>
  );
}

function GaadeCard({ k, gaade, image, alternates, onSaveAlternates, onSaveText, stat }) {
  const [busy, setBusy] = useState("");
  const [text, setText] = useState(alternates.join("\n"));
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(gaade.answer);
  const [iast, setIast] = useState(gaade.iast);

  useEffect(() => {
    if (!dirty) setText(alternates.join("\n"));
  }, [alternates, dirty]);

  useEffect(() => {
    if (!editing) {
      setAnswer(gaade.answer);
      setIast(gaade.iast);
    }
  }, [gaade, editing]);

  const run = async (label, fn) => {
    setBusy(label);
    try {
      await fn();
      return true;
    } catch (err) {
      alert(`Gaade ${k + 1}: ${err.message}`);
      return false;
    } finally {
      setBusy("");
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await run("Uploading…", async () => saveImage(k, await compressImage(file)));
  };

  const remove = async () => {
    if (confirm(`Remove the photo for gaade ${k + 1}?`)) await run("Removing…", () => deleteImage(k));
  };

  const saveAlts = async () => {
    const list = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (await run("Saving…", () => onSaveAlternates(k, list))) setDirty(false);
  };

  const saveText = async () => {
    if (!answer.trim()) return alert("The gaade text cannot be empty.");
    if (await run("Saving…", () => onSaveText(k, { answer: answer.trim(), iast: iast.trim() }))) setEditing(false);
  };

  return (
    <div className="gcard">
      <div className="ph">
        <span className="gnum">{k + 1}</span>
        {image ? <img src={image} alt={`Doll setup for gaade ${k + 1}`} /> : "🪆"}
      </div>
      <div className="body">
        {editing ? (
          <>
            <label className="fld">
              Gaade (Kannada)
              <textarea className="gaade-kn" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </label>
            <label className="fld">
              Transliteration
              <textarea className="gaade-iast" value={iast} onChange={(e) => setIast(e.target.value)} />
            </label>
            <div className="acts">
              <button className="btn sm" onClick={saveText} disabled={!!busy}>
                Save &amp; regrade
              </button>
              <button className="btn ghost sm" onClick={() => setEditing(false)} disabled={!!busy}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="gaade-kn">{gaade.answer}</div>
            <div className="gaade-iast">{gaade.iast}</div>
          </>
        )}
        <div className="stat">{stat}</div>
        <div className="acts">
          <label className="btn sm upl">
            {image ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/*" onChange={upload} disabled={!!busy} />
          </label>
          {image && (
            <button className="btn danger sm" onClick={remove} disabled={!!busy}>
              Remove
            </button>
          )}
          {!editing && (
            <button className="btn ghost sm" onClick={() => setEditing(true)} disabled={!!busy}>
              Edit text
            </button>
          )}
          {busy && <span className="muted">{busy}</span>}
        </div>
        <label className="fld">
          Also accept (one per line, Kannada or English letters)
          <textarea
            value={text}
            placeholder="e.g. another common version of this gaade"
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        {dirty && (
          <div className="acts">
            <button className="btn sm" onClick={saveAlts} disabled={!!busy}>
              Save &amp; regrade
            </button>
            <button
              className="btn ghost sm"
              onClick={() => {
                setText(alternates.join("\n"));
                setDirty(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GaadesAdmin({ people, grading, hasGrading, images, gaades, seeded }) {
  const saved = grading.threshold ?? DEFAULT_THRESHOLD;
  const [threshold, setThreshold] = useState(saved);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setThreshold(saved), [saved]);

  const regrade = async (config, list) => {
    const n = await regradeAll(people, config, list);
    setMsg(`Saved. Regraded ${n} participant${n === 1 ? "" : "s"} (manual grades kept).`);
  };

  const apply = async (patch) => {
    setBusy(true);
    setMsg("");
    try {
      await saveGrading(patch);
      await regrade({ ...grading, ...patch }, gaades);
    } catch (e) {
      setMsg("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAlternates = (k, list) => apply({ alternates: { ...(grading.alternates || {}), [k]: list } });

  const saveText = async (k, g) => {
    await saveGaade(k, g);
    await regrade(grading, gaades.map((x, j) => (j === k ? g : x)));
  };

  const completed = people.filter((p) => p.status === "completed");
  const photoCount = Object.keys(images).length;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SeedPanel seeded={seeded} hasGrading={hasGrading} />

      <section className="panel">
        <h3>Grading</h3>
        <p className="desc">
          A guess counts as correct when it matches the gaade (or one of its accepted versions) at least this closely. Lower =
          more forgiving. Changing it regrades everyone; answers you graded by hand stay as you set them.
        </p>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: ".6rem", fontWeight: 700 }}>
            Pass mark
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: 180, padding: 0, border: 0 }}
            />
            <b style={{ minWidth: "3ch" }}>{Math.round(threshold * 100)}%</b>
          </label>
          <button className="btn sm" disabled={busy || threshold === saved} onClick={() => apply({ threshold })}>
            Save &amp; regrade
          </button>
          <button className="btn ghost sm" disabled={busy} onClick={() => apply({})}>
            Regrade everyone now
          </button>
          {busy && <span className="muted">Working…</span>}
          {msg && <span style={{ fontWeight: 700 }}>{msg}</span>}
        </div>
      </section>

      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
        {photoCount} of {N} gaades have a photo. Photos appear on the players&apos; answers page. They are resized in your
        browser before upload, so large phone photos are fine.
      </p>

      <div className="gadmin">
        {gaades.map((gaade, k) => {
          const right = completed.filter((p) => isCorrect(p.answers?.[k])).length;
          return (
            <GaadeCard
              key={k}
              k={k}
              gaade={gaade}
              image={images[k]}
              alternates={grading.alternates?.[k] || []}
              onSaveAlternates={saveAlternates}
              onSaveText={saveText}
              stat={completed.length ? `${right} of ${completed.length} finishers got this right` : "No finishers yet"}
            />
          );
        })}
      </div>
    </div>
  );
}
