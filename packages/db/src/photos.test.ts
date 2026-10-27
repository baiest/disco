import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertPhoto, insertRecord } from "./harness/db";

describe.skipIf(databaseUrl() === null)("record_photos table", () => {
  it("requires the storage path to live under the owner and record folders", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const error = await db.fail(
        "insert into public.record_photos (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, user, `${randomUUID()}/${id}/x.jpg`],
      );
      expect(error).toMatch(/record_photos_path_matches_owner/);
    }));

  it("allows at most 8 photos per record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 8 });
      const error = await db.fail(
        "insert into public.record_photos (record_id, owner_id, storage_path, position) values ($1, $2, $3, 8)",
        [id, user, `${user}/${id}/ninth.jpg`],
      );
      expect(error).toMatch(/record_photos_position_range/);
    }));

  it("does not allow two photos in the same position", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1 });
      const error = await db.fail(
        "insert into public.record_photos (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, user, `${user}/${id}/again.jpg`],
      );
      expect(error).toMatch(/record_photos_record_position_key/);
    }));

  it("lets two photos swap positions inside one transaction", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      const first = await insertPhoto(db, user, id, 0);
      const second = await insertPhoto(db, user, id, 1);
      await db.query("set constraints record_photos_record_position_key deferred");
      await db.query("update public.record_photos set position = 1 where id = $1", [first]);
      await db.query("update public.record_photos set position = 0 where id = $1", [second]);
      await db.query("set constraints record_photos_record_position_key immediate");
      const { rows } = await db.query("select id, position from public.record_photos where record_id = $1 order by position", [id]);
      expect(rows.map((row: { id: string }) => row.id)).toEqual([second, first]);
    }));

  it("must belong to the same owner as its record", () =>
    inTransaction(async (db) => {
      const owner = await db.newUser();
      const other = await db.newUser();
      const id = await insertRecord(db, owner);
      const error = await db.fail(
        "insert into public.record_photos (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, other, `${other}/${id}/x.jpg`],
      );
      expect(error).toMatch(/record_photos_record_owner_fkey/);
    }));

  it("refuses to delete the last photo of a published record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1, status: "available" });
      await db.asAdmin();
      const error = await db.fail("delete from public.record_photos where record_id = $1", [id]);
      expect(error).toMatch(/at least one photo/);
    }));

  it("allows deleting a photo when another one remains", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 2, status: "available" });
      await db.asAdmin();
      const { rowCount } = await db.query("delete from public.record_photos where record_id = $1 and position = 1", [id]);
      expect(rowCount).toBe(1);
    }));

  it("allows deleting every photo of a draft", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 2 });
      await db.asAdmin();
      const { rowCount } = await db.query("delete from public.record_photos where record_id = $1", [id]);
      expect(rowCount).toBe(2);
    }));
});
