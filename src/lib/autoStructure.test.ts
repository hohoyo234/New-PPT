import { describe, it, expect } from 'vitest';
import { detectChorus, parseEntryLine } from './autoStructure';

describe('detectChorus', () => {
  it('marks a repeated 2+ line stanza with [副歌]', () => {
    const lyrics = ['甲一', '甲二', '', '副一', '副二', '', '乙一', '乙二', '', '副一', '副二'].join('\n');
    const out = detectChorus(lyrics);
    expect(out).toContain('[副歌]');
    // The chorus body is written once; its later repeat becomes a lone reference.
    expect((out.match(/\[副歌\]/g) || []).length).toBe(2);
    expect((out.match(/副一/g) || []).length).toBe(1);
  });

  it('leaves lyrics that already have section markers unchanged', () => {
    const lyrics = '[主歌]\na\nb\n\n[副歌]\nc\nd';
    expect(detectChorus(lyrics)).toBe(lyrics);
  });

  it('leaves lyrics with too few stanzas unchanged', () => {
    const lyrics = 'a\nb\n\nc\nd';
    expect(detectChorus(lyrics)).toBe(lyrics);
  });

  it('leaves lyrics with no repeated stanza unchanged', () => {
    const lyrics = 'a\nb\n\nc\nd\n\ne\nf';
    expect(detectChorus(lyrics)).toBe(lyrics);
  });
});

describe('parseEntryLine', () => {
  it('parses "Artist - Title"', () => {
    const r = parseEntryLine('Hillsong - Oceans');
    expect(r.title).toBe('Oceans');
    expect(r.producer).toBe('Hillsong');
  });

  it('parses "歌名 / 制作人"', () => {
    const r = parseEntryLine('奇異恩典 / 讚美之泉');
    expect(r.title).toBe('奇異恩典');
    expect(r.producer).toBe('讚美之泉');
  });

  it('treats a short bare line as a title with no producer', () => {
    const r = parseEntryLine('奇異恩典');
    expect(r.title).toBe('奇異恩典');
    expect(r.producer).toBe('');
  });
});
