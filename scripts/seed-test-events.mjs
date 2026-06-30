// Seed 100 simulated user sessions into the tracking pipeline — to prove that
// the Google Sheet (Apps Script webhook) and/or Supabase are wired correctly.
//
// Usage:
//   node scripts/seed-test-events.mjs "<APPS_SCRIPT_/exec_URL>"
//   node scripts/seed-test-events.mjs            (reads APPS_SCRIPT_URL env var)
//
// It fabricates 100 sessions (a mix of guests + signed-in test users), each with
// a session_start, a few feature events, and a session_end with a duration, then
// POSTs every event to the webhook. Pure test data — safe to delete the rows after.

const URL = process.argv[2] || process.env.APPS_SCRIPT_URL || '';
if (!URL) {
  console.error('Provide the Apps Script /exec URL: node scripts/seed-test-events.mjs "<url>"');
  process.exit(1);
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rint = (n) => Math.floor(Math.random() * n);
const uuid = () => crypto.randomUUID();

const MODES = ['auto', 'manual', 'library'];
const DEVICES = ['mobile', 'desktop'];
const BROWSERS = ['Chrome', 'Safari', 'Edge', 'Firefox'];
const LANGS = ['zh-CN', 'zh-TW', 'en-US', 'zh-HK'];
const DECKS = ['Sunday Worship', '主日敬拜', '小組聚會', 'Youth Night', '禱告會', '感恩崇拜'];
const SONGS = ['奇异恩典', '恩典之路', '是誰', '十架上', '這一生最美的祝福', '活出愛'];

async function post(evt) {
  await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(evt),
  }).catch((e) => console.error('post failed', e.message));
}

function base(session_id, email, anon_id, device, browser, lang) {
  return { session_id, user_email: email, anon_id, device, browser, lang, referrer: '' };
}

async function main() {
  console.log(`Seeding 100 sessions → ${URL}`);
  for (let i = 1; i <= 100; i++) {
    const signedIn = Math.random() < 0.45;
    const email = signedIn ? `tester${i}@example.com` : '';
    const anon = uuid();
    const sid = uuid();
    const device = pick(DEVICES), browser = pick(BROWSERS), lang = pick(LANGS);
    const b = base(sid, email, anon, device, browser, lang);
    const t0 = Date.now() - rint(14) * 86400000 - rint(86400000); // within last ~2 weeks
    const at = (offsetSec) => new Date(t0 + offsetSec * 1000).toISOString();

    await post({ ...b, ts: at(0), type: 'session_start', mode: 'auto', detail: '', duration_sec: 0 });
    if (signedIn) await post({ ...b, ts: at(2), type: 'login', mode: 'auto', detail: email, duration_sec: 0 });

    const actions = 1 + rint(4);
    let off = 5;
    for (let a = 0; a < actions; a++) {
      const mode = pick(MODES);
      off += 10 + rint(120);
      await post({ ...b, ts: at(off), type: 'mode', mode, detail: mode, duration_sec: 0 });
      if (Math.random() < 0.4) {
        off += 20 + rint(60);
        const n = 1 + rint(6);
        await post({ ...b, ts: at(off), type: 'export', mode, detail: `${mode} · ${n}首 · ${pick(DECKS)}`, duration_sec: 0 });
      }
      if (Math.random() < 0.3) {
        off += 5 + rint(20);
        await post({ ...b, ts: at(off), type: 'search', mode, detail: pick(SONGS), duration_sec: 0 });
      }
    }
    const dur = off + 5 + rint(60);
    await post({ ...b, ts: at(dur), type: 'session_end', mode: 'auto', detail: '', duration_sec: dur });

    if (i % 10 === 0) console.log(`  ${i}/100 sessions sent`);
  }
  console.log('Done. Check the "events" sheet.');
}

main();
