// ── Auth (Supabase email/password) ───────────────────────────────────────────
// Thin wrapper over Supabase Auth. The app stays usable as a guest (功能受限);
// signing in unlocks 云端同步 and 社区贡献, and binds those to the user's id.

import { supabase } from './supabase';

export interface AppUser {
  id: string;
  email: string;
}

const toUser = (u: { id: string; email?: string } | null | undefined): AppUser | null =>
  u ? { id: u.id, email: u.email || '' } : null;

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getUser();
  return toUser(data.user);
}

// Subscribe to login/logout. Returns an unsubscribe fn.
export function onAuthChange(fn: (user: AppUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    fn(toUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  return toUser(data.user)!;
}

// Register. With "Confirm email" on in Supabase, `session` is null until the user
// clicks the email link — we surface that as a "check your inbox" outcome.
export async function signUp(
  email: string,
  password: string,
): Promise<{ user: AppUser | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  return { user: toUser(data.user), needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Translate the most common Supabase auth errors to plain Chinese.
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return '邮箱或密码不正确';
  if (m.includes('already registered') || m.includes('already exists')) return '该邮箱已注册，请直接登录';
  if (m.includes('password should be at least')) return '密码至少需要 6 位';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '邮箱格式不正确';
  if (m.includes('email not confirmed')) return '邮箱尚未验证，请查收验证邮件';
  if (m.includes('rate limit')) return '操作过于频繁，请稍后再试';
  return msg;
}
