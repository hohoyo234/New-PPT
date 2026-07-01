-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 共享歌库 (catalog) + 歌词权限                            ║
-- ║  目标：所有人都能看到「歌名」，但只有管理员 + 白名单里的人能看到「歌词」。 ║
-- ║  在 Supabase SQL Editor 粘贴执行(幂等,可重复跑)。                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1) 完整歌库表（含歌词）。由管理员写入；普通人不能直接读这张表（RLS 挡住）。
create table if not exists public.ppt_catalog (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  title_sc      text default '',
  english_title text default '',
  producer      text default '',
  composer      text default '',
  lyricist      text default '',
  singer        text default '',
  publication   text default '',
  key           text default '',
  lyrics        text default '',
  lyrics_sc     text default '',
  english_lyrics text default '',
  bg            jsonb,
  updated_at    timestamptz default now()
);
create unique index if not exists ppt_catalog_title_uidx on public.ppt_catalog (title);

-- 2) 管理员判定：当前登录用户的邮箱是否在管理员名单里。
--    改管理员就改这里的三个邮箱。
create or replace function public.ppt_is_admin() returns boolean
  language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'rabbitshark.space@gmail.com',
    'hyy7010@gmail.com',
    'jzey805@gmail.com'
  );
$$;

-- 3) 歌词可见名单（管理员在 App 里增删；被加进来的邮箱登录后也能看歌词）。
create table if not exists public.ppt_lyric_viewers (
  email    text primary key,
  added_by text default '',
  added_at timestamptz default now()
);
alter table public.ppt_lyric_viewers enable row level security;
-- 管理员可增删查；此外允许登录用户查询「自己是否在名单里」（只读自己那行）。
drop policy if exists viewers_admin_all on public.ppt_lyric_viewers;
create policy viewers_admin_all on public.ppt_lyric_viewers for all
  using (public.ppt_is_admin()) with check (public.ppt_is_admin());
drop policy if exists viewers_read_self on public.ppt_lyric_viewers;
create policy viewers_read_self on public.ppt_lyric_viewers for select
  using (email = coalesce(auth.jwt() ->> 'email', ''));
grant select on public.ppt_lyric_viewers to anon, authenticated;
grant insert, update, delete on public.ppt_lyric_viewers to authenticated;

-- 4) 歌词可读判定：管理员 或 在白名单里。
create or replace function public.ppt_can_read_lyrics() returns boolean
  language sql stable as $$
  select public.ppt_is_admin() or exists (
    select 1 from public.ppt_lyric_viewers v
    where v.email = coalesce(auth.jwt() ->> 'email', '')
  );
$$;

-- 5) 完整表的 RLS：只有「能读歌词的人」才能 SELECT 整行；只有管理员能写。
alter table public.ppt_catalog enable row level security;
drop policy if exists catalog_read_full on public.ppt_catalog;
create policy catalog_read_full on public.ppt_catalog for select
  using (public.ppt_can_read_lyrics());
drop policy if exists catalog_admin_write on public.ppt_catalog;
create policy catalog_admin_write on public.ppt_catalog for all
  using (public.ppt_is_admin()) with check (public.ppt_is_admin());
grant select, insert, update, delete on public.ppt_catalog to authenticated;

-- 6) 公开视图：只暴露「歌名 / 元数据 / 是否有歌词」，不含任何歌词列。
--    视图以所有者权限运行，绕过基表 RLS，所以对所有人（含匿名）可见——但看不到歌词。
create or replace view public.ppt_catalog_public
  with (security_invoker = false) as
  select id, title, title_sc, english_title, producer, composer, lyricist,
         singer, publication, key,
         (length(coalesce(lyrics, '') || coalesce(lyrics_sc, '') || coalesce(english_lyrics, '')) > 0) as has_lyrics,
         updated_at
  from public.ppt_catalog;
grant select on public.ppt_catalog_public to anon, authenticated;

-- 用法：
--   非管理员/未白名单 → 查 ppt_catalog_public（只有歌名）
--   管理员/白名单     → 查 ppt_catalog（含歌词）
--   管理员加可见人    → insert into ppt_lyric_viewers(email) values ('someone@x.com');
