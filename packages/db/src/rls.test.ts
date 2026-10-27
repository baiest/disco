import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertPhoto, insertRecord } from "./harness/db";

describe.skipIf(databaseUrl() === null)("row level security", () => {
  it("shows each user only their own records", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const aliceRecord = await insertRecord(db, alice);
      await insertRecord(db, bob);

      await db.as("authenticated", alice);
      const seenByAlice = await db.query("select id from public.records");
      expect(seenByAlice.rows).toEqual([{ id: aliceRecord }]);

      await db.as("authenticated", bob);
      const aliceFromBob = await db.query("select id from public.records where id = $1", [aliceRecord]);
      expect(aliceFromBob.rowCount).toBe(0);
    }));

  it("does not let a user update or soft delete someone else's record", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const id = await insertRecord(db, alice);

      await db.as("authenticated", bob);
      const update = await db.query("update public.records set notes = 'hacked' where id = $1", [id]);
      const softDelete = await db.query("update public.records set deleted_at = now() where id = $1", [id]);
      expect(update.rowCount).toBe(0);
      expect(softDelete.rowCount).toBe(0);
    }));

  it("does not let a user create a record for someone else", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      await db.as("authenticated", bob);
      const error = await db.fail("insert into public.records (owner_id) values ($1)", [alice]);
      expect(error).toMatch(/row-level security/);
    }));

  it("does not let a user hand a record to someone else", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const id = await insertRecord(db, alice);
      await db.as("authenticated", alice);
      const error = await db.fail("update public.records set owner_id = $2 where id = $1", [id, bob]);
      expect(error).toMatch(/owner cannot change|row-level security/);
    }));

  it("does not let a user attach photos to someone else's record", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const id = await insertRecord(db, alice);
      await db.as("authenticated", bob);
      const error = await db.fail(
        "insert into public.record_photos (record_id, owner_id, storage_path, position) values ($1, $2, $3, 0)",
        [id, bob, `${bob}/${id}/x.jpg`],
      );
      expect(error).toMatch(/foreign key|row-level security/);
    }));

  it("shows photos only to their owner", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const id = await insertRecord(db, alice);
      await insertPhoto(db, alice, id, 0);

      await db.as("authenticated", alice);
      expect((await db.query("select id from public.record_photos")).rowCount).toBe(1);
      await db.as("authenticated", bob);
      expect((await db.query("select id from public.record_photos")).rowCount).toBe(0);
    }));

  it("lets the owner remove a photo of a draft but nobody else", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      const id = await insertRecord(db, alice);
      const photo = await insertPhoto(db, alice, id, 0);

      await db.as("authenticated", bob);
      expect((await db.query("delete from public.record_photos where id = $1", [photo])).rowCount).toBe(0);
      await db.as("authenticated", alice);
      expect((await db.query("delete from public.record_photos where id = $1", [photo])).rowCount).toBe(1);
    }));

  it("never hard deletes records through the API", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const id = await insertRecord(db, alice);
      await db.as("authenticated", alice);
      const error = await db.fail("delete from public.records where id = $1", [id]);
      expect(error).toMatch(/permission denied/);
    }));

  it("gives anonymous visitors no access at all", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      await insertRecord(db, alice);
      await db.as("anon");
      expect(await db.fail("select * from public.records")).toMatch(/permission denied/);
      expect(await db.fail("select * from public.record_photos")).toMatch(/permission denied/);
    }));
});
