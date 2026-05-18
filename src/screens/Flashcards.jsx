import { useState, useMemo, useEffect } from 'react';
import { Card, Pill, ScreenHeader } from '../components/UI';
import {
  vocabId,
  chooseNextWeighted,
  allowedLevels,
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

// Build a question: show one side, pick the right translation from 4 options.
function buildQuestion(allowed, current, level) {
  // Direction: A1 always it->en. A2/B1 randomly flips A1 words.
  let direction = 'it_to_en';
  if ((level === 'A2' || level === 'B1') && current.level === 'A1') {
    direction = Math.random() < 0.5 ? 'it_to_en' : 'en_to_it';
  }

  const promptWord = direction === 'it_to_en' ? current.italian : current.english;
  const correctAnswer = direction === 'it_to_en' ? current.english : current.italian;

  // Distractors: same part-of-speech where possible, else any.
  const pool = allowed.filter(
    (v) => vocabId(v) !== vocabId(current)
  );
  const samePos = pool.filter((v) => v.pos === current.pos);
  const distractorSource = samePos.length >= 3 ? samePos : pool;

  const distractors = [];
  const usedTexts = new Set([correctAnswer.toLowerCase()]);
  const shuffledSource = shuffle(distractorSource);
  for (const v of shuffledSource) {
    if (distractors.length >= 3) break;
    const text = direction === 'it_to_en' ? v.english : v.italian;
    if (!usedTexts.has(text.toLowerCase())) {
      distractors.push(text);
      usedTexts.add(text.toLowerCase());
    }
  }

  const options = shuffle([correctAnswer, ...distractors]);

  return {
    item: current,
    direction,
    promptWord,
    correctAnswer,
    options,
  };
}

export default function Flashcards({ state, recordAnswer }) {
  const [q, setQ] = useState(null);
  const [chosen, setChosen] = useState(null); // selected option string OR '__dontknow__'

  const allowed = useMemo(() => {
    const lv = allowedLevels(state.level);
    return VOCABULARY.filter((v) => lv.includes(v.level));
  }, [state.level]);

  useEffect(() => {
    if (!q && allowed.length) {
      const item = chooseNextWeighted(allowed, vocabId, state.vocab_progress);
      if (item) {
        setQ(buildQuestion(allowed, item, state.level));
        setChosen(null);
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
  const locked = chosen !== null;

  function choose(option) {
    if (locked) return;
    let grade;
    if (option === '__dontknow__') {
      grade = 'wrong';
    } else {
      grade = option === q.correctAnswer ? 'correct' : 'wrong';
    }
    setChosen(option);
    recordAnswer({
      mode: 'vocab',
      mapKey: 'vocab_progress',
      itemId: vocabId(q.item),
      grade,
    });
  }

  function next() {
    setQ(null);
    setChosen(null);
  }

  const wasCorrect = chosen !== null && chosen !== '__dontknow__' && chosen === q.correctAnswer;

  const promptLabel =
    q.direction === 'it_to_en' ? '🇮🇹 Italian → 🇬🇧 English' : '🇬🇧 English → 🇮🇹 Italian';

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

      <div className="section-label">Choose the translation</div>

      {q.options.map((opt, i) => {
        let cls = 'mc-option';
        if (locked) {
          if (opt === q.correctAnswer) cls += ' correct';
          else if (opt === chosen) cls += ' wrong';
        }
        return (
          <button key={i} className={cls} onClick={() => choose(opt)} disabled={locked}>
            {opt}
          </button>
        );
      })}

      <button
        className={`mc-option dontknow${
          locked && chosen === '__dontknow__' ? ' wrong' : ''
        }`}
        onClick={() => choose('__dontknow__')}
        disabled={locked}
      >
        I don't know
      </button>

      {locked && (
        <>
          <div className={`feedback ${wasCorrect ? 'ok' : 'no'}`}>
            <h3 className="h3">
              {wasCorrect ? '✅ Correct' : chosen === '__dontknow__' ? "That's okay" : '❌ Not quite'}
            </h3>
            {!wasCorrect && (
              <div className="body mt-sm">
                Answer: <strong>{q.correctAnswer}</strong>
              </div>
            )}
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
