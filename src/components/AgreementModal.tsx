import React, { useState } from 'react';
import { recordConsent, type ConsentKind } from '../lib/consent';

type Kind = ConsentKind | 'terms';

interface Content {
  icon: string;
  title: string;
  intro: string;
  clauses: string[];
  agreeLabel: string;
}

const CONTENT: Record<Kind, Content> = {
  // 第三步：合规防火墙 — shown before share/contribute.
  contribute: {
    icon: 'verified_user',
    title: '内容合规协议',
    intro: '在把歌曲分享或贡献到社区之前，请阅读并确认以下条款。这是平台合法运营的基石。',
    clauses: [
      '本平台仅提供技术排版与展示服务，不对上传内容的版权归属作任何主张。',
      '我确认上传的歌词 / 歌谱内容不构成对第三方的商业版权侵权，相关责任由我本人承担。',
      '我授权平台在非营利前提下，对上传内容进行存储、排版与公开展示，以供同工交流学习。',
      '平台遵循「通知—删除」（避风港）原则：一旦收到合法侵权通知，将及时下架相关内容。',
    ],
    agreeLabel: '我已阅读并同意上述条款',
  },
  // 第四步：社区精修版 — shown before opening curated content.
  community: {
    icon: 'diversity_3',
    title: '共享互助协议',
    intro: '「社区精修版」由各地同工义务分享、共同维护。打开前请先了解这份轻量约定。',
    clauses: [
      '这里的资源来自同工的无偿分享，仅供教会聚会、个人灵修等非商业用途。',
      '请尊重原作者与版权方的权益，不要将精修内容用于任何盈利场景。',
      '如发现内容有误或涉及侵权，欢迎反馈，我们会及时核实处理。',
      '使用即表示你愿意以「互助交流」的精神参与，并在合适时也回馈社区。',
    ],
    agreeLabel: '我理解并愿意遵守共享互助约定',
  },
  // The full 用户服务协议 page (read-only, no checkbox).
  terms: {
    icon: 'gavel',
    title: '用户服务协议 / 版权声明',
    intro: '敬拜 PPT 制作器（以下简称「本平台」）是一款公益性的歌词排版工具。使用本平台即表示你接受以下条款：',
    clauses: [
      '一、服务性质：本平台仅提供 PPT 排版与生成的技术服务，不销售、不分发任何受版权保护的作品。',
      '二、内容版权：用户上传的歌词、歌谱、图片等内容，其版权归原作者或版权方所有，与本平台无关。',
      '三、用户责任：用户须保证其上传 / 分享的内容已获授权或属合理使用，因侵权产生的法律责任由用户自负。',
      '四、避风港原则：本平台在接到合法侵权通知后，将履行「通知—删除」义务，及时下架被投诉内容。',
      '五、隐私：登录账户的歌库数据仅与你的账户绑定，他人不可见；我们不会出售你的个人数据。',
      '六、非营利展示：社区精修版等共享内容仅用于同工间非营利的交流学习。',
    ],
    agreeLabel: '我知道了',
  },
};

// One modal for: the compliance gate (contribute), the community gate
// (community), and the read-only Terms page (terms). For the gated kinds the
// agree button is disabled until the checkbox is ticked, and accepting records
// consent so the user isn't asked again.
export default function AgreementModal({
  kind,
  onAgree,
  onClose,
}: {
  kind: Kind;
  onAgree?: () => void;
  onClose: () => void;
}) {
  const c = CONTENT[kind];
  const needsCheckbox = kind !== 'terms';
  const [checked, setChecked] = useState(!needsCheckbox);

  const agree = () => {
    if (needsCheckbox && (kind === 'contribute' || kind === 'community')) recordConsent(kind);
    onAgree?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-7 sm:p-9 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">{c.icon}</span>
          </div>
          <h2 className="font-serif font-black text-2xl text-[#2C2C2C]">{c.title}</h2>
        </div>
        <p className="text-outline/60 font-medium text-sm leading-relaxed mb-5">{c.intro}</p>

        <ul className="space-y-3 mb-6">
          {c.clauses.map((cl, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-[#2C2C2C]/85 font-medium">
              <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0 mt-0.5">check_circle</span>
              <span>{cl}</span>
            </li>
          ))}
        </ul>

        {needsCheckbox && (
          <label className="flex items-start gap-3 cursor-pointer select-none bg-[#F9F7F5] rounded-2xl px-4 py-3.5 mb-5">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 accent-emerald-600 cursor-pointer" />
            <span className="text-[13px] font-bold text-[#2C2C2C]">{c.agreeLabel}</span>
          </label>
        )}

        <div className="flex gap-3">
          {needsCheckbox && (
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-[#F4F1EE] text-outline/60 text-[11px] font-black uppercase tracking-widest hover:bg-[#E5E0DA]">取消</button>
          )}
          <button onClick={agree} disabled={needsCheckbox && !checked} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
            {needsCheckbox ? '同意并继续' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}
