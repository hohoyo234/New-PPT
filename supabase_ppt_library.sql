-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 云端共享歌库表                                            ║
-- ║  在你现有的 MCR Supabase 项目里运行(SQL Editor 粘贴执行即可)。            ║
-- ║  与 MCR 现有的表互不干扰,只是多加一张表。                                  ║
-- ║  访问模式:任何人可读;仅已登录用户可写(防止匿名者删/改整张社区库)。      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.ppt_song_library (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  english_title  text default '',
  producer       text default '',
  lyrics         text default '',
  english_lyrics text default '',
  bg             jsonb,                 -- 背景(含 AI 生成图 URL),跟着歌存
  updated_at     timestamptz default now()
);

-- 同名歌曲只存一份(按小写歌名去重),客户端按歌名合并。
create unique index if not exists ppt_song_library_title_uniq
  on public.ppt_song_library (lower(title));

-- 开启行级安全:任何人可读,仅已登录用户可写。
-- (anon key 是随前端公开发布的,若放开匿名写,任何人都能删/改整张社区库。)
alter table public.ppt_song_library enable row level security;

drop policy if exists "ppt_lib_read"   on public.ppt_song_library;
drop policy if exists "ppt_lib_insert" on public.ppt_song_library;
drop policy if exists "ppt_lib_update" on public.ppt_song_library;
drop policy if exists "ppt_lib_delete" on public.ppt_song_library;

-- 读:游客也要能搜到「社区精修版」。
create policy "ppt_lib_read"   on public.ppt_song_library for select using (true);
-- 写:仅限已登录用户(贡献精修版本来就要求登录,不影响功能)。
create policy "ppt_lib_insert" on public.ppt_song_library for insert to authenticated with check (true);
create policy "ppt_lib_update" on public.ppt_song_library for update to authenticated using (true) with check (true);
create policy "ppt_lib_delete" on public.ppt_song_library for delete to authenticated using (true);

-- 表级权限:匿名角色只读;登录用户可读写。
grant select                         on public.ppt_song_library to anon;
grant select, insert, update, delete on public.ppt_song_library to authenticated;
