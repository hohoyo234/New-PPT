// ── Per-user cloud library (云端同步 / 个人库) ─────────────────────────────────
// Each signed-in user gets their own rows in `ppt_user_songs`, isolated by RLS
// (user_id = auth.uid()). Unlike the shared `ppt_song_library`, nobody else can
// read or write these — it's the user's private backup so a cleared browser
// cache never loses their work. We store the full song plus its layout settings.

import { supabase } from './supabase';
import type { LibrarySong } from './songLibrary';

const TABLE = 'ppt_user_songs';

type Row = {
  id?: string;
  user_id: string;
  title: string;
  title_sc?: string;
  english_title?: string;
  producer?: string;
  composer?: string;
  lyricist?: string;
  singer?: string;
  publication?: string;
  key?: string;
  lyrics?: string;
  lyrics_sc?: string;
  english_lyrics?: string;
  bg?: any;
  settings?: any;
  updated_at?: string;
};

const toRow = (s: LibrarySong, userId: string): Row => ({
  user_id: userId,
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

const fromRow = (r: Row): LibrarySong => ({
  id: r.id || crypto.randomUUID(),
  title: r.title,
  titleSc: r.title_sc || '',
  englishTitle: r.english_title || '',
  producer: r.producer || '',
  composer: r.composer || '',
  lyricist: r.lyricist || '',
  singer: r.singer || '',
  publication: r.publication || '',
  key: r.key || '',
  lyrics: r.lyrics || '',
  lyricsSc: r.lyrics_sc || '',
  englishLyrics: r.english_lyrics || '',
  bg: r.bg ?? null,
  seed: false,
  updatedAt: r.updated_at ? Date.parse(r.updated_at) || 0 : 0,
});

// Pull the user's whole private library down from the cloud.
export async function pullUserLibrary(userId: string): Promise<LibrarySong[]> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).limit(2000);
  if (error) throw error;
  return (data || []).map(fromRow);
}

// Push the user's local library up. Upserts on (user_id, title) so re-syncing is
// idempotent. Skips empty / placeholder songs. Returns how many were synced.
export async function pushUserLibrary(songs: LibrarySong[], userId: string): Promise<number> {
  const rows = songs
    .filter((s) => s.title?.trim())
    .map((s) => toRow(s, userId));
  if (!rows.length) return 0;
  let synced = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase
      .from(TABLE)
      .upsert(chunk, { onConflict: 'user_id,title', ignoreDuplicates: false });
    if (error) throw error;
    synced += chunk.length;
  }
  return synced;
}

// Upsert a single song for the user (write-through on every local edit once the
// user is signed in).
export async function upsertUserSong(song: LibrarySong, userId: string): Promise<void> {
  if (!song.title?.trim()) return;
  await supabase
    .from(TABLE)
    .upsert(toRow(song, userId), { onConflict: 'user_id,title', ignoreDuplicates: false });
}

export async function deleteUserSong(title: string, userId: string): Promise<void> {
  if (!title?.trim()) return;
  await supabase.from(TABLE).delete().eq('user_id', userId).eq('title', title);
}
