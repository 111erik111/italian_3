import { useState, useMemo, useEffect } from 'react';
import { Card, Pill, ScreenHeader } from '../components/UI';
import {
  vocabId,
  chooseNextWeighted,
  allowedLevels,
  normalizeText,
  VOCABULARY,
} from '../lib/store';

function shuffle(arr) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

// Build a question for a vocab item: pick a direction and prepare distractors
// (used only if the learner falls back to multiple choice).
function buildQuestion(allowed, current, level) {
  let direction = 'it_to_en';
  if ((level === 'A2' || level === 'B1') && current.level === 'A1') {
    direction = Math.random() < 0.5 ? 'it_to_en' : 'en_to_it';
  }

  const promptWord = direction === 'it_to_en' ? current.italian : current.english;
  const correctAnswer = direction === 'it_to_en' ? current.english : current.italian;

  // Distractors: same part-of-speech where possible, else any.
  const pool = allowed.filter((v) => vocabId(v) !== vocabId(current));
  const samePos = pool.filter((v) => v.pos === current.pos);
  const distractorSource = samePos.length >= 3 ? samePos : pool;

  const distractors = [];
  const used = new Set([correctAnswer.toLowerCase()]);
  for (const v of shuffle(distractorSource)) {
    if (distractors.length >= 3) break;
    const text = direction === 'it_to_en' ? v.english : v.italian;
    if (!used.has(text.toLowerCase())) {
      distractors.push(text);
      used.add(text.toLowerCase());
    }
  }
  const options = shuffle([correctAnswer, ...distractors]);

  return { item: current, direction, promptWord, correctAnswer, options };
}

// Accept any of several legitimate translations.  Many vocab entries
// list multiple senses separated by "/", ",", or "or".  We also strip
// parenthetical clarifications like "(formal)" before comparing.
function isAcceptable(given, expected) {
  const g = normalizeText(given);
  if (!g) return false;
  const cleaned = expected.replace(/\s*\([^)]*\)\s*/g, ' ');
  const candidates = cleaned
    .split(/\s*\/\s*|\s*,\s*|\s+or\s+/i)
    .map((s) => normalizeText(s))
    .filter(Boolean);
  return candidates.includes(g);
}

