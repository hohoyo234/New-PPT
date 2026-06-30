-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 账户系统 / 云端同步 / 社区精修版  迁移脚本                 ║
-- ║  在你的 Supabase 项目 SQL Editor 里粘贴执行即可（可重复执行，幂等）。       ║
-- ║  前置：已运行 supabase_ppt_library.sql。                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 注意：账户登录用 Supabase 内置的 Auth（邮箱/密码）。无需建用户表——
-- auth.users 已经由 Supabase 维护，下面的表通过 user_id 与之绑定。

-- ── 1) 社区精修版：给共享歌库表加两列 ────────────────────────────────────────
-- is_curated   = true 的条目在搜索结果里会被标记为「社区精修版」。
-- contributed_by 记录贡献者（可空；匿名贡献时为 null）。
alter table public.ppt_song_library
  add column if not exists is_curated boolean default false;
alter table public.ppt_song_library
  add column if not exists contributed_by uuid references auth.users(id) on delete set null;

create index if not exists ppt_song_library_curated_idx
  on public.ppt_song_library (is_curated);

-- ── 2) 个人云端歌库：每个用户私有，互不可见 ──────────────────────────────────
create table if not exists public.ppt_user_songs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  title_sc       text default '',
  english_title  text default '',
  producer       text default '',
  composer       text default '',
  lyricist       text default '',
  singer         text default '',
  publication    text default '',
  key            text default '',
  lyrics         text default '',
  lyrics_sc      text default '',
  english_lyrics text default '',
  bg             jsonb,            -- 背景（含 AI 生成图 URL）
  settings       jsonb,           -- 该歌的排版设置（字号/颜色/分页等）
  updated_at     timestamptz default now()
);

-- 同一用户下，同名歌曲只存一份（upsert 用得到这个唯一约束）。
create unique index if not exists ppt_user_songs_user_title_uniq
  on public.ppt_user_songs (user_id, lower(title));

create index if not exists ppt_user_songs_user_idx
  on public.ppt_user_songs (user_id);

-- ── 3) 行级安全：用户只能读写自己名下的歌 ────────────────────────────────────
alter table public.ppt_user_songs enable row level security;

drop policy if exists "user_songs_select" on public.ppt_user_songs;
drop policy if exists "user_songs_insert" on public.ppt_user_songs;
drop policy if exists "user_songs_update" on public.ppt_user_songs;
drop policy if exists "user_songs_delete" on public.ppt_user_songs;

create policy "user_songs_select" on public.ppt_user_songs
  for select using (auth.uid() = user_id);
create policy "user_songs_insert" on public.ppt_user_songs
  for insert with check (auth.uid() = user_id);
create policy "user_songs_update" on public.ppt_user_songs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_songs_delete" on public.ppt_user_songs
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.ppt_user_songs to authenticated;

-- ── 4)（可选）收紧社区贡献写入：仅登录用户可贡献精修版 ─────────────────────
-- 共享表默认 anon 也能写（见 supabase_ppt_library.sql）。若要求「贡献需登录」，
-- 可把 insert/update 策略改为仅 authenticated。这里保持原状以兼容游客模式。
