import { useMemo } from 'react';
import { Card, Pill, ScreenHeader, ProgressBar } from '../components/UI';
import { masteryStats, VOCABULARY, VERBS, SENTENCES } from '../lib/store';

function ModuleRow({ title, italian, stats, count, accent, onClick, delta }) {
  const pct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  return (
    <div className="module-row" onClick={onClick}>
      <div className="info">
        <div className="caption" style={{ color: accent }}>
          {italian.toUpperCase()}
        </div>
        <div className="h2" style={{ marginTop: 2 }}>
          {title}
        </div>
        <div className="small mt-sm">
          {stats.mastered} mastered · {stats.weak} weak · {count} total
        </div>
        <ProgressBar value={stats.mastered} max={Math.max(1, stats.total)} color={accent} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="pct" style={{ color: accent }}>
          {pct}%
        </div>
        <div className="caption">mastery</div>
        {delta != null && delta !== 0 && (
          <div className="small" style={{ color: delta > 0 ? 'var(--olive)' : 'var(--terracotta)', marginTop: 2 }}>
            {delta > 0 ? `+${delta}%` : `${delta}%`} today
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ state, onNavigate, onReset }) {
  const vs = useMemo(() => masteryStats(state.vocab_progress), [state.vocab_progress]);
  const vbs = useMemo(() => masteryStats(state.verb_progress), [state.verb_progress]);
  const ss = useMemo(() => masteryStats(state.sentence_progress), [state.sentence_progress]);

  let totalSeen = 0;
  let totalCorrect = 0;
  for (const m of [state.vocab_progress, state.verb_progress, state.sentence_progress]) {
    for (const id in m) {
      totalSeen += m[id].times_seen;
      totalCorrect += m[id].times_correct;
    }
  }
  const accuracy = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0;

  const lastSnap =
    state.mastery_history && state.mastery_history.length > 0
      ? state.mastery_history[state.mastery_history.length - 1]
      : null;
  const vocabPct = vs.total > 0 ? Math.round((vs.mastered / vs.total) * 100) : 0;
  const verbPct = vbs.total > 0 ? Math.round((vbs.mastered / vbs.total) * 100) : 0;
  const sentPct = ss.total > 0 ? Math.round((ss.mastered / ss.total) * 100) : 0;
  const vocabDelta = lastSnap != null ? vocabPct - lastSnap.vocab : null;
  const verbDelta = lastSnap != null ? verbPct - lastSnap.verb : null;
  const sentDelta = lastSnap != null ? sentPct - lastSnap.sentence : null;

  let nextLabel;
  let nextValue;
  let nextMax;
  let nextHint;
  if (state.level === 'A1') {
    nextLabel = 'A1 → A2';
    nextValue = totalSeen;
    nextMax = 50;
    nextHint = `${totalSeen}/50 questions · ${accuracy}% (need 80%)`;
  } else if (state.level === 'A2') {
    nextLabel = 'A2 → B1';
    nextValue = Math.min(totalSeen, 100);
    nextMax = 100;
    nextHint = `${totalSeen}/100 questions · ${state.verbs_practiced.length}/30 verbs · ${accuracy}% (need 80%)`;
  } else {
    nextLabel = 'B1 reached';
    nextValue = 1;
    nextMax = 1;
    nextHint = 'Continue practicing to maintain mastery.';
  }

  const tagline =
    state.level === 'A1' ? 'Beginnings' : state.level === 'A2' ? 'Building fluency' : 'Conversational';

  return (
    <div className="screen">
      <ScreenHeader kicker="Dashboard" title="Buongiorno" />

      <Card paper style={{ marginBottom: 18 }}>
        <div className="between">
          <span className="caption">Current level</span>
          <Pill kind="olive">{state.level}</Pill>
        </div>
        <h2 className="h1" style={{ marginTop: 4, marginBottom: 14 }}>
          {tagline}
        </h2>
        <div className="caption mb-sm">{nextLabel}</div>
        <ProgressBar value={nextValue} max={nextMax} color="var(--olive)" />
        <div className="small mt-sm">{nextHint}</div>
      </Card>

      <div className="stat-grid mb-lg">
        <Card>
          <div className="caption">Streak</div>
          <div className="stat-num">{state.streak_days}</div>
          <div className="small">{state.streak_days === 1 ? 'day' : 'days'}</div>
        </Card>
        <Card>
          <div className="caption">Accuracy</div>
          <div className="stat-num">{accuracy}%</div>
          <div className="small">{totalSeen} answered · {state.sessions_count} {state.sessions_count === 1 ? 'session' : 'sessions'}</div>
        </Card>
      </div>

      <div className="section-label">Practice</div>
      <ModuleRow
        title="Vocabulary"
        italian="Parole"
        stats={vs}
        count={VOCABULARY.length}
        accent="var(--terracotta)"
        onClick={() => onNavigate('flashcards')}
        delta={vocabDelta}
      />
      <ModuleRow
        title="Verbs"
        italian="Verbi"
        stats={vbs}
        count={VERBS.length}
        accent="var(--olive)"
        onClick={() => onNavigate('verbs')}
        delta={verbDelta}
      />
      <ModuleRow
        title="Sentence Builder"
        italian="Frasi"
        stats={ss}
        count={SENTENCES.length}
        accent="var(--ochre)"
        onClick={() => onNavigate('sentences')}
        delta={sentDelta}
      />

      <div className="section-label">Library</div>
      <Card>
        <div className="body">
          <strong>{VOCABULARY.length}</strong> words · <strong>{VERBS.length}</strong> verbs ·{' '}
          <strong>{SENTENCES.length}</strong> sentences
        </div>
        <div className="small mt-sm">All content offline. Progress saved in your browser.</div>
      </Card>

      <button className="reset-link" onClick={onReset}>
        Reset all progress
      </button>
    </div>
  );
}
