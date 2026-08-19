-- 계층형 시각 태스크 매니저 — 서버 스키마
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 설계 메모
--  · 앱의 도메인 모델(src/lib/types.ts)을 그대로 옮긴다. 필드명은 앱이 camelCase,
--    Postgres 관례는 snake_case 라서 어댑터(src/lib/storage/supabase.ts)가 한 곳에서 변환한다.
--  · 모든 행이 user_id 를 가지고 RLS 로 격리된다. 다른 사람 데이터는 쿼리로도 보이지 않는다.
--  · updated_at 을 실어 보내 기기 간 병합에서 나중 것이 이기게 한다 (last-write-wins).
--  · 삭제는 tombstone 없이 실제 삭제다. 지운 기기가 서버에서도 지우므로,
--    다른 기기는 다음 동기화에서 그 행이 사라진 것을 보고 따라 지운다.
--
-- 타입 선택 이유
--  · id 는 uuid 가 아니라 text 다. newId() 는 crypto.randomUUID() 가 없는 환경에서
--    UUID 가 아닌 문자열로 물러나고, 남이 내보낸 JSON 을 가져올 수도 있다.
--    저장소가 id 형식을 강제하면 그런 데이터가 통째로 거부된다.
--  · 시각 필드도 timestamptz 가 아니라 text 다. 앱은 이 값을 문자열로 비교하는데,
--    Postgres 를 거치면 "...Z" 가 "+00:00" 으로 바뀌어 사전순 비교가 어긋난다.
--    앱이 만든 ISO 문자열을 글자 그대로 왕복시키는 편이 안전하다.
--  · due_date 만 date 다. "YYYY-MM-DD" 로컬 날짜라 타임존 변환 대상이 아니고,
--    date 타입은 그 형식 그대로 돌려준다. (timestamptz 로 두면 하루가 밀린다.)

create table if not exists public.projects (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null check (status in ('todo', 'in_progress', 'done')),
  priority    text not null check (priority in ('high', 'medium', 'low')),
  due_date    date,
  color       text not null,
  sort_order  integer not null default 0,
  created_at  text not null,
  updated_at  text not null
);

create table if not exists public.tasks (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_id   text not null references public.projects (id) on delete cascade,
  title        text not null,
  notes        text,
  status       text not null check (status in ('todo', 'in_progress', 'done')),
  due_date     date,
  -- null 은 "소속 큰 과업에서 상속" 을 뜻한다. 앱의 규칙을 그대로 옮긴 것이라
  -- 별도의 inherited 플래그를 두지 않는다.
  priority     text check (priority in ('high', 'medium', 'low')),
  sort_order   integer not null default 0,
  created_at   text not null,
  updated_at   text not null,
  completed_at text
);

create index if not exists projects_user_idx on public.projects (user_id);
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists tasks_project_idx on public.tasks (project_id);

-- ------------------------------------------------------------------
-- 행 수준 보안 — 이게 없으면 anon 키로 남의 데이터를 읽을 수 있다.
-- ------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- 실시간 반영 — 다른 기기에서 바뀐 내용이 새로고침 없이 들어온다.
-- ------------------------------------------------------------------

-- 이미 추가된 상태에서 다시 실행해도 오류가 나지 않도록 감싼다.
do $$
begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;
