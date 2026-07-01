import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthChange, signOut, type AppUser } from '../lib/auth';
import { setCloudHooks, loadLibrary, mergeUserSongs } from '../lib/songLibrary';
import { pullUserLibrary, pushUserLibrary, upsertUserSong, deleteUserSong } from '../lib/userCloud';
import { cloudEnabled } from '../lib/supabase';
import { setTrackedUser, track } from '../lib/tracking';
import AuthModal from './AuthModal';
import AgreementModal from './AgreementModal';

interface AuthCtx {
  user: AppUser | null;
  ready: boolean;
  syncing: boolean;
  /** Whoever this resolves to is signed in; null = guest (功能受限). */
  openAuth: (opts?: { reason?: string; onSuccess?: () => void }) => void;
  signOutNow: () => Promise<void>;
  /** Full two-way sync: push the local library up, pull the cloud one down. */
  syncNow: () => Promise<{ pushed: number; pulled: number } | null>;
  openTerms: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within <AuthProvider>');
  return c;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authOpts, setAuthOpts] = useState<{ reason?: string; onSuccess?: () => void }>({});
  const [termsOpen, setTermsOpen] = useState(false);
  const pulledFor = useRef<string | null>(null);

  // Wire local-library write-through to the right destination based on auth:
  //   signed in → the user's PRIVATE cloud table (isolated by RLS)
  //   guest     → nowhere (local-only; cloud features are gated behind login)
  useEffect(() => {
    if (!cloudEnabled) { setReady(true); return; }
    const off = onAuthChange((u) => {
      setUser(u);
      setReady(true);
      setTrackedUser(u?.email ?? null);
      if (u) {
        if (pulledFor.current !== u.id) track('login', u.email);
        setCloudHooks({
          upsert: (s) => { upsertUserSong(s, u.id).catch(() => {}); },
          remove: (t) => { deleteUserSong(t, u.id).catch(() => {}); },
        });
        // Pull the user's private library down once per session (additive merge,
        // never wipes the seeded catalog or local-only edits).
        if (pulledFor.current !== u.id) {
          pulledFor.current = u.id;
          pullUserLibrary(u.id).then((songs) => { if (songs.length) mergeUserSongs(songs); }).catch(() => {});
        }
      } else {
        setCloudHooks({});
        pulledFor.current = null;
      }
    });
    return off;
  }, []);

  // Allow any "用户服务协议" link in the app to open the Terms modal.
  useEffect(() => {
    const h = () => setTermsOpen(true);
    window.addEventListener('open-terms', h);
    return () => window.removeEventListener('open-terms', h);
  }, []);

  const signOutNow = async () => {
    await signOut();
    setCloudHooks({});
    pulledFor.current = null;
    setUser(null);
  };

  const syncNow = async () => {
    if (!user) { setAuthOpen(true); return null; }
    setSyncing(true);
    try {
      const pushed = await pushUserLibrary(loadLibrary(), user.id);
      const cloud = await pullUserLibrary(user.id);
      const { added, updated } = mergeUserSongs(cloud);
      return { pushed, pulled: added + updated };
    } finally {
      setSyncing(false);
    }
  };

  const value: AuthCtx = {
    user, ready, syncing,
    openAuth: (opts) => { setAuthOpts(opts || {}); setAuthOpen(true); },
    signOutNow,
    syncNow,
    openTerms: () => setTermsOpen(true),
  };

  const closeAuth = () => { setAuthOpen(false); setAuthOpts({}); };

  return (
    <Ctx.Provider value={value}>
      {children}
      {authOpen && <AuthModal reason={authOpts.reason} onSuccess={authOpts.onSuccess} onClose={closeAuth} />}
      {termsOpen && <AgreementModal kind="terms" onClose={() => setTermsOpen(false)} />}
    </Ctx.Provider>
  );
}
