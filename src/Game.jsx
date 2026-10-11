import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import hero from "./assets/golu-hero.jpg";
import goddess from "./assets/goddess-nandi.jpg";
import { DEFAULT_GAADES, N } from "./data/gaades.js";
import { answeredOf, gradeAll, isCorrect, scoreOf } from "./lib/grading.js";
import { createParticipant, fetchGaades, fetchGrading, fetchImages, updateParticipant } from "./lib/db.js";
import { Diyas, Frame, Rangoli } from "./components/Decor.jsx";

const emptyGuesses = () => Array(N).fill("");

export default function Game() {
  const [page, setPage] = useState("home");
  const [uname, setUname] = useState("");
  const [nameHint, setNameHint] = useState(false);
  const [i, setI] = useState(0);
  const [guesses, setGuesses] = useState(emptyGuesses);
  const [graded, setGraded] = useState(null);
  const [grading, setGrading] = useState({});
  const [images, setImages] = useState({});
  const [gaades, setGaades] = useState(DEFAULT_GAADES);
  const [saveFailed, setSaveFailed] = useState(false);
  // Promise of the participant's Firestore doc id, so saves made before it resolves still land.
  const docId = useRef(null);
  const topRef = useRef(null);
  const ansRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    fetchGrading().then(setGrading).catch((e) => console.warn("grading config", e));
    fetchGaades().then((g) => setGaades(g.list)).catch((e) => console.warn("gaades", e));
    fetchImages().then(setImages).catch((e) => console.warn("images", e));
  }, []);

  // Shrink the home heading until it fits on one line.
  const fit = useCallback(() => {
    const t = topRef.current;
    if (!t) return;
    t.style.fontSize = "";
    let f = parseFloat(getComputedStyle(t).fontSize);
    while (t.scrollWidth > t.clientWidth && f > 12) {
      f -= 1;
      t.style.fontSize = f + "px";
    }
  }, []);

  useLayoutEffect(() => {
    if (page !== "home") return;
    fit();
    addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => removeEventListener("resize", fit);
  }, [page, fit]);

  useEffect(() => {
    if (page === "quiz" && innerWidth > 700) ansRef.current?.focus();
  }, [page, i]);

  const show = (p) => {
    setPage(p);
    scrollTo(0, 0);
  };

  const fail = (e) => {
    console.error("Firestore save failed", e);
    setSaveFailed(true);
  };

  const register = (name, data) => {
    setSaveFailed(false);
    docId.current = createParticipant({ name, total: N, ...data });
    docId.current.catch(fail);
  };

  const persist = (data) => {
    const pending = docId.current;
    if (!pending) return;
    pending.then((id) => updateParticipant(id, data)).catch(fail);
  };

  const begin = () => {
    const name = uname.trim();
    if (!name) {
      setNameHint(true);
      nameRef.current?.focus();
      return;
    }
    const fresh = emptyGuesses();
    setGuesses(fresh);
    setGraded(null);
    setI(0);
    register(name, { status: "started", answers: gradeAll(fresh, grading, [], gaades), score: 0, answered: 0 });
    show("quiz");
  };

  const skip = () => {
    const name = uname.trim();
    if (!name) {
      setNameHint(true);
      nameRef.current?.focus();
      return;
    }
    setGraded(null);
    setGuesses(emptyGuesses());
    register(name, { status: "skipped", answers: [], score: null, answered: 0 });
    show("result");
  };

  const saveProgress = (status) => {
    const answers = gradeAll(guesses.map((g) => g.trim()), grading, [], gaades);
    persist({ status, answers, score: scoreOf(answers), answered: answeredOf(answers) });
    return answers;
  };

  const next = () => {
    if (i < N - 1) {
      saveProgress("started");
      setI(i + 1);
    } else {
      setGraded(saveProgress("completed"));
      show("result");
    }
  };

  const back = () => {
    if (i > 0) setI(i - 1);
  };

  const again = () => {
    docId.current = null;
    setGuesses(emptyGuesses());
    setGraded(null);
    setUname("");
    setNameHint(false);
    setSaveFailed(false);
    show("home");
  };

  const setGuess = (v) => setGuesses((g) => g.map((x, k) => (k === i ? v : x)));
  const shownName = uname.trim();

  return (
    <>
      <Frame />
      <main>
        {page === "home" && (
          <section className="page" id="home">
            <div className="shri">।। श्रीः।।</div>
            <img className="hero" alt="Bommai Golu doll stand with gods and dolls" src={hero} />
            <h1 className="top" ref={topRef}>
              ದಸರಾ ಹಬ್ಬದ ಶುಭಾಶಯಗಳು
            </h1>
            <div className="second">Happy Dasara 2026</div>
            <Rangoli />
            <p className="sub">
              ಗೊಂಬೆಗಳನ್ನು ನೋಡಿ, 16 ಗಾದೆಗಳನ್ನು ಊಹಿಸಿ!
              <br />
              <span className="sub-en">Look at the dolls and guess the 16 gaades.</span>
            </p>
            <button className="btn big" onClick={() => show("name")}>
              ಊಹಿಸಲು ಪ್ರಾರಂಭಿಸಿ · Start guessing
            </button>
          </section>
        )}

        {page === "name" && (
          <section className="page" id="name">
            <img className="goddess" alt="Goddess seated on Nandi" src={goddess} />
            <h2 className="kn nm">ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ</h2>
            <div className="second">Enter your name</div>
            <Rangoli />
            <div className="card">
              <input
                ref={nameRef}
                type="text"
                maxLength={30}
                autoComplete="off"
                placeholder="ನಿಮ್ಮ ಹೆಸರು · Your name"
                aria-label="Your name"
                aria-invalid={nameHint}
                value={uname}
                onChange={(e) => {
                  setUname(e.target.value);
                  setNameHint(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && begin()}
              />
              {nameHint && <p className="hint">ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ · Please enter your name first</p>}
              <div className="stack">
                <button className="btn big" onClick={begin}>
                  ಊಹಿಸಲು ಪ್ರಾರಂಭಿಸಿ · Start guessing
                </button>
                <button className="btn ghost" onClick={skip}>
                  ಉತ್ತರಗಳನ್ನು ನೋಡಿ · Skip to answers
                </button>
              </div>
            </div>
            <Diyas />
          </section>
        )}

        {page === "quiz" && (
          <section className="page" id="quiz">
            <div className="card">
              <div className="medal">{i + 1}</div>
              <div className="prompt">ಗೊಂಬೆಗಳನ್ನು ನೋಡಿ ಗಾದೆಗಳನ್ನು ಊಹಿಸಿ</div>
              <input
                ref={ansRef}
                type="text"
                autoComplete="off"
                placeholder="ನಿಮ್ಮ ಉತ್ತರ ಬರೆಯಿರಿ · Type your answer"
                aria-label={`Your answer for gaade ${i + 1}`}
                value={guesses[i]}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
              <div className="nav">
                <button className="btn ghost" onClick={back} disabled={i === 0}>
                  ಹಿಂದೆ · Back
                </button>
                <button className="btn" onClick={next}>
                  {i === N - 1 ? "ಮುಗಿಸಿ · Finish" : "ಮುಂದೆ · Next"}
                </button>
              </div>
            </div>
            <div className="prog" aria-hidden="true">
              {guesses.map((_, k) => (
                <i key={k} className={k === i ? "c" : k < i ? "d" : ""} />
              ))}
            </div>
            <div className="cnt">
              ಗಾದೆ {i + 1} / {N}
            </div>
          </section>
        )}

        {page === "result" && (
          <section className="page" id="result">
            <h2 className="kn">ಗಾದೆಗಳ ಉತ್ತರಗಳು</h2>
            {shownName && <div className="sub2">ಧನ್ಯವಾದಗಳು, {shownName}! 🙏</div>}
            <div className="en result-en">The answers</div>
            {graded && (
              <div className="scorebox" role="status">
                <span className="scorebox-num">
                  {scoreOf(graded)}
                  <small> / {N}</small>
                </span>
                <span className="scorebox-label">
                  ಸರಿಯಾದ ಉತ್ತರಗಳು
                  <br />
                  correct answers
                </span>
              </div>
            )}
            {saveFailed && (
              <p className="hint">ಉತ್ತರಗಳನ್ನು ಉಳಿಸಲು ಆಗಲಿಲ್ಲ · Your answers could not be saved — please check the connection.</p>
            )}
            <div className="grid">
              {gaades.map(({ answer, iast }, k) => {
                const mine = graded?.[k];
                const ok = mine?.guess ? isCorrect(mine) : null;
                return (
                  <div className="g" key={k}>
                    <div className="num">{k + 1}</div>
                    {ok !== null && (
                      <div className={`mark ${ok ? "yes" : "no"}`} aria-label={ok ? "Correct" : "Wrong"}>
                        {ok ? "✓" : "✗"}
                      </div>
                    )}
                    <div className="ph">
                      {images[k] ? <img src={images[k]} alt={`Doll setup ${k + 1}`} loading="lazy" /> : "🪆"}
                    </div>
                    <div className="ans">{answer}</div>
                    <div className="iast">{iast}</div>
                    {mine?.guess && <div className="you">ನಿಮ್ಮ ಉತ್ತರ: {mine.guess}</div>}
                  </div>
                );
              })}
            </div>
            <button className="btn big" onClick={again}>
              ಮತ್ತೆ ಆಡಿ · Play again
            </button>
          </section>
        )}
      </main>
    </>
  );
}
