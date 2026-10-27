# 0015. Record detail, status changes and undo

## Context

After finding a record in the inventory, the owner needs to see its photos, fix its
text and price, and mark it sold or unavailable in a few taps, with a way back.

## Decision

- Each copy has its own screen at `/admin/records/<id>`; the inventory card lists its
  copies as links.
- Status changes go through the domain rules (`changeStatus`): a draft can only be
  published, and needs a photo or video. The server re-checks everything.
- Targets are available, sold and unavailable. The server answers with the previous
  status and the screen offers "Deshacer" for 8 seconds; undo can also go back to draft.
- Text and price edits reuse the same input rules as the capture form.
- Photos and videos are shown through signed links that last one hour (the bucket is private).

## Consequences

- Undo is a normal status change, so the sale date is set by the database trigger each
  time a record becomes sold and keeps its last value otherwise.
- No delete yet; soft delete with undo, adding another copy and assisted Facebook
  publishing come in later tickets.
