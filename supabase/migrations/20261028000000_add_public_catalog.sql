-- Public catalog: what a visitor without an account may see.
--
-- Visitors never get access to the tables. They call three functions that run with the owner's
-- rights and return only public columns of records that are available or sold and not deleted.
-- The price is shown only when the owner turned it on for that record. The storage bucket stays
-- private; a visitor may read only the files that belong to such a record.

alter table public.records
  add column show_price_public boolean not null default false;

-- The columns a visitor may see, for the list and for one record.
-- Every column is qualified with its table alias because the output names are also variables.
create function public.public_records(p_query text default '', p_limit integer default 60)
returns table (
  id uuid,
  title text,
  artist text,
  notes text,
  status public.record_status,
  price_cop integer,
  media_count integer,
  first_media_path text,
  is_close_match boolean,
  updated_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_tokens text[];
  v_limit integer := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  -- Words made only of letters and digits, so no symbol can act as a LIKE wildcard.
  select coalesce(array_agg(t.token), '{}') into v_tokens
  from regexp_split_to_table(public.normalize_search_text(p_query), '[^a-z0-9]+') as t(token)
  where t.token <> '';

  return query
  select
    r.id, r.title, r.artist, r.notes, r.status,
    case when r.show_price_public then r.price_cop end,
    (select count(*)::integer from public.record_media m where m.record_id = r.id),
    (select m.storage_path from public.record_media m where m.record_id = r.id order by m.position limit 1),
    s.is_close,
    r.updated_at
  from public.records r
  cross join lateral (
    select
      public.normalize_search_text(r.title) as n_title,
      public.normalize_search_text(r.artist) as n_artist,
      public.normalize_search_text(r.notes) as n_notes
  ) as norm
  cross join lateral (
    select
      coalesce(bool_and(greatest(x.exact_score, x.fuzzy_score) > 0), true) as all_match,
      coalesce(sum(greatest(x.exact_score, x.fuzzy_score)), 0) as score,
      coalesce(bool_or(x.exact_score = 0), false) as is_close
    from (
      select
        greatest(
          case when norm.n_title like '%' || w.word || '%' then 3.0::float8 else 0.0::float8 end,
          case when norm.n_artist like '%' || w.word || '%' then 2.0::float8 else 0.0::float8 end,
          case when norm.n_notes like '%' || w.word || '%' then 1.0::float8 else 0.0::float8 end
        ) as exact_score,
        -- Typos: only for words of 4+ letters, so short words do not match everything.
        case when length(w.word) >= 4 then
          greatest(
            case when extensions.word_similarity(w.word, norm.n_title) >= 0.4
                 then extensions.word_similarity(w.word, norm.n_title)::float8 * 3.0 else 0.0::float8 end,
            case when extensions.word_similarity(w.word, norm.n_artist) >= 0.4
                 then extensions.word_similarity(w.word, norm.n_artist)::float8 * 2.0 else 0.0::float8 end,
            case when extensions.word_similarity(w.word, norm.n_notes) >= 0.4
                 then extensions.word_similarity(w.word, norm.n_notes)::float8 else 0.0::float8 end
          )
        else 0.0::float8 end as fuzzy_score
      from unnest(v_tokens) as w(word)
    ) as x
  ) as s
  where r.deleted_at is null
    and r.status in ('available', 'sold')
    and s.all_match
  order by
    (r.status = 'available') desc,
    case when cardinality(v_tokens) = 0 then 0 else s.score end desc,
    r.updated_at desc
  limit v_limit;
end
$$;

create function public.public_record(p_id uuid)
returns table (
  id uuid,
  title text,
  artist text,
  notes text,
  status public.record_status,
  price_cop integer,
  media_count integer,
  first_media_path text,
  is_close_match boolean,
  updated_at timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select
    r.id, r.title, r.artist, r.notes, r.status,
    case when r.show_price_public then r.price_cop end,
    (select count(*)::integer from public.record_media m where m.record_id = r.id),
    (select m.storage_path from public.record_media m where m.record_id = r.id order by m.position limit 1),
    false,
    r.updated_at
  from public.records r
  where r.id = p_id
    and r.deleted_at is null
    and r.status in ('available', 'sold')
$$;

create function public.public_record_media(p_record_id uuid)
returns table (id uuid, kind text, storage_path text, "position" integer)
language sql stable security definer
set search_path = ''
as $$
  select m.id, m.kind, m.storage_path, m.position
  from public.record_media m
  join public.records r on r.id = m.record_id
  where m.record_id = p_record_id
    and r.deleted_at is null
    and r.status in ('available', 'sold')
  order by m.position
$$;

-- True when the stored file belongs to a record a visitor may see. The storage policy below calls it,
-- because a policy runs with the visitor's rights and the visitor cannot read the tables.
create function public.is_public_media_path(p_path text) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.record_media m
    join public.records r on r.id = m.record_id
    where m.storage_path = p_path
      and r.deleted_at is null
      and r.status in ('available', 'sold')
  )
$$;

create policy record_photos_objects_select_public on storage.objects
  for select to anon
  using (bucket_id = 'record-photos' and public.is_public_media_path(name));

revoke all on function public.public_records(text, integer) from public;
revoke all on function public.public_record(uuid) from public;
revoke all on function public.public_record_media(uuid) from public;
revoke all on function public.is_public_media_path(text) from public;
grant execute on function public.public_records(text, integer) to anon, authenticated, service_role;
grant execute on function public.public_record(uuid) to anon, authenticated, service_role;
grant execute on function public.public_record_media(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_media_path(text) to anon, authenticated, service_role;
