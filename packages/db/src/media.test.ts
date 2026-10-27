import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertMedia, insertRecord } from "./harness/db";

describe.skipIf(databaseUrl() === null)("record_media table", () => {
  it("requires the storage path to live under the owner and record folders", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, user, `${randomUUID()}/${id}/x.jpg`],
      );
      expect(error).toMatch(/record_media_path_matches_owner/);
    }));

  it("allows at most 8 photos per record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 8 });
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position) values ($1, $2, $3, 8)",
        [id, user, `${user}/${id}/ninth.jpg`],
      );
      expect(error).toMatch(/record_media_position_range/);
    }));

  it("does not allow two photos in the same position", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1 });
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, user, `${user}/${id}/again.jpg`],
      );
      expect(error).toMatch(/record_media_record_position_key/);
    }));

  it("lets two photos swap positions inside one transaction", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const first = await insertMedia(db, user, id, 0);
      const second = await insertMedia(db, user, id, 1);
      await db.query("set constraints record_media_record_position_key deferred");
      await db.query("update public.record_media set position = 1 where id = $1", [first]);
      await db.query("update public.record_media set position = 0 where id = $1", [second]);
      await db.query("set constraints record_media_record_position_key immediate");
      const { rows } = await db.query("select id, position from public.record_media where record_id = $1 order by position", [id]);
      expect(rows.map((row: { id: string }) => row.id)).toEqual([second, first]);
    }));

  it("must belong to the same owner as its record", () =>
    inTransaction(async (db) => {
      const owner = await db.newUser();
      const other = await db.newUser();
      const id = await insertRecord(db, owner);
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, other, `${other}/${id}/x.jpg`],
      );
      expect(error).toMatch(/record_media_record_owner_fkey/);
    }));

  it("refuses to delete the last photo of a published record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1, status: "available" });
      await db.asAdmin();
      const error = await db.fail("delete from public.record_media where record_id = $1", [id]);
      expect(error).toMatch(/at least one photo/);
    }));

  it("allows deleting a photo when another one remains", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 2, status: "available" });
      await db.asAdmin();
      const { rowCount } = await db.query("delete from public.record_media where record_id = $1 and position = 1", [id]);
      expect(rowCount).toBe(1);
    }));

  it("allows deleting every photo of a draft", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 2 });
      await db.asAdmin();
      const { rowCount } = await db.query("delete from public.record_media where record_id = $1", [id]);
      expect(rowCount).toBe(2);
    }));

  it("keeps photos as the default kind", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await insertMedia(db, user, id, 0);
      const { rows } = await db.query("select kind, duration_seconds from public.record_media where record_id = $1", [id]);
      expect(rows[0]).toMatchObject({ kind: "photo", duration_seconds: null });
    }));

  it("accepts a video up to two minutes", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const video = await insertMedia(db, user, id, 0, "video");
      await db.query("update public.record_media set duration_seconds = 120 where id = $1", [video]);
      const { rows } = await db.query("select duration_seconds from public.record_media where id = $1", [video]);
      expect(rows[0]).toMatchObject({ duration_seconds: 120 });
    }));

  it.each([0, 121, null])("rejects a video with duration %s", (duration) =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position, kind, duration_seconds) values ($1, $2, $3, 0, 'video', $4)",
        [id, user, `${user}/${id}/v.mp4`, duration],
      );
      expect(error).toMatch(/record_media_duration_range/);
    }));

  it("rejects a duration on a photo", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position, kind, duration_seconds) values ($1, $2, $3, 0, 'photo', 10)",
        [id, user, `${user}/${id}/p.jpg`],
      );
      expect(error).toMatch(/record_media_duration_range/);
    }));

  it("rejects a kind other than photo or video", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position, kind) values ($1, $2, $3, 0, 'audio')",
        [id, user, `${user}/${id}/a.mp3`],
      );
      expect(error).toMatch(/record_media_(kind_check|duration_range)/);
    }));

  it("allows at most two videos per record, and photos do not count", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 3 });
      await insertMedia(db, user, id, 3, "video");
      await insertMedia(db, user, id, 4, "video");
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position, kind, duration_seconds) values ($1, $2, $3, 5, 'video', 20)",
        [id, user, `${user}/${id}/third.mp4`],
      );
      expect(error).toMatch(/at most 2 videos/);
      await insertMedia(db, user, id, 5, "photo");
    }));

  it("counts photos and videos together in the limit of 8", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 7 });
      await insertMedia(db, user, id, 7, "video");
      const error = await db.fail(
        "insert into public.record_media (record_id, owner_id, storage_path, position) values ($1, $2, $3, 8)",
        [id, user, `${user}/${id}/ninth.jpg`],
      );
      expect(error).toMatch(/record_media_position_range/);
    }));

  it("lets a record with only a video be published", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await insertMedia(db, user, id, 0, "video");
      await db.query("update public.records set status = 'available' where id = $1", [id]);
      const { rows } = await db.query("select status from public.records where id = $1", [id]);
      expect(rows[0]).toMatchObject({ status: "available" });
    }));

  it("refuses to delete the last video of a published record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await insertMedia(db, user, id, 0, "video");
      await db.query("update public.records set status = 'available' where id = $1", [id]);
      const error = await db.fail("delete from public.record_media where record_id = $1", [id]);
      expect(error).toMatch(/at least one photo or video/);
    }));
});
