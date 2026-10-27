-- Search for the admin: ignores accents and case, matches partial words in any
-- order, tolerates small typos, and ranks title above artist above notes.
-- It runs with the caller's rights, so row level security still applies.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create function public.normalize_search_text(p_text text) returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')))
$$;

create function public.search_records(
  p_query text default '',
  p_filter text default 'all',
  p_limit integer default 50
) returns table (
  id uuid,
  title text,
  artist text,
  price_cop integer,
  status public.record_status,
  notes text,
  sold_at timestamptz,
  facebook_posted_at timestamptz,
  facebook_needs_update boolean,
  updated_at timestamptz,
  media_count integer,
  first_media_path text,
  rank real,
  is_close_match boolean
)
language plpgsql stable
set search_path = ''
as $$
declare
  v_tokens text[];
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if p_filter is null or p_filter not in ('all', 'available', 'sold', 'no_price', 'not_on_facebook') then
    raise exception 'unknown filter: %', p_filter using errcode = '22023';
  end if;

  -- Words made only of letters and digits, so no symbol can act as a LIKE wildcard.
  select coalesce(array_agg(t.token), '{}') into v_tokens
  from regexp_split_to_table(public.normalize_search_text(p_query), '[^a-z0-9]+') as t(token)
  where t.token <> '';

  return query
  select
    r.id, r.title, r.artist, r.price_cop, r.status, r.notes,
    r.sold_at, r.facebook_posted_at, r.facebook_needs_update, r.updated_at,
    (select count(*)::integer from public.record_media m where m.record_id = r.id),
    (select m.storage_path from public.record_media m where m.record_id = r.id order by m.position limit 1),
    s.score::real,
    s.is_close
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
    and s.all_match
    and (
      p_filter = 'all'
      or (p_filter = 'available' and r.status = 'available')
      or (p_filter = 'sold' and r.status = 'sold')
      or (p_filter = 'no_price' and r.price_cop is null)
      or (p_filter = 'not_on_facebook' and r.status = 'available' and r.facebook_posted_at is null)
    )
  order by
    case when cardinality(v_tokens) = 0 then 0 else s.score end desc,
    r.updated_at desc
  limit v_limit;
end
$$;

revoke all on function public.normalize_search_text(text) from public, anon;
revoke all on function public.search_records(text, text, integer) from public, anon;
grant execute on function public.normalize_search_text(text) to authenticated, service_role;
grant execute on function public.search_records(text, text, integer) to authenticated, service_role;
