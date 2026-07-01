// ── 注音符號 (Bopomofo / Zhuyin) conversion ───────────────────────────────────
// pinyin-pro (3.x) has no Zhuyin output, so we build it ourselves: get tone-number
// Hanyu Pinyin per Chinese run (context preserved for 多音字), then map each
// syllable's initial + final to 注音 and append the tone mark. Non-Chinese text is
// kept verbatim, mirroring toPinyin() in pptGenerator.

import { pinyin } from 'pinyin-pro';

const INITIALS: Record<string, string> = {
  b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ',
  g: 'ㄍ', k: 'ㄎ', h: 'ㄏ', j: 'ㄐ', q: 'ㄑ', x: 'ㄒ',
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
};

// Keyed by the *phonemic* final (after y/w/ü normalisation below).
const FINALS: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', 'ê': 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
  an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ',
  i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iou: 'ㄧㄡ', ian: 'ㄧㄢ',
  in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ', io: 'ㄧㄛ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', uei: 'ㄨㄟ', uan: 'ㄨㄢ',
  uen: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ', ong: 'ㄨㄥ',
  'ü': 'ㄩ', 'üe': 'ㄩㄝ', 'üan': 'ㄩㄢ', 'ün': 'ㄩㄣ',
};

// 1 = 陰平 (unmarked), 2 ˊ, 3 ˇ, 4 ˋ, 0/5 輕聲 ˙ (placed before the syllable).
const TONES: Record<number, string> = { 0: '˙', 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' };

const SINGLE_INITIALS = new Set('b p m f d t n l g k h j q x r z c s'.split(' '));
const RETROFLEX = new Set(['zh', 'ch', 'sh', 'r', 'z', 'c', 's']);
// Surface → phonemic final (iu = iou, ui = uei, un = uen after a consonant).
const FINAL_ALIAS: Record<string, string> = { iu: 'iou', ui: 'uei', un: 'uen' };

// Convert one tone-numbered pinyin syllable ("hao3", "lv4", "a0") to 注音.
function syllableToZhuyin(sylNum: string): string {
  const m = sylNum.match(/^([a-zü]+)([0-5])?$/i);
  if (!m) return sylNum;
  const s = m[1].toLowerCase().replace(/v/g, 'ü');
  const tone = m[2] ? Number(m[2]) : 1;

  let initial = '';
  let final = s;
  if (/^(zh|ch|sh)/.test(s)) {
    initial = s.slice(0, 2);
    final = s.slice(2);
  } else if (SINGLE_INITIALS.has(s[0]) && s.length > 1) {
    initial = s[0];
    final = s.slice(1);
  }

  // Normalise zero-initial y/w glides and j/q/x + u → ü into phonemic finals.
  if (initial === '') {
    if (s[0] === 'y') {
      const r = s.slice(1);
      if (r === 'u' || r === 'ue' || r === 'uan' || r === 'un') final = 'ü' + r.slice(1);
      else if (r && !r.startsWith('i') && 'aeouê'.includes(r[0])) final = 'i' + r;
      else final = r;
    } else if (s[0] === 'w') {
      const r = s.slice(1);
      final = r === 'u' ? 'u' : 'u' + r;
    } else {
      final = s;
    }
  } else if (initial === 'j' || initial === 'q' || initial === 'x') {
    if (final[0] === 'u') final = 'ü' + final.slice(1);
  }
  if (FINAL_ALIAS[final]) final = FINAL_ALIAS[final];

  // 空韻: zhi/chi/shi/ri/zi/ci/si have no vowel symbol — just the initial.
  const finZh = final === 'i' && RETROFLEX.has(initial) ? '' : FINALS[final];
  if (finZh === undefined) return sylNum; // unknown syllable → leave pinyin as-is
  const body = (INITIALS[initial] || '') + finZh;
  return tone === 0 || tone === 5 ? TONES[0] + body : body + TONES[tone];
}

const HAN_RUN = /[㐀-鿿]+/g;

// Convert a line of text to 注音, keeping non-Chinese spans (English, punctuation,
// spaces) verbatim. Chinese is converted a run at a time so 多音字 stay contextual.
export function toZhuyin(text: string): string {
  if (!text) return '';
  try {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    HAN_RUN.lastIndex = 0;
    while ((m = HAN_RUN.exec(text))) {
      out += text.slice(last, m.index);
      const syllables = pinyin(m[0], { toneType: 'num', type: 'array' }) as string[];
      out += syllables.map(syllableToZhuyin).join(' ');
      last = m.index + m[0].length;
    }
    out += text.slice(last);
    return out;
  } catch {
    return '';
  }
}
