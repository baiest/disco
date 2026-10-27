import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertMedia, insertRecord } from "./harness/db";

describe.skipIf(databaseUrl() === null)("records table", () => {
  it("creates a draft owned by the caller with only defaults", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      const { rows } = await db.query("insert into public.records default values returning *");
      expect(rows[0]).toMatchObject({
        owner_id: user,
        status: "draft",
        title: null,
        artist: null,
        price_cop: null,
        notes: null,
        deleted_at: null,
      });
    }));

  it("accepts a client generated id so saving twice is the same record", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      const id = "6f1c2c3a-0000-4000-8000-000000000001";
      await db.query("insert into public.records (id) values ($1)", [id]);
      const error = await db.fail("insert into public.records (id) values ($1)", [id]);
      expect(error).toMatch(/duplicate key/);
    }));

  it.each([
    [-1, /records_price_cop_range/],
    [2_000_000_001, /records_price_cop_range/],
  ])("rejects the price %i", (price, pattern) =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      const error = await db.fail("insert into public.records (price_cop) values ($1)", [price]);
      expect(error).toMatch(pattern);
    }));

  it.each([0, 80_000, 2_000_000_000])("accepts the price %i", (price) =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      const { rows } = await db.query("insert into public.records (price_cop) values ($1) returning price_cop", [price]);
      expect(rows[0]).toMatchObject({ price_cop: price });
    }));

  it("rejects overly long text", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      expect(await db.fail("insert into public.records (title) values ($1)", ["x".repeat(201)])).toMatch(
        /records_title_length/,
      );
      expect(await db.fail("insert into public.records (artist) values ($1)", ["x".repeat(201)])).toMatch(
        /records_artist_length/,
      );
      expect(await db.fail("insert into public.records (notes) values ($1)", ["x".repeat(2001)])).toMatch(
        /records_notes_length/,
      );
    }));

  it("rejects a status outside the four allowed ones", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      expect(await db.fail("insert into public.records (status) values ('archived')")).toMatch(/invalid input value/);
    }));

  it("cannot be created as available because it has no photo yet", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      await db.as("authenticated", user);
      expect(await db.fail("insert into public.records (status) values ('available')")).toMatch(/at least one photo/);
    }));

  it("cannot be published without a photo", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await db.as("authenticated", user);
      expect(await db.fail("update public.records set status = 'available' where id = $1", [id])).toMatch(
        /at least one photo/,
      );
    }));

  it("can be published once it has a photo, with no other field", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1 });
      await db.as("authenticated", user);
      const { rows } = await db.query("update public.records set status = 'available' where id = $1 returning status", [id]);
      expect(rows[0]).toMatchObject({ status: "available" });
    }));

  it("cannot jump from draft straight to sold or unavailable", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1 });
      await db.as("authenticated", user);
      for (const status of ["sold", "unavailable"]) {
        expect(await db.fail("update public.records set status = $2 where id = $1", [id, status])).toMatch(
          /publish it first/,
        );
      }
    }));

  it("moves between published statuses and back to draft", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1, status: "available" });
      await db.as("authenticated", user);
      for (const status of ["sold", "unavailable", "available", "draft"]) {
        const { rows } = await db.query("update public.records set status = $2 where id = $1 returning status", [id, status]);
        expect(rows[0]).toMatchObject({ status });
      }
    }));

  it("never changes owner", () =>
    inTransaction(async (db) => {
      const owner = await db.newUser();
      const other = await db.newUser();
      const id = await insertRecord(db, owner);
      await db.asAdmin();
      expect(await db.fail("update public.records set owner_id = $2 where id = $1", [id, other])).toMatch(
        /owner cannot change/,
      );
    }));

  it("refreshes updated_at on every update", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await db.query("update public.records set updated_at = '2020-01-01' where id = $1", [id]);
      const { rows } = await db.query(
        "update public.records set notes = 'hi' where id = $1 returning updated_at > '2020-01-02' as fresh",
        [id],
      );
      expect(rows[0]).toMatchObject({ fresh: true });
    }));

  it("soft deletes keep the row so the owner can undo", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 1, status: "available" });
      await db.as("authenticated", user);
      await db.query("update public.records set deleted_at = now() where id = $1", [id]);
      const { rows } = await db.query("select deleted_at from public.records where id = $1", [id]);
      expect(rows[0]).toMatchObject({ deleted_at: expect.any(Date) as Date });
      await db.query("update public.records set deleted_at = null where id = $1", [id]);
      const restored = await db.query("select deleted_at from public.records where id = $1", [id]);
      expect(restored.rows[0]).toMatchObject({ deleted_at: null });
    }));

  it("hard delete removes the photos of a published record too", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { photos: 2, status: "available" });
      await db.asAdmin();
      await db.query("delete from public.records where id = $1", [id]);
      const { rows } = await db.query("select count(*)::int as n from public.record_media where record_id = $1", [id]);
      expect(rows[0]).toMatchObject({ n: 0 });
    }));

  it("keeps photo insertion working for a draft", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user);
      await insertMedia(db, user, id, 0);
      const { rows } = await db.query("select count(*)::int as n from public.record_media where record_id = $1", [id]);
      expect(rows[0]).toMatchObject({ n: 1 });
    }));

  describe("sale date", () => {
    it("is set when the record becomes sold and cleared when it is not sold anymore", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set status = 'sold' where id = $1", [id]);
        const sold = await db.query("select sold_at is not null as has_date from public.records where id = $1", [id]);
        expect(sold.rows[0]).toMatchObject({ has_date: true });

        await db.query("update public.records set status = 'available' where id = $1", [id]);
        const back = await db.query("select sold_at from public.records where id = $1", [id]);
        expect(back.rows[0]).toMatchObject({ sold_at: null });
      }));

    it("keeps the original date while the record stays sold", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set status = 'sold' where id = $1", [id]);
        await db.query("update public.records set sold_at = '2020-01-01' where id = $1", [id]);
        await db.query("update public.records set notes = 'edited' where id = $1", [id]);
        const { rows } = await db.query("select sold_at > '2020-06-01' as recent from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ recent: true });
      }));

    it("cannot be set by hand on a record that is not sold", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user);
        await db.query("update public.records set sold_at = now() where id = $1", [id]);
        const { rows } = await db.query("select sold_at from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ sold_at: null });
      }));
  });

  describe("Facebook sync", () => {
    it("starts as not posted and in sync", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user);
        const { rows } = await db.query("select facebook_posted_at, facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_posted_at: null, facebook_needs_update: false });
      }));

    it("flags the post for an update when a posted record changes status", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set facebook_posted_at = now() where id = $1", [id]);
        await db.query("update public.records set status = 'sold' where id = $1", [id]);
        const { rows } = await db.query("select facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_needs_update: true });
      }));

    it("does not flag a record that was never posted", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set status = 'sold' where id = $1", [id]);
        const { rows } = await db.query("select facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_needs_update: false });
      }));

    it("lets the owner mark the post as updated", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set facebook_posted_at = now() where id = $1", [id]);
        await db.query("update public.records set status = 'sold' where id = $1", [id]);
        await db.query("update public.records set facebook_needs_update = false where id = $1", [id]);
        const { rows } = await db.query("select facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_needs_update: false });
      }));

    it("is not flagged by edits that keep the status", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set facebook_posted_at = now() where id = $1", [id]);
        await db.query("update public.records set notes = 'new text' where id = $1", [id]);
        const { rows } = await db.query("select facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_needs_update: false });
      }));

    it("is in sync again when the record is posted anew in the same change", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const id = await insertRecord(db, user, { photos: 1, status: "available" });
        await db.query("update public.records set facebook_posted_at = '2020-01-01' where id = $1", [id]);
        await db.query(
          "update public.records set status = 'unavailable', facebook_posted_at = now(), facebook_needs_update = false where id = $1",
          [id],
        );
        const { rows } = await db.query("select facebook_needs_update from public.records where id = $1", [id]);
        expect(rows[0]).toMatchObject({ facebook_needs_update: false });
      }));
  });
});
