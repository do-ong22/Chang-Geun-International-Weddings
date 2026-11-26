-- 초기 스키마
-- 공개 데이터(지역 평균, 월별 비용, 추가금 목록)는 누구나 읽고, 쓰기는 관리자(대시보드/서비스 키)만 한다.
-- 커플 데이터는 RLS로 그 커플의 멤버만 접근한다.

-- ───────────── 공개 데이터 ─────────────

create table public.region_price (
  id bigint generated always as identity primary key,
  -- packages/core REGIONS 코드 또는 'national'
  region_code text not null check (region_code in (
    'national', 'seoul-gangnam', 'seoul-other', 'gyeonggi', 'incheon', 'busan', 'daegu',
    'jeonnam-gwangju', 'daejeon', 'ulsan', 'gangwon', 'chungcheong', 'jeonbuk', 'gyeongsang', 'jeju'
  )),
  item text not null check (item in ('studio', 'dress', 'makeup', 'hall_meal_per_person', 'hall_rental')),
  median integer not null check (median > 0),
  sample_count integer not null check (sample_count >= 0),  -- 조사 표본 수. 적으면 화면에 표시한다
  based_on text not null check (based_on ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  unique (region_code, item, based_on)
);

create table public.period_price (
  id bigint generated always as identity primary key,
  month smallint not null check (month between 1 and 12),
  average_total integer not null check (average_total > 0),
  based_on text not null check (based_on ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  unique (month, based_on)
);

create table public.extra_fee (
  id text primary key,
  category text not null check (category in ('studio', 'dress', 'makeup', 'hall')),
  name text not null,
  typical_amount integer not null check (typical_amount >= 0)
);

alter table public.region_price enable row level security;
alter table public.period_price enable row level security;
alter table public.extra_fee enable row level security;

create policy "공개 데이터 읽기" on public.region_price for select to anon, authenticated using (true);
create policy "공개 데이터 읽기" on public.period_price for select to anon, authenticated using (true);
create policy "공개 데이터 읽기" on public.extra_fee for select to anon, authenticated using (true);

-- ───────────── 커플 데이터 ─────────────

create table public.couple (
  id uuid primary key default gen_random_uuid(),
  wedding_date date,
  -- packages/core REGIONS와 같은 목록
  region_code text check (region_code in (
    'seoul-gangnam', 'seoul-other', 'gyeonggi', 'incheon', 'busan', 'daegu', 'jeonnam-gwangju',
    'daejeon', 'ulsan', 'gangwon', 'chungcheong', 'jeonbuk', 'gyeongsang', 'jeju'
  )),
  expected_guests integer check (expected_guests >= 0),
  budget integer check (budget >= 0),
  created_at timestamptz not null default now()
);

create table public.couple_member (
  couple_id uuid not null references public.couple (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (couple_id, user_id)
);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couple (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  assignee uuid references auth.users (id) on delete set null,
  done boolean not null default false
);

create table public.consultation (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couple (id) on delete cascade,
  category text not null check (category in ('studio', 'dress', 'makeup', 'hall')),
  vendor_name text not null check (char_length(vendor_name) between 1 and 100),
  source text not null check (source in ('direct', 'agency')),
  consulted_on date,
  amount integer check (amount >= 0),                     -- 스드메 견적
  meal_per_person integer check (meal_per_person >= 0),   -- 웨딩홀
  rental integer check (rental >= 0),                     -- 웨딩홀
  guaranteed_guests integer check (guaranteed_guests >= 0),
  included_fee_ids text[] not null default '{}' check (cardinality(included_fee_ids) <= 50),
  memo text check (char_length(memo) <= 2000),
  created_at timestamptz not null default now()
);

-- 한 사용자는 커플 하나. create_couple 동시 호출에서도 DB가 막는다.
create unique index on public.couple_member (user_id);
create index on public.task (couple_id);
create index on public.consultation (couple_id);

-- 현재 사용자가 커플 멤버인지. RLS 정책에서 couple_member를 다시 RLS로 거치지 않도록 security definer.
create function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.couple_member
    where couple_id = target_couple_id and user_id = (select auth.uid())
  );
$$;

-- 담당자로 지정할 사용자가 같은 커플 멤버인지
create function public.is_user_in_couple(target_couple_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_couple_member(target_couple_id) and exists (
    select 1 from public.couple_member
    where couple_id = target_couple_id and user_id = target_user_id
  );
$$;

-- 계정 삭제로 마지막 멤버가 사라지면 커플과 그 데이터(task, consultation)도 지운다.
-- (커플 나가기 기능은 아직 없다. 만들 때 이 트리거가 같이 정리한다.) 개인 데이터를 남기지 않는다.
create function public.delete_empty_couple()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.couple_member where couple_id = old.couple_id) then
    delete from public.couple where id = old.couple_id;
  end if;
  return null;
end;
$$;

create trigger couple_member_deleted
  after delete on public.couple_member
  for each row execute function public.delete_empty_couple();

-- 커플 생성은 이 함수로만 한다. couple/couple_member에 직접 insert 정책을 열면
-- 남의 커플에 자기를 멤버로 추가할 수 있기 때문이다.
create function public.create_couple(
  p_wedding_date date,
  p_region_code text,
  p_expected_guests integer,
  p_budget integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  -- 친절한 오류 메시지용. 실제 제한은 couple_member(user_id) unique 인덱스가 건다.
  if exists (select 1 from public.couple_member where user_id = (select auth.uid())) then
    raise exception 'already in a couple';
  end if;
  insert into public.couple (wedding_date, region_code, expected_guests, budget)
  values (p_wedding_date, p_region_code, p_expected_guests, p_budget)
  returning id into new_id;
  insert into public.couple_member (couple_id, user_id) values (new_id, (select auth.uid()));
  return new_id;
end;
$$;

revoke execute on function public.create_couple(date, text, integer, integer) from public, anon;
grant execute on function public.create_couple(date, text, integer, integer) to authenticated;
revoke execute on function public.is_couple_member(uuid) from public, anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
revoke execute on function public.is_user_in_couple(uuid, uuid) from public, anon;
grant execute on function public.is_user_in_couple(uuid, uuid) to authenticated;
revoke execute on function public.delete_empty_couple() from public, anon, authenticated;

alter table public.couple enable row level security;
alter table public.couple_member enable row level security;
alter table public.task enable row level security;
alter table public.consultation enable row level security;

create policy "멤버만 읽기" on public.couple for select to authenticated
  using (public.is_couple_member(id));
create policy "멤버만 수정" on public.couple for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));

-- 멤버 추가는 create_couple(과 이후 만들 초대 수락 함수)로만 한다.
create policy "같은 커플 멤버 보기" on public.couple_member for select to authenticated
  using (public.is_couple_member(couple_id));

create policy "멤버만 접근" on public.task for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (
    public.is_couple_member(couple_id)
    and (assignee is null or public.is_user_in_couple(couple_id, assignee))
  );
create policy "멤버만 접근" on public.consultation for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
