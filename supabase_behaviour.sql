-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 行为追踪表 (web-user-behaviour)                          ║
-- ║  每个 session 每 ~30s(以及切到后台时) 写入一行，data 为整包行为 JSON。      ║
-- ║  在 Supabase SQL Editor 粘贴执行(幂等,可重复跑)。                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.ppt_behaviour (
  id            bigint generated always as identity primary key,
  received_at   timestamptz default now(),
  session_id    text,                 -- one id per page load
  anon_id       text,                 -- per-device id (guests + signed-in)
  user_email    text default '',      -- email if signed in, else ''
  started_at    timestamptz,          -- results.time.startTime
  ended_at      timestamptz,          -- results.time.currentTime (last flush)
  data          jsonb                 -- full userBehaviour payload + appEvents
);

create index if not exists ppt_behaviour_session_idx on public.ppt_behaviour (session_id);
create index if not exists ppt_behaviour_received_idx on public.ppt_behaviour (received_at);
-- GIN index makes the JSON queryable (e.g. clicks, appEvents).
create index if not exists ppt_behaviour_data_idx on public.ppt_behaviour using gin (data);

-- RLS: anyone (anon + signed-in) may INSERT; nobody reads back from the client.
-- You read the data in the Supabase dashboard / SQL editor.
alter table public.ppt_behaviour enable row level security;

drop policy if exists "behaviour_insert" on public.ppt_behaviour;
create policy "behaviour_insert" on public.ppt_behaviour
  for insert with check (true);

grant insert on public.ppt_behaviour to anon, authenticated;

-- Handy rollups:
--   会话数与停留时长:
--   select session_id, user_email, min(started_at) start,
--          max(ended_at) - min(started_at) as duration
--   from ppt_behaviour group by session_id, user_email order by start desc;
--   语义事件(导出/搜索…都折叠进 data->'appEvents'):
--   select ev->>0 as type, count(*) from ppt_behaviour,
--          jsonb_array_elements(data->'appEvents') ev group by 1 order by 2 desc;
--   点了哪些元素:
--   select cd->>2 as selector, count(*) from ppt_behaviour,
--          jsonb_array_elements(data->'clicks'->'clickDetails') cd group by 1 order by 2 desc;
