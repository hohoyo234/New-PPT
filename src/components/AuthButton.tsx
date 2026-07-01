import React, { useState } from 'react';
import { useAuth } from './AuthProvider';

// Top-bar account entry. Guest → 登录/注册 button. Signed in → avatar + dropdown
// with the email, a 同步至云端 shortcut, and 退出登录.
export default function AuthButton() {
  const { user, openAuth, signOutNow, syncNow, syncing } = useAuth();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!user) {
    return (
      <button onClick={() => openAuth()} className="h-11 px-4 rounded-2xl bg-white border border-[#E5E0DA]/60 text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 transition-all shadow-sm flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[18px]">account_circle</span>
        <span className="hidden sm:inline">登录 / 注册</span>
      </button>
    );
  }

  const initial = (user.email || '?').trim().charAt(0).toUpperCase();
  const doSync = async () => {
    const r = await syncNow();
    if (r) { setFlash(`已同步 ${r.pushed} 首`); window.setTimeout(() => setFlash(null), 2200); }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-11 w-11 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-sm hover:bg-emerald-500 transition-all" title={user.email}>
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-[#E5E0DA]/70 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E5E0DA]/50">
              <div className="text-[9px] font-black uppercase tracking-wider text-outline/40">已登录</div>
              <div className="text-[13px] font-bold text-[#2C2C2C] truncate mt-0.5">{user.email}</div>
            </div>
            <button onClick={() => { setOpen(false); doSync(); }} disabled={syncing} className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-bold text-[#2C2C2C] hover:bg-emerald-50 disabled:opacity-50">
              <span className={`material-symbols-outlined text-[18px] text-emerald-600 ${syncing ? 'animate-spin' : ''}`}>{syncing ? 'progress_activity' : 'cloud_sync'}</span>
              {syncing ? '同步中…' : '同步至云端'}
            </button>
            <button onClick={() => { setOpen(false); signOutNow(); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-bold text-red-500 hover:bg-red-50 border-t border-[#E5E0DA]/50">
              <span className="material-symbols-outlined text-[18px]">logout</span>退出登录
            </button>
          </div>
        </>
      )}
      {flash && <div className="absolute right-0 mt-2 whitespace-nowrap bg-black text-white text-[11px] font-black px-3 py-2 rounded-xl shadow-lg z-50">{flash}</div>}
    </div>
  );
}
