import { useState, useMemo, useEffect } from 'react';
import { Card, Pill, ScreenHeader } from '../components/UI';
import {
  verbId,
  PRONOUNS,
  TENSE_LABEL,
  ENGLISH_PRONOUN,
  allowedLevels,
  normalizeText,
  VERBS,
} from '../lib/store';

const MODES = ['multiple_choice', 'fill_blank', 'translate', 'match_pronoun'];

function buildVerbQuestion(allowedVerbs, tensePool) {
  const candidates = allowedVerbs.filter((v) => tensePool.some((t) => v[t]));
  if (!candidates.length) return null;
  const verb = candidates[Math.floor(Math.random() * candidates.length)];
  const validTenses = tensePool.filter((t) => verb[t]);
  const tense = validTenses[Math.floor(Math.random() * validTenses.length)];
  const pronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
  const correct = verb[tense][pronoun];
  const mode = MODES[Math.floor(Math.random() * MODES.length)];
  const q = { verb, tense, pronoun, correct, mode };

  if (mode === 'multiple_choice') {
    const sameVerbForms = [];
    for (const t of ['presente', 'passato_prossimo', 'futuro']) {
      if (!verb[t]) continue;
      for (const p of PRONOUNS) {
        if (verb[t][p] !== correct) sameVerbForms.push(verb[t][p]);
      }
    }
    const distractors = [];
    const shuffled = sameVerbForms.slice().sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(d) && d !== correct) distractors.push(d);
    }
    while (distractors.length < 3) {
      const other = candidates[Math.floor(Math.random() * candidates.length)];
      if (other[tense]) {
        const of = other[tense][pronoun];
        if (of && of !== correct && !distractors.includes(of)) distractors.push(of);
      } else break;
    }
    q.options = distractors.concat([correct]).sort(() => Math.random() - 0.5);
    q.prompt = `${ENGLISH_PRONOUN[pronoun]} — ${verb.english.replace('to ', '')} (${TENSE_LABEL[tense]})`;
  } else if (mode === 'fill_blank') {
    q.prompt = `Conjugate "${verb.infinitive}" — ${TENSE_LABEL[tense]} — ${pronoun}`;
  } else if (mode === 'translate') {
    let hint;
    if (tense === 'presente') hint = `${ENGLISH_PRONOUN[pronoun]} ${verb.english.replace('to ', '')}`;
    else if (tense === 'passato_prossimo')
      hint = `${ENGLISH_PRONOUN[pronoun]} ${verb.english.replace('to ', '')} (past)`;
    else hint = `${ENGLISH_PRONOUN[pronoun]} will ${verb.english.replace('to ', '')}`;
    q.prompt = `Translate: "${hint}"`;
  } else {
    q.prompt = `Which pronoun matches "${correct}"? (${verb.infinitive}, ${TENSE_LABEL[tense]})`;
    q.options = PRONOUNS.slice();
  }
  return q;
}

