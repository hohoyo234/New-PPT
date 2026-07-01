import { useEffect, useState } from 'react';
import ManualMode from './modes/ManualMode';
import AutoMode from './modes/AutoMode';
import LibraryMode from './modes/LibraryMode';
import { replaceLibrary } from './lib/songLibrary';
import { SEED_SONGS, REPLACE_VERSION } from './lib/seedSongs';
import AuthProvider from './components/AuthProvider';
import AuthButton from './components/AuthButton';
import { initTracking, setTrackedMode, track } from './lib/tracking';
import { initBehaviour } from './lib/behaviour';

type Mode = 'auto' | 'manual' | 'library';

export default function App() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('ppt_mode') as Mode) || 'auto');

  useEffect(() => {
    // Install the 讚美之泉 (SOP) catalog as the user's library — a one-time hard
    // replace, versioned so later edits aren't clobbered.
    replaceLibrary(SEED_SONGS, REPLACE_VERSION);
    // Cloud write-through is wired by <AuthProvider>: signed-in users sync to
    // their own private table; guests stay local-only.
    setTrackedMode(mode);
    // Behaviour tracking first so its listener is wired before session_start.
    initBehaviour();
    initTracking();
  }, []);

  const change = (m: Mode) => {
    setMode(m);
    setTrackedMode(m);
    track('mode', m);
    try { localStorage.setItem('ppt_mode', m); } catch {}
  };

  // Shared brand + Auto/Manual switch, rendered inside each mode's header.
  const modeToggle = (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0" />
      <div className="hidden md:block min-w-0">
        <h1 className="font-serif font-black text-[#2C2C2C] text-lg tracking-tight leading-none truncate">
          敬拜 <span className="text-emerald-500/80 italic">PPT</span> 制作器
        </h1>
      </div>
      <div className="flex bg-white rounded-2xl p-1 border border-[#E5E0DA]/60 shadow-sm ml-1">
        <button onClick={() => change('auto')} className={`px-3.5 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${mode === 'auto' ? 'bg-emerald-600 text-white shadow' : 'text-outline/50 hover:text-[#2C2C2C]'}`}>
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span><span className="hidden sm:inline">Auto</span>
        </button>
        <button onClick={() => change('manual')} className={`px-3.5 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${mode === 'manual' ? 'bg-emerald-600 text-white shadow' : 'text-outline/50 hover:text-[#2C2C2C]'}`}>
          <span className="material-symbols-outlined text-[16px]">tune</span><span className="hidden sm:inline">手动</span>
        </button>
        <button onClick={() => change('library')} className={`px-3.5 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${mode === 'library' ? 'bg-emerald-600 text-white shadow' : 'text-outline/50 hover:text-[#2C2C2C]'}`}>
          <span className="material-symbols-outlined text-[16px]">library_music</span><span className="hidden sm:inline">歌库</span>
        </button>
      </div>
    </div>
  );

  const authSlot = <AuthButton />;

  return (
    <AuthProvider>
      {mode === 'library'
        ? <LibraryMode modeToggle={modeToggle} authSlot={authSlot} />
        : mode === 'auto'
          ? <AutoMode modeToggle={modeToggle} authSlot={authSlot} />
          : <ManualMode modeToggle={modeToggle} authSlot={authSlot} />}
    </AuthProvider>
  );
}
