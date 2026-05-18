import { useState, useEffect, useCallback } from 'react';
import Dashboard from './screens/Dashboard';
import Flashcards from './screens/Flashcards';
import Verbs from './screens/Verbs';
import Sentences from './screens/Sentences';
import {
  loadState,
  saveState,
  clearState,
  buildInitialState,
  newProgress,
  updateProgressIn,
  updateStreakInPlace,
  maybeUnlockLevel,
} from './lib/store';

function Toast({ level, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="toast" onClick={onDismiss}>
      <div className="label">Level unlocked</div>
      <div className="text">You've reached {level}.</div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const recordAnswer = useCallback((a) => {
    setState((prev) => {
      const next = { ...prev };
      const map = { ...prev[a.mapKey] };
      const cur = { ...(map[a.itemId] || newProgress()) };
      updateProgressIn(cur, a.grade);
      map[a.itemId] = cur;
      next[a.mapKey] = map;

      if (
        a.mode === 'verb' &&
        a.extra &&
        a.extra.infinitive &&
        !next.verbs_practiced.includes(a.extra.infinitive)
      ) {
        next.verbs_practiced = next.verbs_practiced.concat([a.extra.infinitive]);
      }

      updateStreakInPlace(next);

      const newLevel = maybeUnlockLevel(next);
      if (newLevel !== next.level) {
        next.level = newLevel;
        next._justUnlocked = newLevel;
      } else {
        next._justUnlocked = null;
      }
      return next;
    });
  }, []);

  const dismissUnlock = () =>
    setState((prev) => ({ ...prev, _justUnlocked: null }));

  const reset = () => {
    if (
      window.confirm(
        'Reset all progress? This will clear your streak, level, and every score.'
      )
    ) {
      clearState();
      setState(buildInitialState());
      setTab('dashboard');
    }
  };

  let screen;
  if (tab === 'dashboard')
    screen = <Dashboard state={state} onNavigate={setTab} onReset={reset} />;
  else if (tab === 'flashcards')
    screen = <Flashcards state={state} recordAnswer={recordAnswer} />;
  else if (tab === 'verbs') screen = <Verbs state={state} recordAnswer={recordAnswer} />;
  else if (tab === 'sentences')
    screen = <Sentences state={state} recordAnswer={recordAnswer} />;

  return (
    <div className="app">
      {state._justUnlocked && (
        <Toast level={state._justUnlocked} onDismiss={dismissUnlock} />
      )}
      {screen}
      <nav className="nav">
        <button
          className={`nav-item${tab === 'dashboard' ? ' active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          Casa
        </button>
        <button
          className={`nav-item${tab === 'flashcards' ? ' active' : ''}`}
          onClick={() => setTab('flashcards')}
        >
          Parole
        </button>
        <button
          className={`nav-item${tab === 'verbs' ? ' active' : ''}`}
          onClick={() => setTab('verbs')}
        >
          Verbi
        </button>
        <button
          className={`nav-item${tab === 'sentences' ? ' active' : ''}`}
          onClick={() => setTab('sentences')}
        >
          Frasi
        </button>
      </nav>
    </div>
  );
}
