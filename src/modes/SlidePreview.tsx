import React, { useRef, useState } from 'react';
import { toPinyin, toZhuyin, type BgOption } from '../lib/pptGenerator';
import { insertSectionMarker, type SlideColors, type ShadowLevel } from '../lib/pptTheme';

export type PreviewSlide = { type: 'cover' | 'lyric'; title?: string; sub?: string; lines?: { cn: string; en: string }[] };

const bgStyle = (bg?: BgOption | null): React.CSSProperties =>
  bg?.url ? { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: `#${bg?.color || '064E3B'}` };

// One slide rendered with container-query font sizes so it scales with its box
// and matches the .pptx. Fill a relatively-positioned, sized parent.
export function SlideView({ slide, bg, pc, lyricFontSize, translationFontSize, shadow, enablePinyin = false, enableZhuyin = false }: {
  slide: PreviewSlide; bg?: BgOption | null; pc: SlideColors;
  lyricFontSize: number; translationFontSize: number; shadow: string; enablePinyin?: boolean; enableZhuyin?: boolean;
}) {
  const cqw = (pt: number) => `${(pt / 7.2).toFixed(2)}cqw`;
  const annotate = enablePinyin ? toPinyin : enableZhuyin ? toZhuyin : null;
  return (
    <div className="absolute inset-0 flex items-center justify-center text-center p-[5%]" style={{ ...bgStyle(bg), containerType: 'inline-size' }}>
      {bg?.url && <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/40" />}
      <div className="relative z-10 w-full flex flex-col" style={{ gap: '1.5cqw' }}>
        {slide.type === 'cover' ? (
          <>
            <h2 className="font-serif font-black leading-tight" style={{ fontSize: cqw(48), color: pc.lc, textShadow: shadow }}>{slide.title || '未命名'}</h2>
            {slide.sub && <p className="font-medium" style={{ fontSize: cqw(24), color: pc.tc, textShadow: shadow }}>{slide.sub}</p>}
          </>
        ) : (
          (slide.lines || []).map((ln, j) => (
            <div key={j}>
              {annotate && annotate(ln.cn) && <p style={{ fontSize: cqw(lyricFontSize * 0.45), color: pc.lc, textShadow: shadow }}>{annotate(ln.cn)}</p>}
              {ln.cn && <p className="font-serif font-black leading-snug" style={{ fontSize: cqw(lyricFontSize), color: pc.lc, textShadow: shadow }}>{ln.cn}</p>}
              {ln.en && <p className="italic leading-snug" style={{ fontSize: cqw(translationFontSize), color: pc.tc, textShadow: shadow }}>{ln.en}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Live style overrides editable from the modal (all optional / per-song).
export type SlideStyle = {
  lyricColor: string; translationColor: string;
  lyricFontSize: number; translationFontSize: number; linesPerSlide: number;
  enablePinyin: boolean; enableZhuyin: boolean; showEnglish: boolean; shadow: boolean; shadowLevel: ShadowLevel;
};

// Click-to-enlarge modal: big slide with prev/next + edit the song's lyrics AND
// (optionally) its style — colors, background, font sizes, lines per page — live.
export function PreviewModal({ slides, bg, pc, start, lyric, english, lyricFontSize, translationFontSize, shadow, enablePinyin, enableZhuyin, onLyric, onEnglish, onClose, style, onStyle, bgOptions, onBg, onRandomBg }: {
  slides: PreviewSlide[]; bg?: BgOption | null; pc: SlideColors; start: number;
  lyric: string; english: string; lyricFontSize: number; translationFontSize: number; shadow: string; enablePinyin?: boolean; enableZhuyin?: boolean;
  onLyric: (v: string) => void; onEnglish: (v: string) => void; onClose: () => void;
  // When provided, a "样式" panel appears with live color/font/lines/background controls.
  style?: SlideStyle; onStyle?: (patch: Partial<SlideStyle>) => void;
  bgOptions?: BgOption[]; onBg?: (bg: BgOption) => void; onRandomBg?: () => void;
}) {
  const [i, setI] = useState(start);
  const [tab, setTab] = useState<'text' | 'style'>('text');
  const idx = Math.min(i, Math.max(0, slides.length - 1));
  const lyricRef = useRef<HTMLTextAreaElement>(null);
  const engRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<'lyric' | 'english'>('lyric');
  // Mark the stanza at the cursor of the focused field (歌词/翻译) and mirror the
  // label into the paired stanza of the other language so 中/英 stay in sync.
  const insertSection = (label: string) => {
    const isEng = activeField === 'english';
    const ta = isEng ? engRef.current : lyricRef.current;
    const primary = isEng ? english : lyric;
    const pos = ta ? ta.selectionStart : primary.length;
    const r = insertSectionMarker(lyric, english, isEng ? 'en' : 'cn', pos, label);
    onLyric(r.cn);
    onEnglish(r.en);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(r.caret, r.caret);
    });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-5 grid md:grid-cols-[1.5fr_1fr] gap-5">
        <div>
          <div className="relative aspect-video rounded-xl overflow-hidden">
            {slides[idx] && <SlideView slide={slides[idx]} bg={bg} pc={pc} lyricFontSize={lyricFontSize} translationFontSize={translationFontSize} shadow={shadow} enablePinyin={enablePinyin} enableZhuyin={enableZhuyin} />}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0} className="h-9 px-4 rounded-xl bg-[#F9F7F5] text-[11px] font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[#E5E0DA]">上一页</button>
            <span className="text-[11px] font-black text-outline/50 tabular-nums">{idx + 1} / {slides.length}</span>
            <button onClick={() => setI(Math.min(slides.length - 1, idx + 1))} disabled={idx >= slides.length - 1} className="h-9 px-4 rounded-xl bg-[#F9F7F5] text-[11px] font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[#E5E0DA]">下一页</button>
          </div>
        </div>
        <div className="space-y-3">
          {/* Tabs only when style editing is available */}
          {style && onStyle ? (
            <div className="flex bg-[#F4F1EE] rounded-2xl p-1">
              {([['text', '歌词'], ['style', '样式']] as const).map(([v, t]) => (
                <button key={v} onClick={() => setTab(v)} className={`flex-1 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${tab === v ? 'bg-white text-emerald-600 shadow' : 'text-outline/50 hover:text-[#2C2C2C]'}`}>{t}</button>
              ))}
            </div>
          ) : (
            <h3 className="font-serif font-black text-xl text-[#2C2C2C]">编辑歌词</h3>
          )}

          {(!style || tab === 'text') && (
            <>
              <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">歌词（每行一句，空行 = 换页）</span>
                <textarea ref={lyricRef} onFocus={() => setActiveField('lyric')} value={lyric} onChange={(e) => onLyric(e.target.value)} rows={9} className="w-full bg-[#F9F7F5] border border-[#E5E0DA]/60 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-500 resize-none leading-relaxed" />
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-outline/40 uppercase tracking-wider mr-0.5">把光标所在段标为</span>
                {(['主歌', '副歌', '导歌', '桥段', '结尾'] as const).map((lbl) => (
                  <button key={lbl} onClick={() => insertSection(lbl)} className="h-6 px-2 rounded-md bg-[#F9F7F5] hover:bg-emerald-50 hover:text-emerald-600 text-[10px] font-black transition-all">{lbl}</button>
                ))}
              </div>
              <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">翻译 / 对照歌词（可选）</span>
                <textarea ref={engRef} onFocus={() => setActiveField('english')} value={english} onChange={(e) => onEnglish(e.target.value)} rows={5} className="w-full bg-[#F9F7F5] border border-[#E5E0DA]/60 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 resize-none leading-relaxed" />
                <span className="block text-[10px] font-medium text-outline/40 px-1 leading-snug">内置英文翻译为参考版本、非官方译本，可能与会众熟悉的唱本不同，敬拜前请自行核对或修改。</span>
              </label>
            </>
          )}

          {style && onStyle && tab === 'style' && (
            <div className="space-y-4">
              {/* Background picker */}
              {bgOptions && onBg && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40">背景</span>
                    {onRandomBg && (
                      <button onClick={onRandomBg} className="h-7 px-2.5 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 flex items-center gap-1 transition-all"><span className="material-symbols-outlined text-[14px]">casino</span>随机背景</button>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-0.5">
                    {bgOptions.map((b) => (
                      <button key={b.id} title={b.label} onClick={() => onBg(b)} className={`aspect-video rounded-md overflow-hidden border-2 ${bg?.id === b.id ? 'border-emerald-500' : 'border-transparent'}`} style={b.url ? { backgroundImage: `url(${b.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: `#${b.color}` }} />
                    ))}
                  </div>
                </div>
              )}
              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="歌词颜色" value={style.lyricColor} onChange={(v) => onStyle({ lyricColor: v })} />
                <ColorField label="翻译颜色" value={style.translationColor} onChange={(v) => onStyle({ translationColor: v })} />
              </div>
              {/* Font sizes */}
              <RangeField label="歌词字号" value={style.lyricFontSize} min={20} max={80} onChange={(v) => onStyle({ lyricFontSize: v })} />
              <RangeField label="翻译字号" value={style.translationFontSize} min={12} max={56} onChange={(v) => onStyle({ translationFontSize: v })} />
              {/* Lines per slide */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">每页行数（在歌词里用空行分页，即可逐页自定）</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button key={n} onClick={() => onStyle({ linesPerSlide: n })} className={`flex-1 h-9 rounded-lg text-[12px] font-black transition-all ${style.linesPerSlide === n ? 'bg-emerald-600 text-white shadow' : 'bg-[#F9F7F5] text-outline/60 hover:bg-[#E5E0DA]'}`}>{n}</button>
                  ))}
                </div>
              </div>
              {/* Text shadow */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">文字阴影（深色背景更清晰）</span>
                <div className="flex gap-1.5">
                  {([['none', '无', false, 'medium'], ['light', '淡', true, 'light'], ['medium', '中', true, 'medium'], ['strong', '浓', true, 'strong']] as const).map(([key, t, on, lvl]) => {
                    const active = key === 'none' ? !style.shadow : style.shadow && style.shadowLevel === lvl;
                    return <button key={key} onClick={() => onStyle({ shadow: on, ...(on ? { shadowLevel: lvl } : {}) })} className={`flex-1 h-9 rounded-lg text-[12px] font-black transition-all ${active ? 'bg-emerald-600 text-white shadow' : 'bg-[#F9F7F5] text-outline/60 hover:bg-[#E5E0DA]'}`}>{t}</button>;
                  })}
                </div>
              </div>
              {/* English lyrics show / hide */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">英文歌词</span>
                <div className="flex gap-1.5">
                  {([['show', '显示', true], ['hide', '隐藏', false]] as const).map(([key, t, on]) => {
                    const active = style.showEnglish === on;
                    return <button key={key} onClick={() => onStyle({ showEnglish: on })} className={`flex-1 h-9 rounded-lg text-[12px] font-black transition-all ${active ? 'bg-emerald-600 text-white shadow' : 'bg-[#F9F7F5] text-outline/60 hover:bg-[#E5E0DA]'}`}>{t}</button>;
                  })}
                </div>
              </div>
              {/* Phonetic ruby: none / pinyin / zhuyin */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">歌词上方注音</span>
                <div className="flex gap-1.5">
                  {([['none', '无'], ['pinyin', '拼音'], ['zhuyin', 'ㄅㄆㄇ 注音']] as const).map(([key, t]) => {
                    const active = key === 'none' ? !style.enablePinyin && !style.enableZhuyin : key === 'pinyin' ? style.enablePinyin : style.enableZhuyin;
                    return <button key={key} onClick={() => onStyle({ enablePinyin: key === 'pinyin', enableZhuyin: key === 'zhuyin' })} className={`flex-1 h-9 rounded-lg text-[12px] font-black transition-all ${active ? 'bg-emerald-600 text-white shadow' : 'bg-[#F9F7F5] text-outline/60 hover:bg-[#E5E0DA]'}`}>{t}</button>;
                  })}
                </div>
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500">完成</button>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">{label}</span>
      <div className="flex items-center gap-2 bg-[#F9F7F5] rounded-xl p-1.5 border border-[#E5E0DA]/60">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer p-0" />
        <span className="text-[11px] font-bold text-outline/60 uppercase">{value}</span>
      </div>
    </label>
  );
}

function RangeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1"><span className="text-[10px] font-bold uppercase tracking-wider text-outline/40">{label}</span><span className="text-[11px] font-black text-emerald-600 tabular-nums">{value}pt</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-emerald-600" />
    </div>
  );
}
