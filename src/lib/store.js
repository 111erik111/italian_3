import VOCABULARY from '../data/vocabulary.json';
import VERBS from '../data/verbs.json';
import SENTENCES from '../data/sentences.json';

export { VOCABULARY, VERBS, SENTENCES };

export const PRONOUNS = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];
export const PRIORITY_DELTA = { wrong: 5, hard: 2, correct: -1, easy: -2.5 };
export const FLOOR = 0.1;
export const STORAGE_KEY = 'italian_learner_v1';

export const TENSE_LABEL = {
  presente: 'Present',
  passato_prossimo: 'Passato prossimo',
  futuro: 'Futuro',
};
export const ENGLISH_PRONOUN = {
  io: 'I', tu: 'you', lui: 'he', noi: 'we', voi: 'you (pl.)', loro: 'they',
};

export const vocabId = (v) => `V::${v.italian}`;
export const verbId = (v, t, p) => `VB::${v.infinitive}::${t}::${p}`;
export const sentenceId = (s) => `S::${s.english}`;

export function newProgress() {
  return {
    times_seen: 0,
    times_correct: 0,
    times_wrong: 0,
    mastery_score: 0,
    next_review_priority: 1.0,
  };
}

export function buildInitialState() {
  const vocab_progress = {};
  for (const v of VOCABULARY) vocab_progress[vocabId(v)] = newProgress();

  const verb_progress = {};
  for (const v of VERBS) {
    for (const t of ['presente', 'passato_prossimo', 'futuro']) {
      if (v[t]) for (const p of PRONOUNS) verb_progress[verbId(v, t, p)] = newProgress();
    }
  }

  const sentence_progress = {};
  for (const s of SENTENCES) sentence_progress[sentenceId(s)] = newProgress();

  return {
    level: 'A1',
    vocab_progress,
    verb_progress,
    sentence_progress,
    verbs_practiced: [],
    streak_days: 0,
    last_session_date: null,
    sessions_count: 0,
    _justUnlocked: null,
  };
}

export function updateProgressIn(prog, grade) {
  prog.times_seen += 1;
  if (grade === 'wrong') prog.times_wrong += 1;
  else prog.times_correct += 1;
  prog.mastery_score = (prog.times_correct + 0.5) / (prog.times_seen + 1);
  prog.next_review_priority = Math.max(FLOOR, prog.next_review_priority + PRIORITY_DELTA[grade]);
}

export function chooseNextWeighted(items, getId, progressMap) {
  if (!items.length) return null;
  const weights = [];
  let total = 0;
  for (const it of items) {
    const p = progressMap[getId(it)];
    const w = p ? p.next_review_priority : 1.0;
    weights.push(w);
    total += w;
  }
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function allowedLevels(level) {
  if (level === 'A1') return ['A1'];
  if (level === 'A2') return ['A1', 'A2'];
  return ['A1', 'A2', 'B1'];
}

export function maybeUnlockLevel(state) {
  let totalSeen = 0;
  let totalCorrect = 0;
  for (const m of [state.vocab_progress, state.verb_progress, state.sentence_progress]) {
    for (const id in m) {
      totalSeen += m[id].times_seen;
      totalCorrect += m[id].times_correct;
    }
  }
  const accuracy = totalSeen > 0 ? totalCorrect / totalSeen : 0;
  if (state.level === 'A1' && totalSeen >= 50 && accuracy >= 0.8) return 'A2';
  if (
    state.level === 'A2' &&
    totalSeen >= 100 &&
    accuracy >= 0.8 &&
    state.verbs_practiced.length >= 30
  )
    return 'B1';
  return state.level;
}

export function masteryStats(map) {
  let mastered = 0;
  let weak = 0;
  let neutral = 0;
  let total = 0;
  for (const id in map) {
    total += 1;
    const p = map[id];
    if (p.times_seen === 0) {
      neutral += 1;
      continue;
    }
    if (p.mastery_score >= 0.85) mastered += 1;
    else if (p.mastery_score < 0.5) weak += 1;
    else neutral += 1;
  }
  return { mastered, weak, neutral, total };
}

export function normalizeText(s) {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/, '')
    .replace(/\s+/g, ' ');
}

export function updateStreakInPlace(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.last_session_date === today) return;
  if (state.last_session_date) {
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.last_session_date === yest) state.streak_days += 1;
    else state.streak_days = 1;
  } else {
    state.streak_days = 1;
  }
  state.last_session_date = today;
}

// ---- localStorage persistence ----
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw);
    const fresh = buildInitialState();
    fresh.level = parsed.level || 'A1';
    fresh.verbs_practiced = parsed.verbs_practiced || [];
    fresh.streak_days = parsed.streak_days || 0;
    fresh.last_session_date = parsed.last_session_date || null;
    fresh.sessions_count = parsed.sessions_count || 0;
    for (const key of ['vocab_progress', 'verb_progress', 'sentence_progress']) {
      if (parsed[key]) {
        for (const id in parsed[key]) {
          if (fresh[key][id]) {
            fresh[key][id] = { ...fresh[key][id], ...parsed[key][id] };
          }
        }
      }
    }
    return fresh;
  } catch (e) {
    return buildInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage full or unavailable - ignore */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}