export default function Verbs({ state, recordAnswer }) {
  const [q, setQ] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');

  const allowedVerbs = useMemo(() => {
    const lv = allowedLevels(state.level);
    return VERBS.filter((v) => lv.includes(v.level));
  }, [state.level]);

  const tensePool = useMemo(() => {
    const pool = ['presente'];
    const lv = allowedLevels(state.level);
    if (lv.includes('A2')) pool.push('passato_prossimo');
    if (lv.includes('B1')) pool.push('futuro');
    return pool;
  }, [state.level]);

  useEffect(() => {
    if (!q && allowedVerbs.length) {
      setQ(buildVerbQuestion(allowedVerbs, tensePool));
      setFeedback(null);
      setTextAnswer('');
    }
  }, [q, allowedVerbs, tensePool]);

  if (!q) {
    return (
      <div className="screen">
        <div className="small">Loading…</div>
      </div>
    );
  }

  const locked = !!feedback;
  const isText = q.mode === 'fill_blank' || q.mode === 'translate';

  function grade(rawAnswer) {
    let correct;
    if (rawAnswer === '__dontknow__') {
      correct = false;
    } else if (q.mode === 'match_pronoun') {
      correct = rawAnswer === q.pronoun;
    } else {
      // Accept the conjugated form with or without the leading subject
      // pronoun. Our data stores e.g. "ho mangiato", and the prompt names
      // the pronoun separately, so a user typing "io ho mangiato",
      // "ho mangiato", or "Io ho mangiato" should all be accepted.
      const given = normalizeText(rawAnswer);
      const target = normalizeText(q.correct);
      const withPronoun = normalizeText(`${q.pronoun} ${q.correct}`);
      correct = given === target || given === withPronoun;
    }
    recordAnswer({
      mode: 'verb',
      mapKey: 'verb_progress',
      itemId: verbId(q.verb, q.tense, q.pronoun),
      grade: correct ? 'correct' : 'wrong',
      extra: { infinitive: q.verb.infinitive },
    });
    setFeedback({
      correct,
      given: rawAnswer === '__dontknow__' ? null : rawAnswer,
      expected: q.correct,
      dontknow: rawAnswer === '__dontknow__',
      explanation:
        q.verb.regularity === 'regular'
          ? `${q.verb.infinitive} is a regular ${q.verb.group} verb.`
          : `${q.verb.infinitive} is irregular — memorize this form.`,
    });
  }

  function next() {
    setQ(null);
    setFeedback(null);
    setTextAnswer('');
  }

  return (
    <div className="screen">
      <ScreenHeader kicker="Verbs" title="Conjugation Trainer" />

      <div className="row mb-md">
        <Pill kind="olive">{q.verb.level}</Pill>
        <Pill kind="terracotta">{TENSE_LABEL[q.tense]}</Pill>
        <Pill kind="muted">{q.mode.replace('_', ' ')}</Pill>
      </div>

      <Card paper style={{ marginBottom: 18 }}>
        <div className="caption">Prompt</div>
        <div className="h2 mt-sm">{q.prompt}</div>
      </Card>

      {isText ? (
        <div className="mb-lg">
          <div className="section-label" style={{ marginTop: 0 }}>
            Your answer
          </div>
          <div className="small mb-sm" style={{ color: 'var(--ink-muted)' }}>
            Subject pronoun "{q.pronoun}" is optional — include it or not, both count.
          </div>
          <input
            type="text"
            className="text-input"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={locked}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Type the Italian form…"
          />
          {!locked && (
            <>
              <button
                className="btn btn-primary mt-md"
                onClick={() => grade(textAnswer)}
                disabled={!textAnswer.trim()}
              >
                Submit
              </button>
              <button
                className="mc-option dontknow mt-md"
                onClick={() => grade('__dontknow__')}
              >
                I don't know
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mb-lg">
          <div className="section-label" style={{ marginTop: 0 }}>
            Choose
          </div>
          {q.options.map((opt, i) => {
            const isCorrect =
              locked && (q.mode === 'match_pronoun' ? opt === q.pronoun : opt === q.correct);
            const isGivenWrong = locked && feedback.given === opt && !feedback.correct;
            let cls = 'mc-option';
            if (isCorrect) cls += ' correct';
            else if (isGivenWrong) cls += ' wrong';
            return (
              <button
                key={i}
                className={cls}
                onClick={() => !locked && grade(opt)}
                disabled={locked}
              >
                {opt}
              </button>
            );
          })}
          {!locked && (
            <button className="mc-option dontknow" onClick={() => grade('__dontknow__')}>
              I don't know
            </button>
          )}
        </div>
      )}

      {feedback && (
        <>
          <div className={`feedback ${feedback.correct ? 'ok' : 'no'}`}>
            <h3 className="h3">
              {feedback.correct ? 'Correct' : feedback.dontknow ? "That's okay" : 'Not quite'}
            </h3>
            {!feedback.correct && (
              <div className="body mt-sm">
                Expected: <strong>{feedback.expected}</strong>
              </div>
            )}
            <div className="small mt-sm">{feedback.explanation}</div>
          </div>
          <button className="btn btn-primary" onClick={next}>
            Next question
          </button>
        </>
      )}
    </div>
  );
}
