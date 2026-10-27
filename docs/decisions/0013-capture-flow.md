# 0013. Capture flow

## Context

The owner adds records from a phone, often on a weak connection. Losing a record or
a photo, or saving the same record twice, is the worst outcome in Phase 1.

## Decision

- The record ID is generated in the browser, and the draft row is created on the
  server before the first file is uploaded, so an upload is never orphaned and
  saving twice cannot duplicate.
- Each file takes three steps: ask the server for a signed upload address, upload
  with progress, then register it on the record. The server recomputes the path and
  position and the database enforces the limits again.
- Photos are scaled to 1600 px and re-encoded as JPEG in the browser (fixes
  orientation, drops EXIF and GPS). Videos are sent as they are, after checking
  type, size and duration (up to 2 minutes).
- A failed upload is retried up to three times with growing waits while the failure
  may be temporary. After that the item shows "Reintentar" and keeps its file.
- What was typed is kept in local storage until the record is saved.
- "Guardar y seguir con otro disco" needs at least one uploaded photo or video and
  no upload in progress. "Guardar como borrador y salir" saves without publishing.
- Colours and fonts are theme tokens in `globals.css`, so a new palette is one edit.

## Consequences

- Videos upload at full size; the 50 MB limit and the storage plan are still open.
- Recording in the app with a capped bitrate is a later improvement.
- Filling fields from photos or voice is not built; it needs an external service
  and cost approval first.
