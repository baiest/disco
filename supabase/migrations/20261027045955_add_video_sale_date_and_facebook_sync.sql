-- Photos become media (photos and videos), and records learn their sale date
-- and whether their Facebook post is out of date.

alter table public.record_photos rename to record_media;

alter table public.record_media
  add column kind text not null default 'photo',
  add column duration_seconds integer;

alter table public.record_media
  add constraint record_media_kind_check check (kind in ('photo', 'video')),
  -- A video lasts 1 to 120 seconds; a photo has no duration.
  add constraint record_media_duration_range check (
    (kind = 'photo' and duration_seconds is null)
    or (kind = 'video' and duration_seconds is not null and duration_seconds between 1 and 120)
  );

alter table public.record_media rename constraint record_photos_pkey to record_media_pkey;
alter table public.record_media rename constraint record_photos_position_range to record_media_position_range;
alter table public.record_media rename constraint record_photos_record_position_key to record_media_record_position_key;
alter table public.record_media rename constraint record_photos_storage_path_key to record_media_storage_path_key;
alter table public.record_media rename constraint record_photos_path_matches_owner to record_media_path_matches_owner;
alter table public.record_media rename constraint record_photos_record_owner_fkey to record_media_record_owner_fkey;

alter policy record_photos_select_own on public.record_media rename to record_media_select_own;
alter policy record_photos_insert_own on public.record_media rename to record_media_insert_own;
alter policy record_photos_update_own on public.record_media rename to record_media_update_own;
alter policy record_photos_delete_own on public.record_media rename to record_media_delete_own;

alter table public.records
  add column sold_at timestamptz,
  add column facebook_posted_at timestamptz,
  add column facebook_needs_update boolean not null default false;

-- A record holds at most 2 videos. The record row is locked first so two
-- simultaneous uploads cannot both slip past the count.
create function public.record_media_limit_videos() returns trigger
language plpgsql
as $$
begin
  if new.kind = 'video' then
    perform 1 from public.records where id = new.record_id for update;
    if (select count(*) from public.record_media
        where record_id = new.record_id and kind = 'video' and id <> new.id) >= 2 then
      raise exception 'a record can have at most 2 videos' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create trigger record_media_limit_videos
before insert or update of kind, record_id on public.record_media
for each row execute function public.record_media_limit_videos();

-- A published record keeps at least one photo or video.
drop trigger record_photos_keep_one on public.record_media;
drop function public.record_photos_keep_one();

create function public.record_media_keep_one() returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.records where id = old.record_id and status <> 'draft')
     and not exists (select 1 from public.record_media where record_id = old.record_id and id <> old.id) then
    raise exception 'a published record needs at least one photo or video' using errcode = '23514';
  end if;
  return old;
end
$$;

create trigger record_media_keep_one
before delete on public.record_media
for each row execute function public.record_media_keep_one();

create or replace function public.records_enforce_rules() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.owner_id <> old.owner_id then
    raise exception 'the owner cannot change' using errcode = '23514';
  end if;

  if new.status <> 'draft' and not exists (select 1 from public.record_media where record_id = new.id) then
    raise exception 'a record needs at least one photo or video to be published' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.status = 'draft' and new.status in ('sold', 'unavailable') then
    raise exception 'publish it first: a draft can only become available' using errcode = '23514';
  end if;

  -- The sale date is managed here, never by the client.
  if new.status <> 'sold' then
    new.sold_at := null;
  elsif tg_op = 'INSERT' or old.status <> 'sold' then
    new.sold_at := now();
  else
    new.sold_at := old.sold_at;
  end if;

  -- A record already posted on Facebook whose status changes needs its post updated,
  -- unless the same change posts it anew.
  if tg_op = 'UPDATE' and old.facebook_posted_at is not null
     and new.status <> old.status
     and new.facebook_posted_at is not distinct from old.facebook_posted_at then
    new.facebook_needs_update := true;
  end if;

  return new;
end
$$;

-- The bucket keeps its id, now holding videos too: up to 50 MB per file.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'],
    file_size_limit = 52428800
where id = 'record-photos';
