import { useState, useMemo, useEffect } from 'react';
import { Card, Pill, ScreenHeader } from '../components/UI';
import {
  sentenceId,
  allowedLevels,
  normalizeText,
  chooseNextWeighted,
  SENTENCES,
} from '../lib/store';

function shuffle(arr) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export default function Sentences({ state, recordAnswer }) {
  const [current, setCurrent] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [picked, setPicked] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const allowed = useMemo(() => {
    const lv = allowedLevels(state.level);
    return SENTENCES.filter((s) => lv.includes(s.level));
  }, [state.level]);

  useEffect(() => {
    if (!current && allowed.length) {
      const nx = chooseNextWeighted(allowed, sentenceId, state.sentence_progress);
      if (nx) {
        setCurrent(nx);
        setTiles(shuffle(nx.words.map((w, i) => ({ word: w, idx: i }))));
        setPicked([]);
        setFeedback(null);
      }
    }
  }, [current, allowed, state.sentence_progress]);

  if (!current) {
    return (
      <div className="screen">
        <div className="small">Loading…</div>
      </div>
    );
  }

  const used = new Set(picked);
  const locked = !!feedback;

  function submit() {
    const built = picked.map((i) => tiles[i].word).join(' ');
    const target = current.words.join(' ');
    const correct = normalizeText(built) === normalizeText(target);
    recordAnswer({
      mode: 'sentence',
      mapKey: 'sentence_progress',
      itemId: sentenceId(current),
      grade: correct ? 'correct' : 'wrong',
    });
    setFeedback({ correct, given: built, dontknow: false });
  }

  function dontKnow() {
    recordAnswer({
      mode: 'sentence',
      mapKey: 'sentence_progress',
      itemId: sentenceId(current),
      grade: 'wrong',
    });
    setFeedback({ correct: false, given: '', dontknow: true });
  }

  function reset() {
    setPicked([]);
    setFeedback(null);
  }

  function next() {
    setCurrent(null);
    setTiles([]);
    setPicked([]);
    setFeedback(null);
  }

  return (
    <div className="screen">
      <ScreenHeader kicker="Sentence Builder" title="Costruisci la frase" />

      <div className="row mb-md">
        <Pill kind="olive">{current.level}</Pill>
        <Pill kind="terracotta">{current.grammar_point}</Pill>
      </div>

      <Card paper style={{ marginBottom: 18 }}>
        <div className="caption">Translate to Italian</div>
        <div className="h2 italic mt-sm">"{current.english}"</div>
      </Card>

      <div className="section-label" style={{ marginTop: 0 }}>
        Your sentence
      </div>
      <div className={`build-area${picked.length === 0 ? ' empty' : ''}`}>
        {picked.length === 0 ? (
          <div className="build-area-empty-text">Tap words below to build the sentence.</div>
        ) : (
          picked.map((tIdx, pos) => (
            <div
              key={`${tIdx}-${pos}`}
              className="tile-placed"
              onClick={() => !locked && setPicked(picked.filter((_, i) => i !== pos))}
            >
              {tiles[tIdx].word}
              <span className="x">×</span>
            </div>
          ))
        )}
      </div>

      <div className="section-label">Word bank</div>
      <div className="tile-bank">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className={`tile${used.has(i) ? ' used' : ''}`}
            onClick={() => !locked && !used.has(i) && setPicked(picked.concat([i]))}
          >
            {tile.word}
          </div>
        ))}
      </div>

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'ok' : 'no'}`}>
          <h3 className="h3">
            {feedback.correct ? 'Bravo!' : feedback.dontknow ? "That's okay" : 'Not quite'}
          </h3>
          {!feedback.correct && (
            <div className="body mt-sm">
              Expected:{' '}
              <em>
                <strong>{current.italian}</strong>
              </em>
            </div>
          )}
          <div className="small mt-sm">{current.explanation}</div>
        </div>
      )}

      {!locked ? (
        <>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={reset}
              disabled={!picked.length}
            >
              Reset
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1.6 }}
              onClick={submit}
              disabled={picked.length !== tiles.length}
            >
              Submit
            </button>
          </div>
          <button className="mc-option dontknow mt-md" onClick={dontKnow}>
            I don't know
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={next}>
          Next sentence
        </button>
      )}
    </div>
  );
}
