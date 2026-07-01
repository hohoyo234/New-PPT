import React, { useEffect, useState } from 'react';
import { listViewers, addViewer, removeViewer, uploadCatalog, ADMIN_EMAILS } from '../lib/catalog';
import { loadLibrary } from '../lib/songLibrary';

// Admin-only panel: upload the local library up to the cloud catalog, and manage
// the lyric-visibility allowlist (who — besides admins — may read lyrics).
export default function AdminPanel({ adminEmail, onClose }: { adminEmail: string; onClose: () => void }) {
  const [viewers, setViewers] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => setStatus(m);
  const refresh = () => listViewers().then(setViewers).catch(() => flash('❌ 读取名单失败（表建好了吗？）'));
  useEffect(() => { refresh(); }, []);

  const doUpload = async () => {
    setBusy(true);
    flash('⏳ 正在上传歌库到云端目录…');
    try {
      const n = await uploadCatalog(loadLibrary());
      flash(`✅ 已上传 ${n} 首到云端目录 ppt_catalog`);
    } catch (e: any) {
      flash('❌ 上传失败：' + (e?.message || '未知错误'));
    } finally {
      setBusy(false);
    }
  };

  const doAdd = async () => {
    const e = newEmail.trim();
    if (!e) return;
    try {
      await addViewer(e, adminEmail);
      setNewEmail('');
      refresh();
      flash(`✅ 已把 ${e} 加入可见名单`);
    } catch (err: any) {
      flash('❌ 添加失败：' + (err?.message || ''));
    }
  };

  const doRemove = async (e: string) => {
    try {
      await removeViewer(e);
      refresh();
      flash(`🗑️ 已移除 ${e}`);
    } catch {
      flash('❌ 移除失败');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-[#F4F1EE] text-outline/50 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="material-symbols-outlined text-emerald-600">admin_panel_settings</span>
          <h2 className="font-serif font-black text-2xl text-[#2C2C2C]">管理员面板</h2>
        </div>
        <p className="text-outline/50 font-medium text-[13px] mb-6">当前管理员：{adminEmail}</p>

        {/* Upload catalog */}
        <section className="mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-outline/50 mb-2">云端目录</h3>
          <p className="text-[12px] text-outline/50 font-medium mb-3 leading-relaxed">把本地歌库（含歌词）上传到云端 <code className="bg-[#F9F7F5] px-1 rounded">ppt_catalog</code>。所有人能看到歌名，只有管理员和下方名单里的人能看到歌词。</p>
          <button onClick={doUpload} disabled={busy} className="w-full h-12 rounded-2xl bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <span className={`material-symbols-outlined text-lg ${busy ? 'animate-spin' : ''}`}>{busy ? 'progress_activity' : 'cloud_upload'}</span>
            {busy ? '上传中…' : '上传歌库到云端目录'}
          </button>
        </section>

        {/* Viewer allowlist */}
        <section>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-outline/50 mb-2">歌词可见名单</h3>
          <p className="text-[12px] text-outline/50 font-medium mb-3 leading-relaxed">加进来的邮箱登录后也能看到歌词（管理员始终可见，无需添加）。</p>
          <div className="flex gap-2 mb-3">
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doAdd()} placeholder="someone@example.com" className="flex-1 bg-[#F9F7F5] border border-[#E5E0DA]/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500" />
            <button onClick={doAdd} className="px-4 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-500 shadow">添加</button>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-outline/40 px-1">管理员（固定）</div>
            {ADMIN_EMAILS.map((e) => (
              <div key={e} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/60">
                <span className="material-symbols-outlined text-emerald-600 text-[16px]">verified</span>
                <span className="flex-1 text-[12px] font-bold text-[#2C2C2C] truncate">{e}</span>
              </div>
            ))}
            <div className="text-[10px] font-black uppercase tracking-wider text-outline/40 px-1 pt-2">已授权可见（{viewers.length}）</div>
            {viewers.length === 0 && <div className="text-[12px] text-outline/40 font-semibold px-1 py-2">暂无。加一个邮箱试试。</div>}
            {viewers.map((e) => (
              <div key={e} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#F9F7F5] group">
                <span className="material-symbols-outlined text-outline/40 text-[16px]">visibility</span>
                <span className="flex-1 text-[12px] font-bold text-[#2C2C2C] truncate">{e}</span>
                <button onClick={() => doRemove(e)} className="w-7 h-7 rounded-lg hover:bg-red-50 text-outline/40 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {status && <div className="mt-5 text-[12px] font-bold text-[#2C2C2C] bg-[#F9F7F5] rounded-xl px-4 py-2.5">{status}</div>}
      </div>
    </div>
  );
}
