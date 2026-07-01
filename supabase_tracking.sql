-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  敬拜 PPT 制作器 — 使用追踪表 (user tracking)                                ║
-- ║  在 Supabase SQL Editor 粘贴执行(幂等,可重复跑)。                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.ppt_usage_events (
  id            bigint generated always as identity primary key,
  ts            timestamptz,            -- client event time
  received_at   timestamptz default now(),
  session_id    text,                   -- one id per page load
  user_email    text default '',        -- email if signed in, else ''
  anon_id       text,                   -- per-device id for guests
  type          text,                   -- session_start|session_end|mode|export|search|login|song
  mode          text,                   -- auto|manual|library
  detail        text default '',        -- deck name / query / count …
  duration_sec  int default 0,          -- filled on session_end
  device        text,                   -- mobile|desktop
  browser       text,
  lang          text,
  referrer      text
);

create index if not exists ppt_usage_session_idx on public.ppt_usage_events (session_id);
create index if not exists ppt_usage_ts_idx      on public.ppt_usage_events (ts);

-- RLS: anyone (anon + signed-in) may INSERT their own events; nobody can read
-- them back from the client. You read the data in the Supabase dashboard / SQL.
alter table public.ppt_usage_events enable row level security;

drop policy if exists "usage_insert" on public.ppt_usage_events;
create policy "usage_insert" on public.ppt_usage_events
  for insert with check (true);

grant insert on public.ppt_usage_events to anon, authenticated;

-- Handy rollups you can run in the dashboard:
--   每个 session 的停留时长:
--   select session_id, user_email, min(ts) start, max(duration_sec) secs
--   from ppt_usage_events group by session_id, user_email order by start desc;
--   功能使用次数:
--   select type, count(*) from ppt_usage_events group by type order by 2 desc;
