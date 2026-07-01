import React, { useState } from 'react';
import { track } from '../lib/tracking';

// Shown right after a successful export. Fully skippable. Whatever the user
// gives is logged as a 'feedback' event, which rides the behaviour pipe into
// Supabase (data.appEvents). No rating + skip both just close.
const RATINGS = [
  { key: 'good', emoji: '😀', label: '好用' },
  { key: 'ok', emoji: '🙂', label: '还行' },
  { key: 'bad', emoji: '😕', label: '有问题' },
] as const;

type RatingKey = (typeof RATINGS)[number]['key'];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState<RatingKey | null>(null);
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (rating || t) track('feedback', `${rating || 'none'}${t ? ' · ' + t : ''}`);
    onClose();
  };
  const skip = () => { track('feedback', 'skip'); onClose(); };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={skip} />
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-7 sm:p-9">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[28px]">rate_review</span>
        </div>
        <h3 className="font-serif font-black text-2xl text-[#2C2C2C] text-center mb-1">PPT 已生成 🎉</h3>
        <p className="text-outline/50 font-medium text-[13px] text-center mb-6">用得顺手吗？一句话反馈就好（也可以跳过）</p>

        <div className="flex gap-2.5 mb-4">
          {RATINGS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRating(r.key)}
              className={`flex-1 h-[72px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${rating === r.key ? 'border-emerald-500 bg-emerald-50' : 'border-[#E5E0DA]/60 hover:border-emerald-300'}`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-[11px] font-black text-[#2C2C2C]">{r.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="想吐槽或建议什么？（可留空）"
          className="w-full bg-[#F9F7F5] border border-[#E5E0DA]/60 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 resize-none leading-relaxed"
        />

        <div className="flex gap-3 mt-5">
          <button onClick={skip} className="flex-1 py-3.5 rounded-2xl bg-[#F4F1EE] text-outline/60 text-[11px] font-black uppercase tracking-widest hover:bg-[#E5E0DA]">跳过</button>
          <button onClick={submit} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-lg">提交反馈</button>
        </div>
      </div>
    </div>
  );
}
