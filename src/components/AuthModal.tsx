import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '../lib/auth';

// Email/password login + register modal. On success the parent closes it and
// reacts to the auth-state change (which kicks off the cloud pull).
export default function AuthModal({ onClose, reason, onSuccess }: { onClose: () => void; reason?: string; onSuccess?: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await signInWithGoogle(); // redirects the browser away on success
    } catch (e: any) {
      setError(e?.message || 'Google 登录失败，请重试');
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        onSuccess?.();
        onClose();
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setInfo('注册成功！请到邮箱点击验证链接后再登录。');
          setTab('login');
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } catch (e: any) {
      setError(e?.message || '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-7 sm:p-9">
        <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-[#F4F1EE] text-outline/50 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
          <h2 className="font-serif font-black text-2xl text-[#2C2C2C]">{tab === 'login' ? '登录' : '注册账户'}</h2>
        </div>
        <p className="text-outline/50 font-medium text-sm mb-6">{reason || '登录后即可云端同步歌库、贡献社区精修版，换设备也不丢。'}</p>

        <button onClick={google} disabled={busy} className="w-full mb-4 h-12 rounded-2xl bg-white border border-[#E5E0DA] text-[#2C2C2C] text-[13px] font-black hover:bg-[#F9F7F5] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
          使用 Google 登录
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#E5E0DA]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40">或用邮箱</span>
          <div className="flex-1 h-px bg-[#E5E0DA]" />
        </div>

        <div className="flex bg-[#F4F1EE] rounded-2xl p-1 mb-5">
          {([['login', '登录'], ['register', '注册']] as const).map(([v, t]) => (
            <button key={v} onClick={() => { setTab(v); setError(null); setInfo(null); }} className={`flex-1 h-10 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${tab === v ? 'bg-white text-emerald-600 shadow' : 'text-outline/50 hover:text-[#2C2C2C]'}`}>{t}</button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">邮箱</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ai" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline/40 px-1">密码{tab === 'register' && '（至少 8 位）'}</span>
            <input type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" className="ai" />
          </label>
        </div>

        {error && <div className="mt-4 text-[12px] font-bold text-red-600 bg-red-50 rounded-xl px-4 py-2.5 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">error</span>{error}</div>}
        {info && <div className="mt-4 text-[12px] font-bold text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">mark_email_read</span>{info}</div>}

        <button onClick={submit} disabled={busy} className="w-full mt-6 h-13 py-4 rounded-2xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
          {tab === 'login' ? '登录' : '创建账户'}
        </button>

        {reason && (
          <button onClick={onClose} className="w-full mt-3 h-11 rounded-2xl bg-[#F4F1EE] text-outline/60 text-[11px] font-black uppercase tracking-widest hover:bg-[#E5E0DA] transition-all">
            以访客身份继续（暂不登录）
          </button>
        )}

        <p className="text-[11px] text-outline/40 font-medium text-center mt-5 leading-relaxed">
          继续即表示你同意我们的
          <button className="text-emerald-600 font-bold underline mx-0.5" onClick={() => window.dispatchEvent(new Event('open-terms'))}>用户服务协议</button>
          与隐私声明。
        </p>

        <style>{`.ai{width:100%;background:#F9F7F5;border:1px solid rgba(229,224,218,0.6);border-radius:0.85rem;padding:0.7rem 0.95rem;font-size:0.9rem;font-weight:600;outline:none}.ai:focus{border-color:#10b981;background:#fff}.h-13{height:3.25rem}`}</style>
      </div>
    </div>
  );
}
