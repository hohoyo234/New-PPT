-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 共享歌库 (catalog) + 防爬虫歌词访问                      ║
-- ║  目标（防爬虫，非"藏词"）：                                                 ║
-- ║   · 所有人都能看到「歌名」(公开视图 ppt_catalog_public)。                   ║
-- ║   · 歌词不再打包进前端 JS，也不允许任何人 `select *` 批量拉取整库歌词。     ║
-- ║   · 但任何人（含访客）都能「一首一首地」取词——只能走两个函数：             ║
-- ║       ppt_get_lyrics(歌名)      取单首歌词（AUTO 自动填词用）              ║
-- ║       ppt_search_lyrics(关键词) 按歌名/制作人/一句歌词搜索，结果封顶       ║
-- ║     这样把"下载一个文件就拿到全部"变成"707 次可被 Supabase 限流/封禁的请求"。║
-- ║   · 只有管理员能写入整库（上传歌库）。                                     ║
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

-- 5) 完整表的 RLS：原表只有【管理员】能直接 SELECT（用于上传/核对/管理）。
--    普通人、访客一律拿不到 `select *` 批量下载整库歌词的能力——他们只能走第 7 节
--    的两个函数「一首一首」取词。只有管理员能写。
alter table public.ppt_catalog enable row level security;
drop policy if exists catalog_read_full on public.ppt_catalog;   -- 旧策略名，清掉
drop policy if exists catalog_admin_read on public.ppt_catalog;
create policy catalog_admin_read on public.ppt_catalog for select
  using (public.ppt_is_admin());
drop policy if exists catalog_admin_write on public.ppt_catalog;
create policy catalog_admin_write on public.ppt_catalog for all
  using (public.ppt_is_admin()) with check (public.ppt_is_admin());
grant select, insert, update, delete on public.ppt_catalog to authenticated;
revoke all on public.ppt_catalog from anon;   -- 匿名连原表都碰不到（防批量拉取）

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

-- 7) 防爬虫取词函数（所有人可调用，但每次只吐一首 / 一批结果，封顶）。
--    以定义者（owner）权限运行，绕过第 5 节的 RLS，从而对所有人可用；但因为原表本身
--    不可被匿名/普通用户 select，唯一取词入口就是这两个函数——把「下载一个文件拿到
--    全部」变成「707 次可被 Supabase 平台限流/封禁的请求」。search_path 锁死防注入。

-- 7a) 取单首歌词（AUTO/手动 自动填词用）：按歌名（忽略大小写/首尾空格）取，最多 1 首。
create or replace function public.ppt_get_lyrics(p_title text)
returns table (
  title text, title_sc text, english_title text, producer text, composer text,
  lyricist text, singer text, publication text, "key" text,
  lyrics text, lyrics_sc text, english_lyrics text, bg jsonb
)
language sql stable security definer set search_path = public as $$
  select title, title_sc, english_title, producer, composer, lyricist, singer,
         publication, "key", lyrics, lyrics_sc, english_lyrics, bg
  from public.ppt_catalog
  where p_title is not null and btrim(p_title) <> ''
    and lower(btrim(title)) = lower(btrim(p_title))
  limit 1;
$$;
revoke all on function public.ppt_get_lyrics(text) from public;
grant execute on function public.ppt_get_lyrics(text) to anon, authenticated;

-- 7b) 按 歌名 / 制作人 / 一句歌词 搜索：只返回【歌名+元数据】命中列表（不含歌词正文，
--     防止靠搜索批量套词），结果封顶 30 条。用户选中某首后再用 7a 取该首歌词。
create or replace function public.ppt_search_lyrics(p_query text, p_limit int default 20)
returns table (
  title text, title_sc text, english_title text, producer text, has_lyrics boolean
)
language sql stable security definer set search_path = public as $$
  select title, title_sc, english_title, producer,
         (length(coalesce(lyrics,'') || coalesce(lyrics_sc,'') || coalesce(english_lyrics,'')) > 0) as has_lyrics
  from public.ppt_catalog
  where p_query is not null and btrim(p_query) <> '' and (
       title           ilike '%'||p_query||'%'
    or title_sc        ilike '%'||p_query||'%'
    or english_title   ilike '%'||p_query||'%'
    or producer        ilike '%'||p_query||'%'
    or composer        ilike '%'||p_query||'%'
    or lyricist        ilike '%'||p_query||'%'
    or lyrics          ilike '%'||p_query||'%'
    or lyrics_sc       ilike '%'||p_query||'%'
    or english_lyrics  ilike '%'||p_query||'%'
  )
  order by case
    when lower(btrim(title)) = lower(btrim(p_query))
      or lower(btrim(title_sc)) = lower(btrim(p_query)) then 0
    when title ilike '%'||p_query||'%' or title_sc ilike '%'||p_query||'%' then 1
    else 2 end, title
  limit least(greatest(coalesce(p_limit, 20), 1), 30);
$$;
revoke all on function public.ppt_search_lyrics(text, int) from public;
grant execute on function public.ppt_search_lyrics(text, int) to anon, authenticated;

-- 用法：
--   浏览歌名（所有人）        → 查视图 ppt_catalog_public（只有歌名，无歌词）
--   搜索 歌名/制作人/一句歌词 → select * from ppt_search_lyrics('渴慕');   -- 返回命中歌名列表
--   取某首歌词（自动填词）    → select * from ppt_get_lyrics('我真渴望與祢相遇');
--   管理员上传/核对整库       → select ... from ppt_catalog（仅管理员，走 App「管理」面板）
--   注：ppt_lyric_viewers 白名单在本「防爬虫」模型下已非取词门槛（人人可一首首取词），
--       保留仅为兼容旧 AdminPanel UI，可日后删除。