export default function Flashcards({ state, recordAnswer }) {
  const [q, setQ] = useState(null);

  // Phase: 'typing' -> 'multiple' -> 'done'
  // 'typing'   : user types an answer (or clicks "I don't know")
  // 'multiple' : after I-don't-know, show MC fallback
  // 'done'     : feedback shown, recordAnswer already called
  const [phase, setPhase] = useState('typing');
  const [textAnswer, setTextAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  // 'dontknow' tracks whether the user used the fallback so we can grade
  // a correct MC pick as a "hard" instead of a clean "correct".
  const [dontKnowUsed, setDontKnowUsed] = useState(false);

  const allowed = useMemo(() => {
    const lv = allowedLevels(state.level);
    return VOCABULARY.filter((v) => lv.includes(v.level));
  }, [state.level]);

  useEffect(() => {
    if (!q && allowed.length) {
      const item = chooseNextWeighted(allowed, vocabId, state.vocab_progress);
      if (item) {
        setQ(buildQuestion(allowed, item, state.level));
        setPhase('typing');
        setTextAnswer('');
        setFeedback(null);
        setDontKnowUsed(false);
      }
    }
  }, [q, allowed, state.level, state.vocab_progress]);

  if (!q) {
    return (
      <div className="screen">
        <div className="small">Loading…</div>
      </div>
    );
  }

  const progress = state.vocab_progress[vocabId(q.item)];
  const promptLabel =
    q.direction === 'it_to_en' ? '🇮🇹 Italian → 🇬🇧 English' : '🇬🇧 English → 🇮🇹 Italian';

  function submitTyped() {
    if (isAcceptable(textAnswer, q.correctAnswer)) {
      // Correct on the typed pass.
      recordAnswer({
        mode: 'vocab',
        mapKey: 'vocab_progress',
        itemId: vocabId(q.item),
        grade: 'correct',
      });
      setFeedback({ kind: 'typed-correct', given: textAnswer });
      setPhase('done');
    } else {
      // Wrong typed answer -> reveal multiple choice as a second try.
      // Note: we DON'T record the answer yet; the MC step is the final grade.
      setFeedback({ kind: 'typed-wrong', given: textAnswer });
      setPhase('multiple');
    }
  }

  function chooseDontKnow() {
    setDontKnowUsed(true);
    setFeedback(null);
    setPhase('multiple');
  }

  function chooseMC(option) {
    const correct = option === q.correctAnswer;
    // If the user used "I don't know" and then picked the right answer,
    // grade as "hard" rather than "correct" so it resurfaces sooner.
    // After a wrong typed attempt, an MC pick is graded normally.
    let grade;
    if (option === '__dontknow__') {
      grade = 'wrong';
    } else if (correct) {
      grade = dontKnowUsed ? 'hard' : feedback?.kind === 'typed-wrong' ? 'hard' : 'correct';
    } else {
      grade = 'wrong';
    }
    recordAnswer({
      mode: 'vocab',
      mapKey: 'vocab_progress',
      itemId: vocabId(q.item),
      grade,
    });
    setFeedback({ kind: correct ? 'mc-correct' : 'mc-wrong', given: option });
    setPhase('done');
  }

  function next() {
    setQ(null);
  }

  return (
    <div className="screen">
      <ScreenHeader kicker="Vocabulary" title="Flashcards" />

      <div className="row mb-md">
        <Pill kind="olive">{q.item.level}</Pill>
        <Pill kind="muted">{q.item.pos}</Pill>
        {progress && progress.times_seen > 0 && (
          <Pill kind={progress.mastery_score > 0.7 ? 'olive' : 'terracotta'}>
            {Math.round(progress.mastery_score * 100)}% mastery
          </Pill>
        )}
      </div>

      <Card
        paper
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 160,
          flexDirection: 'column',
        }}
      >
        <div className="caption mb-sm">{promptLabel}</div>
        <div className="word-display">{q.promptWord}</div>
      </Card>

      {/* PHASE 1: Typing */}
      {phase === 'typing' && (
        <div className="mb-lg mt-md">
          <div className="section-label" style={{ marginTop: 0 }}>
            Type the translation
          </div>
          <input
            type="text"
            className="text-input"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textAnswer.trim()) submitTyped();
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder={
              q.direction === 'it_to_en'
                ? 'Type the English…'
                : 'Type the Italian…'
            }
          />
          <button
            className="btn btn-primary mt-md"
            onClick={submitTyped}
            disabled={!textAnswer.trim()}
          >
            Submit
          </button>
          <button className="mc-option dontknow mt-md" onClick={chooseDontKnow}>
            I don't know — show me the choices
          </button>
        </div>
      )}

      {/* PHASE 2: Multiple choice (after wrong typed answer or I-don't-know) */}
      {phase === 'multiple' && (
        <>
          {feedback?.kind === 'typed-wrong' && (
            <div className="feedback no">
              <h3 className="h3">Not quite</h3>
              <div className="body mt-sm">
                You wrote: <strong>{feedback.given}</strong>
              </div>
              <div className="small mt-sm">Pick the right answer below.</div>
            </div>
          )}
          <div className="section-label" style={{ marginTop: 0 }}>
            Choose the translation
          </div>
          {q.options.map((opt, i) => (
            <button key={i} className="mc-option" onClick={() => chooseMC(opt)}>
              {opt}
            </button>
          ))}
        </>
      )}

      {/* PHASE 3: Done */}
      {phase === 'done' && (
        <>
          <div
            className={`feedback ${
              feedback.kind === 'typed-correct' || feedback.kind === 'mc-correct'
                ? 'ok'
                : 'no'
            }`}
          >
            <h3 className="h3">
              {feedback.kind === 'typed-correct'
                ? '✅ Correct — first try'
                : feedback.kind === 'mc-correct'
                ? dontKnowUsed
                  ? "Right — let's keep working on it"
                  : '✅ Correct'
                : '❌ Not quite'}
            </h3>
            <div className="body mt-sm">
              Answer: <strong>{q.correctAnswer}</strong>
            </div>
            <div className="small mt-sm italic">{q.item.example_it}</div>
            <div className="small">{q.item.example_en}</div>
          </div>
          <button className="btn btn-primary" onClick={next}>
            Next word
          </button>
        </>
      )}
    </div>
  );
}
