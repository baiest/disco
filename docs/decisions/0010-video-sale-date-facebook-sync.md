# 0010: Video, sale date and Facebook sync

Status: accepted

## Context

The owner's Facebook posts have several photos and sometimes a video of the record
spinning. He also wants to know whether a record is in stock or already sold, and
to keep Facebook in step with the app. His Facebook is a personal profile.

## Decision

- `record_photos` becomes `record_media` with `kind` (`photo` or `video`) and
  `duration_seconds`. A record holds at most 8 media in total (positions 0..7),
  at most 2 videos, and each video lasts 1 to 120 seconds. Publishing needs at least
  one photo or video, and a published record keeps at least one.
- The storage bucket keeps its id `record-photos` so nothing breaks if the earlier
  migration was already applied. It now also accepts `video/mp4`, `video/quicktime`
  and `video/webm`, with a 50 MB limit per file. Photos stay small because the phone
  resizes them before upload; the bucket cannot set a smaller limit for images.
- `records.sold_at` is set by the database when a record becomes sold and cleared
  when it stops being sold. The client cannot write it. It answers "when did I sell
  it" in search.
- `records.facebook_posted_at` and `records.facebook_needs_update`: when a record
  already posted changes status, the database flags its post as out of date, unless
  the same change posts it again. The owner clears the flag after updating the post.
- A personal Facebook profile cannot be posted to or edited by an app. Publishing is
  assisted: the app prepares the text and the media, the owner pastes and posts, and
  the app records it. Real automation would need a Facebook Page and the Meta API
  (Phase 3).

## Consequences

- Storage grows fast. As far as we know the free Supabase plan includes 1 GB and a
  50 MB file limit (check in the project). A 2-minute video at about 720p is roughly
  20 to 40 MB, so a few dozen videos fill it. Plan on the Pro plan or on another store
  for videos; all Supabase access goes through one module, so moving files is
  possible. Recording inside the app with a capped bitrate keeps videos under the
  limit; long gallery videos may have to be refused.
- The client reports video duration; the database only checks the range.
- Search by title, artist and notes, the copies summary and the public and private
  text split come in the next tickets.
