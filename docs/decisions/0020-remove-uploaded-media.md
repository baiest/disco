# 0020. Removing uploaded media and restoring it after a reload

## Context

Files upload as soon as they are picked (0013), so the record already holds them before it is
saved. Two gaps followed: the X on a file only hid it on screen, leaving it uploaded and attached
to the record, and after a reload the form got its text back but not the files already uploaded.

## Decision

- The X on a file that already uploaded deletes it for real: its database row first (the database
  refuses to take the last file off a published record), then the stored file. If that fails, the
  file stays on screen and the owner is told in plain words.
- The X on a file still preparing or uploading cancels it; if it lands before the cancel is seen, it
  is deleted as soon as it lands. A failed file has nothing on the server and is just hidden.
- After a reload, the form asks the server for the files already attached to its draft (only while the
  record is still a draft) and shows them as uploaded, with fresh signed links.
- Uploading when the file is picked stays: a dead battery or a lost connection must not lose the photos
  already taken.

## Consequences

- A stored file whose row was deleted but whose removal failed is logged and stays in the bucket as
  an orphan; a cleanup job is not built.
- A file that uploaded but whose registration failed ("not uploaded") is also left in storage.
- An abandoned draft stays as a draft with its photos, on purpose.
