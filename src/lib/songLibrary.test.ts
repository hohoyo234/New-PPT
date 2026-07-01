import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveToLibrary,
  loadLibrary,
  searchLibrary,
  searchLibraryMulti,
  mergeUserSongs,
  importLibraryJSON,
  type LibrarySong,
} from './songLibrary';

// songLibrary persists to localStorage, which the node test env lacks. A tiny
// in-memory shim gives the pure merge/search logic a real store to work against.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

const LIB_KEY = 'worship_song_library_v1';
const seed = (songs: Partial<LibrarySong>[]) =>
  (globalThis.localStorage as unknown as MemoryStorage).setItem(LIB_KEY, JSON.stringify(songs));

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('saveToLibrary', () => {
  it('adds a new song and returns it with an id', () => {
    const e = saveToLibrary({ title: '奇異恩典', lyrics: 'a\nb' });
    expect(e.id).toBeTruthy();
    expect(loadLibrary()).toHaveLength(1);
  });

  it('replaces an existing entry with the same normalised title (case/space-insensitive)', () => {
    saveToLibrary({ title: 'Amazing Grace', lyrics: 'v1' });
    saveToLibrary({ title: 'amazing grace', lyrics: 'v2' });
    const lib = loadLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].lyrics).toBe('v2');
  });
});

describe('searchLibrary', () => {
  beforeEach(() => {
    saveToLibrary({ title: '奇異恩典', producer: '讚美之泉', lyrics: '奇異恩典 何等甘甜\n我罪已得赦免' });
  });

  it('scores an exact title match highest', () => {
    const r = searchLibrary('奇異恩典');
    expect(r?.score).toBe(100);
  });

  it('matches on a lyric fragment', () => {
    const r = searchLibrary('我罪已得赦免');
    expect(r?.song.title).toBe('奇異恩典');
    expect(r?.score).toBeGreaterThan(0);
  });

  it('returns null when nothing matches', () => {
    expect(searchLibrary('完全不相干的词句xyz')).toBeNull();
  });
});

describe('searchLibraryMulti', () => {
  beforeEach(() => {
    saveToLibrary({ title: 'abc', lyrics: 'nothing here' });
    saveToLibrary({ title: 'other', lyrics: 'contains abc inside the lyric' });
  });

  it('ranks an exact title match above a lyric-only match', () => {
    const res = searchLibraryMulti('abc');
    expect(res).toHaveLength(2);
    expect(res[0].title).toBe('abc');
  });

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchLibraryMulti('')).toEqual([]);
    expect(searchLibraryMulti('abc', 1)).toHaveLength(1);
  });
});

describe('mergeUserSongs', () => {
  it('adds new cloud songs, updates matches by title, and never drops the seed catalog', () => {
    seed([
      { id: 'a', title: 'Seeded Hymn', lyrics: 'catalog', seed: true, updatedAt: 0 },
      { id: 'b', title: 'My Song', lyrics: 'old', seed: false, updatedAt: 1 },
    ]);
    const res = mergeUserSongs([
      { id: 'x', title: 'My Song', lyrics: 'new', updatedAt: 2 } as LibrarySong,
      { id: 'y', title: 'Cloud Only', lyrics: 'c', updatedAt: 3 } as LibrarySong,
    ]);
    expect(res).toEqual({ added: 1, updated: 1 });
    const lib = loadLibrary();
    expect(lib).toHaveLength(3);
    expect(lib.find((s) => s.title === 'Seeded Hymn')).toBeTruthy(); // seed preserved
    expect(lib.find((s) => s.title === 'My Song')?.lyrics).toBe('new'); // updated in place
    expect(lib.find((s) => s.title === 'My Song')?.id).toBe('b'); // keeps local id
  });
});

describe('importLibraryJSON', () => {
  it('reports added vs updated counts, merging by title', () => {
    saveToLibrary({ title: 'Existing', lyrics: 'old' });
    const json = JSON.stringify({
      songs: [
        { title: 'Existing', lyrics: 'updated' },
        { title: 'Brand New', lyrics: 'fresh' },
      ],
    });
    expect(importLibraryJSON(json)).toEqual({ added: 1, updated: 1 });
    expect(loadLibrary().find((s) => s.title === 'Existing')?.lyrics).toBe('updated');
  });
});
