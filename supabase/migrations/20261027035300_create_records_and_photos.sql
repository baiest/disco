-- Phase 1: records and their photos.
-- The same rules also live in packages/domain; they are repeated here so a bug
-- in application code can never leave the database in an invalid state.

create type public.record_status as enum ('draft', 'available', 'sold', 'unavailable');

create table public.records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text,
  artist text,
  price_cop integer,
  status public.record_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint records_price_cop_range check (price_cop is null or (price_cop >= 0 and price_cop <= 2000000000)),
  constraint records_title_length check (char_length(title) <= 200),
  constraint records_artist_length check (char_length(artist) <= 200),
  constraint records_notes_length check (char_length(notes) <= 2000),
  constraint records_id_owner_key unique (id, owner_id)
);

create index records_owner_updated_idx on public.records (owner_id, updated_at desc) where deleted_at is null;

create table public.record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null,
  owner_id uuid not null default auth.uid(),
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- A record holds at most 8 photos: positions 0..7, each used once.
  constraint record_photos_position_range check (position >= 0 and position < 8),
  constraint record_photos_record_position_key unique (record_id, position) deferrable initially immediate,
  constraint record_photos_storage_path_key unique (storage_path),
  constraint record_photos_path_matches_owner
    check (starts_with(storage_path, owner_id::text || '/' || record_id::text || '/')),
  -- The photo owner always equals the record owner.
  constraint record_photos_record_owner_fkey
    foreign key (record_id, owner_id) references public.records (id, owner_id) on delete cascade
);

create function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger records_set_updated_at
before update on public.records
for each row execute function public.set_updated_at();

create function public.records_enforce_rules() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.owner_id <> old.owner_id then
    raise exception 'the owner cannot change' using errcode = '23514';
  end if;

  if new.status <> 'draft' and not exists (select 1 from public.record_photos where record_id = new.id) then
    raise exception 'a record needs at least one photo to be published' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.status = 'draft' and new.status in ('sold', 'unavailable') then
    raise exception 'publish it first: a draft can only become available' using errcode = '23514';
  end if;

  return new;
end
$$;

create trigger records_enforce_rules
before insert or update on public.records
for each row execute function public.records_enforce_rules();

create function public.record_photos_keep_one() returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.records where id = old.record_id and status <> 'draft')
     and not exists (select 1 from public.record_photos where record_id = old.record_id and id <> old.id) then
    raise exception 'a published record needs at least one photo' using errcode = '23514';
  end if;
  return old;
end
$$;

create trigger record_photos_keep_one
before delete on public.record_photos
for each row execute function public.record_photos_keep_one();

-- Row level security: each user only ever touches their own rows.
alter table public.records enable row level security;
alter table public.record_photos enable row level security;

revoke all on public.records, public.record_photos from anon, authenticated;
-- Records are never hard deleted through the API; deleting is setting deleted_at.
grant select, insert, update on public.records to authenticated;
grant select, insert, update, delete on public.record_photos to authenticated;

create policy records_select_own on public.records
  for select to authenticated using (owner_id = (select auth.uid()));
create policy records_insert_own on public.records
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy records_update_own on public.records
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy record_photos_select_own on public.record_photos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy record_photos_insert_own on public.record_photos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy record_photos_update_own on public.record_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy record_photos_delete_own on public.record_photos
  for delete to authenticated using (owner_id = (select auth.uid()));
