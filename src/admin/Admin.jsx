import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { auth } from "../firebase.js";
import { DEFAULT_GAADES, N } from "../data/gaades.js";
import { ADMIN_EMAILS, isAdminEmail } from "../lib/admins.js";
import { watchGaades, watchGrading, watchImages, watchNames, watchParticipants } from "../lib/db.js";
import { nameKey } from "../lib/names.js";
import { DEFAULT_THRESHOLD, needsReview } from "../lib/grading.js";
import Dashboard from "./Dashboard.jsx";
import Participants from "./Participants.jsx";
import Review from "./Review.jsx";
import GaadesAdmin from "./GaadesAdmin.jsx";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function SignIn({ user, error, onError }) {
  const [busy, setBusy] = useState(false);
  const denied = user && !isAdminEmail(user.email);

  const signIn = async () => {
    setBusy(true);
    onError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === "auth/popup-blocked") await signInWithRedirect(auth, provider);
      else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pin-wrap adm">
      <div className="card pin-card">
        <h1 className="adm-title" style={{ marginBottom: ".8rem" }}>
          Admin
          <small>ದಸರಾ ಗಾದೆ ಗೊಂಬೆ ಆಟ</small>
        </h1>
        {denied ? (
          <>
            <p className="hint" style={{ marginTop: 0 }}>
              {user.email} is not allowed into the admin panel.
            </p>
            <p className="muted" style={{ fontSize: ".9rem" }}>
              Sign in with one of the organiser accounts instead.
            </p>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            Sign in with an organiser Google account.
          </p>
        )}
        {error && <p className="hint">{error}</p>}
        <div className="stack">
          {denied ? (
            <button className="btn" onClick={signIn} disabled={busy}>
              Use a different account
            </button>
          ) : (
            <button className="btn" onClick={signIn} disabled={busy}>
              {busy ? "Signing in…" : "Sign in with Google"}
            </button>
          )}
          <a className="btn ghost" href="/" style={{ textDecoration: "none" }}>
            Back to game
          </a>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  ["dashboard", "Dashboard"],
  ["participants", "Participants"],
  ["review", "Review answers"],
  ["gaades", "Gaades & photos"],
];

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [people, setPeople] = useState(null);
  const [grading, setGrading] = useState({});
  const [images, setImages] = useState({});
  const [gaades, setGaades] = useState({ list: DEFAULT_GAADES, seeded: N });
  const [names, setNames] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const allowed = !!user && isAdminEmail(user.email);

  useEffect(() => {
    if (!allowed) return;
    const onErr = (e) => setError(e.message || String(e));
    const unsubs = [
      watchParticipants(setPeople, onErr),
      watchGrading(setGrading, onErr),
      watchImages(setImages, onErr),
      watchGaades(setGaades, onErr),
      watchNames(setNames, onErr),
    ];
    return () => {
      unsubs.forEach((u) => u());
      setPeople(null);
      setError("");
    };
  }, [allowed]);

  const threshold = grading.threshold ?? DEFAULT_THRESHOLD;
  const hasGrading = grading.threshold != null;
  const unregistered = useMemo(() => {
    if (!people || !names) return 0;
    return new Set(people.map((p) => (p.name ? nameKey(p.name) : "")).filter((k) => k && !names.has(k))).size;
  }, [people, names]);
  const needsSeed = !!people && (gaades.seeded < N || !hasGrading || unregistered > 0);
  const reviewCount = useMemo(
    () => (people || []).reduce((n, p) => n + (p.answers || []).filter((a) => needsReview(a, threshold)).length, 0),
    [people, threshold]
  );

  if (user === undefined) return <div className="adm-loading">Checking sign-in…</div>;
  if (!allowed) return <SignIn user={user} error={authError} onError={setAuthError} />;

  return (
    <div className="adm">
      <div className="adm-band" />
      <header className="adm-head">
        <h1 className="adm-title">
          Golu Gaade — Admin
          <small>
            {user.email} · {people ? `${people.length} participants` : "loading…"}
          </small>
        </h1>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <a className="btn ghost sm" href="/" style={{ textDecoration: "none" }}>
            Open game
          </a>
          <button className="btn ghost sm" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="adm-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
            {id === "review" && reviewCount > 0 && <span className="pill">{reviewCount}</span>}
          </button>
        ))}
      </nav>
      <div className="adm-body">
        {error && (
          <div className="err">
            Firestore error: {error.replace(/\.+$/, "")}. If this says &quot;permissions&quot;, publish the latest firestore.rules
            (it must list {ADMIN_EMAILS.join(" and ")}).
          </div>
        )}
        {needsSeed && tab !== "gaades" && (
          <div className="note seed-note">
            <span>Some data still needs to be set up in Firestore (gaades, grading settings or the name list).</span>
            <button className="btn sm" onClick={() => setTab("gaades")}>
              Go to Seed
            </button>
          </div>
        )}
        {!people ? (
          <div className="empty">Loading…</div>
        ) : tab === "dashboard" ? (
          <Dashboard people={people} gaades={gaades.list} />
        ) : tab === "participants" ? (
          <Participants people={people} threshold={threshold} gaades={gaades.list} />
        ) : tab === "review" ? (
          <Review people={people} threshold={threshold} gaades={gaades.list} />
        ) : (
          <GaadesAdmin
            people={people}
            grading={grading}
            hasGrading={hasGrading}
            images={images}
            gaades={gaades.list}
            seeded={gaades.seeded}
            names={names}
            unregistered={unregistered}
          />
        )}
      </div>
    </div>
  );
}
