// ── Consent tracking (合规防火墙) ──────────────────────────────────────────────
// Two lightweight, locally-remembered agreements gate the social features:
//   • 'contribute' — the 用户上传内容合规协议, shown the first time a user shares
//     or contributes a song to the community pool.
//   • 'community'  — the 共享互助协议, shown the first time a user opens a 社区精修版.
// Once accepted we don't nag again. Kept in localStorage so it's per-browser and
// needs no backend round-trip.

export type ConsentKind = 'contribute' | 'community';

const KEY = (k: ConsentKind) => `worship_consent_${k}_v1`;

export function hasConsented(kind: ConsentKind): boolean {
  try {
    return localStorage.getItem(KEY(kind)) === '1';
  } catch {
    return false;
  }
}

export function recordConsent(kind: ConsentKind): void {
  try {
    localStorage.setItem(KEY(kind), '1');
  } catch {}
}
