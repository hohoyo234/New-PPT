// ── Semantic app events (谁在用 / 用了什么) ───────────────────────────────────
// These are the app's meaningful moments — export / search / mode switch /
// session_start / login. They no longer go to Google Sheet or their own Supabase
// table; instead each is dispatched as a window CustomEvent that behaviour.ts
// picks up and folds into the web-user-behaviour batch it sends to Supabase.
// So there is ONE tracking pipe (the behaviour library) and ONE sink (Supabase).
//
// Guests are an anonymous per-device id; a signed-in user also carries their
// email. Everything is suppressed when the user has opted out.

// The window event name behaviour.ts listens for. Kept here so both modules agree.
export const APP_EVENT_NAME = 'ub-app-event';

const ANON_KEY = 'ppt_anon_id';
const SESSION_KEY = 'ppt_session_id';
const OPTOUT_KEY = 'ppt_tracking_optout';

// User-facing opt-out: when set, nothing is tracked (events or behaviour).
export function isTrackingOptedOut(): boolean {
  try { return localStorage.getItem(OPTOUT_KEY) === '1'; } catch { return false; }
}
export function setTrackingOptOut(on: boolean) {
  try { localStorage.setItem(OPTOUT_KEY, on ? '1' : '0'); } catch {}
}

// Per-device id (guests) — stable across sessions.
export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_KEY, id); }
    return id;
  } catch { return 'no-storage'; }
}

// One id per page load (kept in sessionStorage so a reload-in-tab keeps it).
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

let currentEmail = '';
export function setTrackedUser(email: string | null) { currentEmail = email || ''; }
export function getTrackedEmail(): string { return currentEmail; }

let mode = 'auto';
export function setTrackedMode(m: string) { mode = m; }

// Emit a semantic event. behaviour.ts folds it into the next behaviour batch.
export function track(type: string, detail = '') {
  if (isTrackingOptedOut()) return;
  try {
    window.dispatchEvent(new CustomEvent(APP_EVENT_NAME, { detail: { type, detail, mode } }));
  } catch {}
}

// Debounced search tracker for live-filter inputs (歌库 / 手动 搜索框): fires one
// 'search' event after the user pauses typing, so we log the query they settled
// on rather than one event per keystroke. Skips very short and repeated queries.
// When `count` is 0 the query is tagged 无结果 — a content gap / stuck signal.
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let lastSearch = '';
export function trackSearch(query: string, count?: number) {
  const q = (query || '').trim();
  if (searchTimer) clearTimeout(searchTimer);
  if (q.length < 2) return;
  searchTimer = setTimeout(() => {
    const key = `${q}|${count ?? -1}`;
    if (key !== lastSearch) {
      lastSearch = key;
      track('search', count === 0 ? `${q} · 无结果` : q);
    }
  }, 800);
}

// Call once on app start (AFTER initBehaviour, so the listener is already wired):
// marks the session start. Session end / duration is derivable from the
// behaviour payload's time + visibility data.
let started = false;
export function initTracking() {
  if (started) return;
  started = true;
  track('session_start');
}
