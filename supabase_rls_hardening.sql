-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  安全加固:锁死社区歌库的匿名写权限                                          ║
-- ║  问题:原策略允许 anon 角色 UPDATE/DELETE 任意行,而 anon key 是公开的,     ║
-- ║        任何人都能删/改整张社区精修库。此脚本改为「只有登录用户能写」。      ║
-- ║  在 Supabase SQL Editor 粘贴执行(幂等)。运行后游客仍能浏览,但改不了。    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 读:任何人可读(社区精修版对游客也要能搜到)——保持不变。
drop policy if exists "ppt_lib_read"   on public.ppt_song_library;
create policy "ppt_lib_read" on public.ppt_song_library
  for select using (true);

-- 写:仅限已登录用户(authenticated)。贡献精修版本来就要求登录,所以不影响功能。
drop policy if exists "ppt_lib_insert" on public.ppt_song_library;
drop policy if exists "ppt_lib_update" on public.ppt_song_library;
drop policy if exists "ppt_lib_delete" on public.ppt_song_library;

create policy "ppt_lib_insert" on public.ppt_song_library
  for insert to authenticated with check (true);
create policy "ppt_lib_update" on public.ppt_song_library
  for update to authenticated using (true) with check (true);
create policy "ppt_lib_delete" on public.ppt_song_library
  for delete to authenticated using (true);

-- 收回匿名角色的写权限(表级),保留其读权限。
revoke insert, update, delete on public.ppt_song_library from anon;
grant  select                on public.ppt_song_library to anon;
grant  select, insert, update, delete on public.ppt_song_library to authenticated;

-- 验证(运行后应只剩 read 允许 anon,写策略都是 {authenticated}):
--   select polname, roles, cmd from pg_policies where tablename='ppt_song_library';
