// ── Cloud sync (shared song library) ─────────────────────────────────────────
// The `ppt_song_library` table doubles as the community pool: anyone can read it,
// and contributed songs can be flagged `is_curated` to surface as "社区精修版".
// Everything is wrapped so the app keeps working offline if the cloud is down.

import { supabase as sb, cloudEnabled } from './supabase';
import type { LibrarySong } from './songLibrary';

export { cloudEnabled };

const TABLE = 'ppt_song_library';

type Row = {
  id?: string;
  title: string;
  english_title?: string;
  producer?: string;
  lyrics?: string;
  english_lyrics?: string;
  bg?: any;
  is_curated?: boolean;
  contributed_by?: string | null;
  updated_at?: string;
};

const toRow = (s: LibrarySong): Row => ({
  title: s.title,
  english_title: s.englishTitle || '',
  producer: s.producer || '',
  lyrics: s.lyrics || '',
  english_lyrics: s.englishLyrics || '',
  bg: s.bg ?? null,
  updated_at: new Date().toISOString(),
});

const fromRow = (r: Row): LibrarySong => ({
  id: r.id || crypto.randomUUID(),
  title: r.title,
  englishTitle: r.english_title || '',
  producer: r.producer || '',
  lyrics: r.lyrics || '',
  englishLyrics: r.english_lyrics || '',
  bg: r.bg ?? null,
  curated: !!r.is_curated,
  updatedAt: r.updated_at ? Date.parse(r.updated_at) || 0 : 0,
});

// Read the whole shared library.
export async function cloudFetchAll(): Promise<LibrarySong[]> {
  const { data, error } = await sb.from(TABLE).select('*').limit(2000);
  if (error) throw error;
  return (data || []).map(fromRow);
}

// Upsert a single song, keyed by title (case-insensitive via the table's index).
export async function cloudUpsert(song: LibrarySong): Promise<void> {
  if (!song.title?.trim()) return;
  const { data: existing } = await sb.from(TABLE).select('id').eq('title', song.title).maybeSingle();
  if (existing?.id) {
    await sb.from(TABLE).update(toRow(song)).eq('id', existing.id);
  } else {
    const { error } = await sb.from(TABLE).insert(toRow(song));
    // Ignore unique-violation races (another device inserted the same title).
    if (error && error.code !== '23505') throw error;
  }
}

// Insert many new songs (used for first-time population). De-dupes by title so a
// single duplicate can't abort the whole batch; falls back to per-row if a chunk
// still conflicts with rows already in the cloud.
export async function cloudBulkInsert(songs: LibrarySong[]): Promise<void> {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const s of songs) {
    const t = (s.title || '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push(toRow(s));
  }
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from(TABLE).insert(chunk);
    if (error) {
      // A conflict with existing cloud rows aborts the whole statement — retry
      // row by row so the non-conflicting ones still land.
      for (const r of chunk) await sb.from(TABLE).insert(r);
    }
  }
}

// Delete by title.
export async function cloudDelete(title: string): Promise<void> {
  if (!title?.trim()) return;
  await sb.from(TABLE).delete().eq('title', title);
}

// ── Community pool (社区精修版) ────────────────────────────────────────────────
// The shared library doubles as the community pool. Songs flagged `is_curated`
// are surfaced as "社区精修版" — same-工 contributions worth highlighting.

// Search the community pool by title / lyric fragment. Curated entries come back
// flagged via `curated` on the returned LibrarySong. Returns [] on any error so
// the local search never breaks because the network is down.
export async function communitySearch(query: string, limit = 12): Promise<LibrarySong[]> {
  const q = (query || '').trim();
  if (!q) return [];
  try {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .or(`title.ilike.${like},english_title.ilike.${like},lyrics.ilike.${like}`)
      .order('is_curated', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(fromRow);
  } catch {
    return [];
  }
}

// Contribute a song to the community pool and flag it as 社区精修版. Used by the
// "贡献至社区精修库" flow after the user accepts the sharing agreement.
export async function contributeCurated(song: LibrarySong, userId?: string): Promise<void> {
  if (!song.title?.trim()) return;
  const row: Row = { ...toRow(song), is_curated: true, contributed_by: userId ?? null };
  const { data: existing } = await sb.from(TABLE).select('id').eq('title', song.title).maybeSingle();
  if (existing?.id) {
    await sb.from(TABLE).update(row).eq('id', existing.id);
  } else {
    const { error } = await sb.from(TABLE).insert(row);
    if (error && error.code !== '23505') throw error;
  }
}
