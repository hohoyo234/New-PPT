// ── Behavioural analytics (web-user-behaviour → Supabase) ────────────────────
// Wraps the vendored TA3/web-user-behaviour library. It records raw interaction
// data (mouse moves, clicks + the element path, scroll, resize, visibility,
// navigation, touch) and every `processTime` seconds — and when the tab is
// hidden — hands the batch to us. We fold in the app's semantic events (export /
// search / mode …, dispatched by tracking.ts) and insert one row into Supabase
// `ppt_behaviour` (jsonb). Nothing goes to Google Sheet anymore.
//
// Privacy: keyboard capture and form-submit capture are OFF — the page has a
// password field and users paste lyrics, so we never record keystrokes or form
// contents. The whole thing is disabled when the user has opted out.

import ub from './vendor/userBehaviour.js';
import type { UserBehaviourResults } from './vendor/userBehaviour';
import { supabase } from './supabase';
import { APP_EVENT_NAME, getAnonId, getSessionId, getTrackedEmail, isTrackingOptedOut } from './tracking';

type AppEvent = [type: string, detail: string, mode: string, ts: number];

// Semantic events (from tracking.track) that arrive between two flushes, folded
// into the next behaviour batch so business signals ride the same pipe.
let appEvents: AppEvent[] = [];

function iso(ms: number): string | null {
  return ms ? new Date(ms).toISOString() : null;
}

function send(results: UserBehaviourResults) {
  const batch = appEvents;
  appEvents = [];
  if (isTrackingOptedOut()) return; // opted out mid-session: drop this batch
  try {
    supabase
      .from('ppt_behaviour')
      .insert({
        session_id: getSessionId(),
        anon_id: getAnonId(),
        user_email: getTrackedEmail(),
        started_at: iso(results?.time?.startTime),
        ended_at: iso(results?.time?.currentTime),
        data: { ...results, appEvents: batch },
      })
      .then(() => {}, () => {});
  } catch {
    /* fire-and-forget */
  }
}

let started = false;

// Call once on app start. No-op if the user has opted out of tracking.
export function initBehaviour() {
  if (started || isTrackingOptedOut()) return;
  started = true;

  // Collect the app's semantic events into the current batch.
  ub.registerCustomEvent(APP_EVENT_NAME, (e: Event) => {
    const d = (e as CustomEvent).detail || {};
    appEvents.push([d.type || '', d.detail || '', d.mode || '', Date.now()]);
  });

  ub.config({
    userInfo: true,
    clicks: true,
    mouseMovement: true,
    mouseMovementInterval: 2,
    mouseScroll: true,
    timeCount: true,
    windowResize: true,
    visibilitychange: true, // flushes the batch when the tab is hidden
    keyboardActivity: false, // privacy: never record keystrokes
    pageNavigation: true,
    formInteractions: false, // privacy + the lib preventDefault()s submits
    touchEvents: true,
    audioVideoInteraction: false,
    clearAfterProcess: true,
    processTime: 30,
    processData: send,
  });

  ub.start();
}
