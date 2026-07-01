// ── Usage tracking (谁在用 / 用多久 / 用了什么) ────────────────────────────────
// Fire-and-forget analytics. Every event is sent to BOTH:
//   1. Supabase  → table `ppt_usage_events` (durable, queryable)
//   2. Google Sheet → via an Apps Script web-app webhook (APPS_SCRIPT_URL)
// Either sink can be missing; the app keeps working. No PII beyond the email of
// a signed-in user; guests are an anonymous per-device id.

import { supabase } from './supabase';

// Paste the deployed Apps Script web-app /exec URL here to stream events into the
// Google Sheet. Empty = Sheet sink off (Supabase still records everything).
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxKS85F22HtspbnMmBqzqwue6WC-YAjhA26oukuXfgkxGm5x3tTU5DWXsH8XkTHPPZ6/exec';

const ANON_KEY = 'ppt_anon_id';
const SESSION_KEY = 'ppt_session_id';
const OPTOUT_KEY = 'ppt_tracking_optout';

// User-facing opt-out: when set, no events are sent to either sink.
export function isTrackingOptedOut(): boolean {
  try { return localStorage.getItem(OPTOUT_KEY) === '1'; } catch { return false; }
}
export function setTrackingOptOut(on: boolean) {
  try { localStorage.setItem(OPTOUT_KEY, on ? '1' : '0'); } catch {}
}

function anonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_KEY, id); }
    return id;
  } catch { return 'no-storage'; }
}

// One session id per page load (kept in sessionStorage so a reload-in-tab keeps it).
function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

const deviceType = (): string =>
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

const browserName = (): string => {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
};

let currentEmail = '';
export function setTrackedUser(email: string | null) { currentEmail = email || ''; }

export type UsageEvent = {
  ts: string;
  session_id: string;
  user_email: string;
  anon_id: string;
  type: string;          // session_start | session_end | mode | export | search | login | song
  mode: string;          // current mode at event time
  detail: string;        // human-readable detail (deck name, query, count…)
  duration_sec: number;  // filled on session_end
  device: string;
  browser: string;
  lang: string;
  referrer: string;
};

let mode = 'auto';
export function setTrackedMode(m: string) { mode = m; }

const sessionStart = Date.now();

function buildEvent(type: string, detail = '', duration = 0): UsageEvent {
  return {
    ts: new Date().toISOString(),
    session_id: sessionId(),
    user_email: currentEmail,
    anon_id: anonId(),
    type,
    mode,
    detail,
    duration_sec: duration,
    device: deviceType(),
    browser: browserName(),
    lang: (typeof navigator !== 'undefined' && navigator.language) || '',
    referrer: document.referrer || '',
  };
}

// Send to both sinks. `beacon` uses sendBeacon so it survives page unload.
function send(evt: UsageEvent, beacon = false) {
  if (isTrackingOptedOut()) return;
  // Sheet sink
  if (APPS_SCRIPT_URL) {
    try {
      const body = JSON.stringify(evt);
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(APPS_SCRIPT_URL, new Blob([body], { type: 'text/plain' }));
      } else {
        // text/plain avoids a CORS preflight against Apps Script.
        fetch(APPS_SCRIPT_URL, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
      }
    } catch {}
  }
  // Supabase sink
  try {
    supabase.from('ppt_usage_events').insert(evt).then(() => {}, () => {});
  } catch {}
}

// Did the user export a deck this session? Lets session_end flag a "used it but
// left without producing a PPT" session — a drop-off / stuck signal.
let didExport = false;
export function track(type: string, detail = '') {
  if (type === 'export') didExport = true;
  send(buildEvent(type, detail));
}
export const hasExported = () => didExport;

// Debounced search tracker for live-filter inputs (歌库 / 手动 搜索框): fires one
// 'search' event after the user pauses typing, so we log the query they settled
// on rather than one event per keystroke. Skips very short and repeated queries.
// When `count` is 0 the query is tagged 无结果 — i.e. the user looked for a song
// we don't have (a content gap / stuck signal).
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

// Call once on app start: records session_start and wires the session_end beacon.
let started = false;
export function initTracking() {
  if (started) return;
  started = true;
  track('session_start');
  // Mark sessions that ended without any export — "used it but made nothing".
  const endDetail = () => (didExport ? '' : '未导出');
  const end = () => {
    if (document.visibilityState === 'hidden') {
      send(buildEvent('session_end', endDetail(), Math.round((Date.now() - sessionStart) / 1000)), true);
    }
  };
  document.addEventListener('visibilitychange', end);
  window.addEventListener('pagehide', () => send(buildEvent('session_end', endDetail(), Math.round((Date.now() - sessionStart) / 1000)), true));
}
