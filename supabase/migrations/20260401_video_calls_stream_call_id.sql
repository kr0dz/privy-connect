alter table if exists public.video_calls
  add column if not exists stream_call_id text;

create index if not exists video_calls_stream_call_id_idx
  on public.video_calls (stream_call_id);
