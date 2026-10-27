import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction } from "./harness/db";

describe.skipIf(databaseUrl() === null)("record-photos bucket", () => {
  it("is private, small and limited to JPEG and WebP", () =>
    inTransaction(async (db) => {
      const { rows } = await db.query("select * from storage.buckets where id = 'record-photos'");
      expect(rows[0]).toMatchObject({
        public: false,
        file_size_limit: "5242880",
        allowed_mime_types: ["image/jpeg", "image/webp"],
      });
    }));

  it("lets a user write and read only inside their own folder", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();

      await db.as("authenticated", alice);
      await db.query("insert into storage.objects (bucket_id, name) values ('record-photos', $1)", [`${alice}/rec/a.jpg`]);
      const error = await db.fail("insert into storage.objects (bucket_id, name) values ('record-photos', $1)", [
        `${bob}/rec/b.jpg`,
      ]);
      expect(error).toMatch(/row-level security/);

      await db.as("authenticated", bob);
      const seenByBob = await db.query("select name from storage.objects where bucket_id = 'record-photos'");
      expect(seenByBob.rowCount).toBe(0);
    }));

  it("does not let a user delete or overwrite someone else's object", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      await db.asAdmin();
      await db.query("insert into storage.objects (bucket_id, name) values ('record-photos', $1)", [`${alice}/rec/a.jpg`]);

      await db.as("authenticated", bob);
      expect((await db.query("delete from storage.objects where bucket_id = 'record-photos'")).rowCount).toBe(0);
      expect((await db.query("update storage.objects set name = $1 where bucket_id = 'record-photos'", [`${bob}/rec/a.jpg`])).rowCount).toBe(0);
    }));

  it("gives anonymous visitors nothing", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      await db.asAdmin();
      await db.query("insert into storage.objects (bucket_id, name) values ('record-photos', $1)", [`${alice}/rec/a.jpg`]);
      await db.as("anon");
      expect(await db.fail("select * from storage.objects")).toMatch(/permission denied/);
    }));
});
