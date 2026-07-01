import { describe, it, expect } from 'vitest';
import {
  hexLuminance,
  resolveSlideColors,
  paginateLyrics,
  expandSongSections,
} from './pptTheme';

// Non-blank lyric lines from a slide's paired lines, for concise assertions.
const cn = (slides: { cn: string; en: string }[][]) => slides.map((s) => s.map((l) => l.cn));

describe('hexLuminance', () => {
  it('is ~1 for white and ~0 for black', () => {
    expect(hexLuminance('FFFFFF')).toBeCloseTo(1, 5);
    expect(hexLuminance('000000')).toBeCloseTo(0, 5);
  });
  it('tolerates a leading # and short/invalid input', () => {
    expect(hexLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(hexLuminance('abc')).toBe(0); // too short → treated as dark
  });
});

describe('resolveSlideColors', () => {
  it('keeps user colors and adds an overlay for image backgrounds', () => {
    const r = resolveSlideColors({ url: 'http://x/y.jpg' }, '#fff', '#eee');
    expect(r).toEqual({ lc: '#fff', tc: '#eee', overlay: true });
  });
  it('forces dark text on a light solid background', () => {
    const r = resolveSlideColors({ color: 'FFFFFF' }, '#fff', '#eee');
    expect(r.lc).toBe('#111111');
    expect(r.overlay).toBe(false);
  });
  it('respects user colors on a dark solid background', () => {
    const r = resolveSlideColors({ color: '064E3B' }, '#fff', '#eee');
    expect(r).toEqual({ lc: '#fff', tc: '#eee', overlay: false });
  });
});

describe('paginateLyrics', () => {
  it('makes one slide per blank-line-separated block', () => {
    const slides = paginateLyrics('a\nb\n\nc', '', 4);
    expect(cn(slides)).toEqual([['a', 'b'], ['c']]);
  });

  it('pairs translation lines with the Nth non-blank lyric line', () => {
    const slides = paginateLyrics('a\nb\n\nc', 'ta\ntb\ntc', 4);
    expect(slides[0].map((l) => l.en)).toEqual(['ta', 'tb']);
    expect(slides[1].map((l) => l.en)).toEqual(['tc']);
  });

  it('falls back to autoN lines per slide when there are no blank lines', () => {
    const slides = paginateLyrics('a\nb\nc', '', 2);
    expect(cn(slides)).toEqual([['a', 'b'], ['c']]);
  });

  it('honors explicit per-page line counts', () => {
    const slides = paginateLyrics('a\nb\nc', '', 4, [1, 2]);
    expect(cn(slides)).toEqual([['a'], ['b', 'c']]);
  });
});

describe('expandSongSections', () => {
  it('returns lyrics unchanged when there are no [section] markers', () => {
    const out = expandSongSections('a\nb', 'x\ny');
    expect(out).toEqual({ lyrics: 'a\nb', english: 'x\ny' });
  });

  it('repeats a chorus written once at each later [副歌] reference', () => {
    const lyrics = ['verse one', 'verse two', '', '[副歌]', 'chorus a', 'chorus b', '', 'verse three', '', '[副歌]'].join('\n');
    const out = expandSongSections(lyrics, '');
    const nonBlank = out.lyrics.split('\n').filter((l) => l.trim());
    expect(nonBlank).toEqual(['verse one', 'verse two', 'chorus a', 'chorus b', 'verse three', 'chorus a', 'chorus b']);
  });

  it('keeps the English translation aligned through the expansion', () => {
    const lyrics = ['verse one', 'verse two', '', '[副歌]', 'chorus a', 'chorus b', '', 'verse three', '', '[副歌]'].join('\n');
    const english = ['V1', 'V2', 'CA', 'CB', 'V3'].join('\n');
    const out = expandSongSections(lyrics, english);
    const en = out.english.split('\n').filter((l) => l.trim());
    // The repeated chorus carries its own translation (CA/CB) to the reference.
    expect(en).toEqual(['V1', 'V2', 'CA', 'CB', 'V3', 'CA', 'CB']);
  });
});
