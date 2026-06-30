import type { SeedSong } from './songLibrary';
import { SOP_SONGS } from './sopSongs';
import { EXTRA_SONGS } from './extraSongs';
import { W247_SONGS } from './w247Songs';

// The song library is the complete 讚美之泉 (Stream of Praise) catalog — 707 songs
// imported from the official SOP song & lyrics list (sop.org). Each entry carries
// Traditional + Simplified Chinese + English titles and lyrics, plus 作曲/作詞/歌手/
// 出版/調性 metadata. Regenerate `sopSongs.ts` from the source PDF rather than
// editing it by hand.
//
// EXTRA_SONGS appends hand-curated, fully trilingual (繁/简/英) songs from
// 敬拜詩歌歌詞集. W247_SONGS appends the 小羊詩歌 catalog scraped from w247.net
// (繁/简 + English where the source provided it). Both live in their own files so
// the generated SOP catalog stays untouched.

// Bump when the catalog changes so existing users get the new songs (additive).
export const SEED_VERSION = 2;

// Bump to force a one-time full replacement of the user's library with the
// catalog below (see replaceLibrary in songLibrary.ts). Bumped to 3 so existing
// users pick up EXTRA_SONGS + W247_SONGS while keeping their own additions.
export const REPLACE_VERSION = 3;

export const SEED_SONGS: SeedSong[] = [...SOP_SONGS, ...EXTRA_SONGS, ...W247_SONGS];
