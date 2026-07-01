// ── Cloud catalog + lyric-visibility (admin / allowlist) ─────────────────────
// The shared catalog `ppt_catalog` holds the full songs (incl. lyrics). Everyone
// can read NAMES via the public view `ppt_catalog_public`; only admins and emails
// on the `ppt_lyric_viewers` allowlist can read LYRICS (enforced by RLS — see
// supabase_catalog.sql). This module is the client side of that: who's an admin,
// managing the allowlist, and uploading the local library up to the catalog.

import { supabase } from './supabase';
import type { LibrarySong } from './songLibrary';

// Keep in sync with public.ppt_is_admin() in supabase_catalog.sql.
export const ADMIN_EMAILS = [
  'rabbitshark.space@gmail.com',
  'hyy7010@gmail.com',
  'jzey805@gmail.com',
];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// ── Lyric-viewer allowlist (admin-managed) ───────────────────────────────────

export async function listViewers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('ppt_lyric_viewers')
    .select('email')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: { email: string }) => r.email);
}

export async function addViewer(email: string, addedBy: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  const { error } = await supabase
    .from('ppt_lyric_viewers')
    .upsert({ email: e, added_by: addedBy }, { onConflict: 'email' });
  if (error) throw error;
}

export async function removeViewer(email: string): Promise<void> {
  const { error } = await supabase
    .from('ppt_lyric_viewers')
    .delete()
    .eq('email', email.trim().toLowerCase());
  if (error) throw error;
}

// Can THIS user read lyrics? Admins always; others only if on the allowlist.
// A non-admin can read their own allowlist row (viewers_read_self policy).
export async function canReadLyrics(email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  if (!email) return false;
  const { data } = await supabase
    .from('ppt_lyric_viewers')
    .select('email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}

// ── Catalog upload (admin only; RLS blocks non-admins) ───────────────────────

const toRow = (s: LibrarySong) => ({
  title: s.title,
  title_sc: s.titleSc || '',
  english_title: s.englishTitle || '',
  producer: s.producer || '',
  composer: s.composer || '',
  lyricist: s.lyricist || '',
  singer: s.singer || '',
  publication: s.publication || '',
  key: s.key || '',
  lyrics: s.lyrics || '',
  lyrics_sc: s.lyricsSc || '',
  english_lyrics: s.englishLyrics || '',
  bg: s.bg ?? null,
  updated_at: new Date().toISOString(),
});

// Push the given songs up to ppt_catalog, upserting on title. De-dupes by
// case-insensitive title. Returns how many rows were sent.
export async function uploadCatalog(songs: LibrarySong[]): Promise<number> {
  const seen = new Set<string>();
  const rows: ReturnType<typeof toRow>[] = [];
  for (const s of songs) {
    const t = (s.title || '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push(toRow(s));
  }
  let n = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from('ppt_catalog').upsert(chunk, { onConflict: 'title' });
    if (error) throw error;
    n += chunk.length;
  }
  return n;
}
