import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertMedia, insertRecord, type Session } from "./harness/db";

interface Listed {
  id: string;
  title: string | null;
  artist: string | null;
  notes: string | null;
  status: string;
  price_cop: number | null;
  media_count: number;
  first_media_path: string | null;
  is_close_match: boolean;
}

async function catalog(db: Session, query = "", limit = 60): Promise<Listed[]> {
  const { rows } = await db.query("select * from public.public_records($1, $2)", [query, limit]);
  return rows as Listed[];
}

async function seed(db: Session) {
  const owner = await db.newUser();
  const lavoe = await insertRecord(db, owner, { title: "La Voz", artist: "Héctor Lavoe", notes: "LP original", photos: 2, status: "available" });
  const ritmo = await insertRecord(db, owner, { title: "Ritmo de Santo", artist: "Candita Batista", photos: 1, status: "available", priceCop: 80_000 });
  const cosa = await insertRecord(db, owner, { title: "Cosa Nuestra", artist: "Willie Colón", photos: 1, status: "sold", priceCop: 60_000 });
  const draft = await insertRecord(db, owner, { title: "Borrador", photos: 1, status: "draft" });
  const hidden = await insertRecord(db, owner, { title: "No disponible", photos: 1, status: "unavailable" });
  const deleted = await insertRecord(db, owner, { title: "Eliminado", photos: 1, status: "available" });
  await db.query("update public.records set deleted_at = now() where id = $1", [deleted]);
  return { owner, lavoe, ritmo, cosa, draft, hidden, deleted };
}

describe.skipIf(databaseUrl() === null)("public catalog", () => {
  describe("which records a visitor sees", () => {
    it("lists only available and sold records that are not deleted", () =>
      inTransaction(async (db) => {
        const { lavoe, ritmo, cosa } = await seed(db);
        await db.as("anon");
        const ids = (await catalog(db)).map((r) => r.id).sort();
        expect(ids).toEqual([lavoe, ritmo, cosa].sort());
      }));

    it("puts what is available first, then what was sold", () =>
      inTransaction(async (db) => {
        const { cosa } = await seed(db);
        await db.as("anon");
        const list = await catalog(db);
        expect(list.at(-1)?.id).toBe(cosa);
        expect(list.slice(0, -1).every((r) => r.status === "available")).toBe(true);
      }));

    it("is open to visitors and to the signed in owner alike", () =>
      inTransaction(async (db) => {
        const { owner } = await seed(db);
        await db.as("authenticated", owner);
        expect(await catalog(db)).toHaveLength(3);
      }));

    it("gives the number of files and the path of the first one", () =>
      inTransaction(async (db) => {
        const { lavoe } = await seed(db);
        await db.as("anon");
        const hit = (await catalog(db)).find((r) => r.id === lavoe);
        expect(hit?.media_count).toBe(2);
        expect(hit?.first_media_path).toMatch(/\.jpg$/);
      }));
  });

  describe("what a visitor never gets", () => {
    it("returns only the public columns", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        const { fields } = await db.query("select * from public.public_records('', 60)");
        expect(fields.map((f) => f.name).sort()).toEqual(
          ["artist", "first_media_path", "id", "is_close_match", "media_count", "notes", "price_cop", "status", "title", "updated_at"].sort(),
        );
      }));

    it("cannot read the tables directly", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        expect(await db.fail("select * from public.records")).toMatch(/permission denied/);
        expect(await db.fail("select * from public.record_media")).toMatch(/permission denied/);
      }));

    it("cannot change anything", () =>
      inTransaction(async (db) => {
        const { lavoe } = await seed(db);
        await db.as("anon");
        expect(await db.fail("update public.records set title = 'x' where id = $1", [lavoe])).toMatch(/permission denied/);
      }));
  });

  describe("the price", () => {
    it("is hidden unless the owner turned it on for that record", () =>
      inTransaction(async (db) => {
        const { ritmo, lavoe } = await seed(db);
        await db.as("anon");
        const list = await catalog(db);
        expect(list.find((r) => r.id === ritmo)?.price_cop).toBeNull();
        expect(list.find((r) => r.id === lavoe)?.price_cop).toBeNull();
      }));

    it("shows up once it is turned on, and only for that record", () =>
      inTransaction(async (db) => {
        const { owner, ritmo, cosa } = await seed(db);
        await db.as("authenticated", owner);
        await db.query("update public.records set show_price_public = true where id = $1", [ritmo]);
        await db.as("anon");
        const list = await catalog(db);
        expect(list.find((r) => r.id === ritmo)?.price_cop).toBe(80_000);
        expect(list.find((r) => r.id === cosa)?.price_cop).toBeNull();
      }));

    it("stays hidden when the record has no price even if it is turned on", () =>
      inTransaction(async (db) => {
        const { owner, lavoe } = await seed(db);
        await db.as("authenticated", owner);
        await db.query("update public.records set show_price_public = true where id = $1", [lavoe]);
        await db.as("anon");
        expect((await catalog(db)).find((r) => r.id === lavoe)?.price_cop).toBeNull();
      }));

    it("is off by default and only its owner can turn it on", () =>
      inTransaction(async (db) => {
        const { owner, ritmo } = await seed(db);
        await db.asAdmin();
        expect((await db.query("select show_price_public from public.records where id = $1", [ritmo])).rows[0]).toEqual({ show_price_public: false });
        const stranger = await db.newUser();
        await db.as("authenticated", stranger);
        expect((await db.query("update public.records set show_price_public = true where id = $1", [ritmo])).rowCount).toBe(0);
        await db.as("authenticated", owner);
        expect((await db.query("update public.records set show_price_public = true where id = $1", [ritmo])).rowCount).toBe(1);
      }));
  });

  describe("search", () => {
    it("finds by title, artist or notes, ignoring case and accents", () =>
      inTransaction(async (db) => {
        const { lavoe, ritmo } = await seed(db);
        await db.as("anon");
        expect((await catalog(db, "LA VOZ")).map((r) => r.id)).toEqual([lavoe]);
        expect((await catalog(db, "hector")).map((r) => r.id)).toEqual([lavoe]);
        expect((await catalog(db, "original")).map((r) => r.id)).toEqual([lavoe]);
        expect((await catalog(db, "candita")).map((r) => r.id)).toEqual([ritmo]);
      }));

    it("needs every word to match", () =>
      inTransaction(async (db) => {
        const { ritmo } = await seed(db);
        await db.as("anon");
        expect((await catalog(db, "ritmo santo")).map((r) => r.id)).toEqual([ritmo]);
        expect(await catalog(db, "ritmo voz")).toEqual([]);
      }));

    it("tolerates a typo in a long word and says the match is close", () =>
      inTransaction(async (db) => {
        const { ritmo } = await seed(db);
        await db.as("anon");
        const hits = await catalog(db, "candtia");
        expect(hits.map((r) => r.id)).toEqual([ritmo]);
        expect(hits[0]?.is_close_match).toBe(true);
      }));

    it("never finds what a visitor may not see", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        expect(await catalog(db, "borrador")).toEqual([]);
        expect(await catalog(db, "eliminado")).toEqual([]);
        expect(await catalog(db, "disponible")).toEqual([]);
      }));

    it("treats wildcard characters as plain text", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        expect(await catalog(db, "%")).toHaveLength(3);
        expect(await catalog(db, "_%_")).toHaveLength(3);
      }));

    it("clamps the limit", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        expect(await catalog(db, "", 1)).toHaveLength(1);
        expect(await catalog(db, "", 0)).toHaveLength(1);
        expect(await catalog(db, "", -5)).toHaveLength(1);
      }));
  });

  describe("one record", () => {
    async function one(db: Session, id: string): Promise<Listed | undefined> {
      const { rows } = await db.query("select * from public.public_record($1)", [id]);
      return rows[0] as Listed | undefined;
    }

    it("is found when it is available or sold", () =>
      inTransaction(async (db) => {
        const { lavoe, cosa } = await seed(db);
        await db.as("anon");
        expect((await one(db, lavoe))?.title).toBe("La Voz");
        expect((await one(db, cosa))?.status).toBe("sold");
      }));

    it("is not found when it is a draft, unavailable or deleted", () =>
      inTransaction(async (db) => {
        const { draft, hidden, deleted } = await seed(db);
        await db.as("anon");
        expect(await one(db, draft)).toBeUndefined();
        expect(await one(db, hidden)).toBeUndefined();
        expect(await one(db, deleted)).toBeUndefined();
      }));

    it("follows the same price rule", () =>
      inTransaction(async (db) => {
        const { owner, ritmo } = await seed(db);
        await db.as("anon");
        expect((await one(db, ritmo))?.price_cop).toBeNull();
        await db.as("authenticated", owner);
        await db.query("update public.records set show_price_public = true where id = $1", [ritmo]);
        await db.as("anon");
        expect((await one(db, ritmo))?.price_cop).toBe(80_000);
      }));
  });

  describe("photos and videos", () => {
    it("lists the files of a public record in order, and nothing for a draft", () =>
      inTransaction(async (db) => {
        const { owner, lavoe, draft, hidden, deleted } = await seed(db);
        await db.asAdmin();
        await insertMedia(db, owner, lavoe, 5, "video");
        await db.as("anon");
        const { rows } = (await db.query("select * from public.public_record_media($1)", [lavoe])) as {
          rows: { position: number; kind: string }[];
        };
        expect(rows.map((r) => r.position)).toEqual([0, 1, 5]);
        expect(rows.map((r) => r.kind)).toEqual(["photo", "photo", "video"]);
        expect(Object.keys(rows[0] as object).sort()).toEqual(["id", "kind", "position", "storage_path"]);
        for (const id of [draft, hidden, deleted]) {
          expect((await db.query("select * from public.public_record_media($1)", [id])).rowCount).toBe(0);
        }
      }));

    it("lets a visitor read the stored files of a public record, and only those", () =>
      inTransaction(async (db) => {
        const { lavoe, draft, hidden, deleted } = await seed(db);
        await db.asAdmin();
        const pathsOf = async (recordId: string) =>
          ((await db.query("select storage_path from public.record_media where record_id = $1", [recordId])) as {
            rows: { storage_path: string }[];
          }).rows.map((r) => r.storage_path);
        for (const id of [lavoe, draft, hidden, deleted]) {
          for (const path of await pathsOf(id)) {
            await db.query("insert into storage.objects (bucket_id, name) values ('record-photos', $1)", [path]);
          }
        }
        await db.query("insert into storage.objects (bucket_id, name) values ('record-photos', 'someone/else/unlinked.jpg')");
        const expected = (await pathsOf(lavoe)).sort();

        await db.as("anon");
        const { rows } = (await db.query("select name from storage.objects where bucket_id = 'record-photos'")) as {
          rows: { name: string }[];
        };
        expect(rows.map((r) => r.name).sort()).toEqual(expected);
      }));

    it("does not let a visitor write or delete stored files", () =>
      inTransaction(async (db) => {
        await seed(db);
        await db.as("anon");
        expect(await db.fail("insert into storage.objects (bucket_id, name) values ('record-photos', 'x/y/z.jpg')")).toMatch(/row-level security|permission denied/);
        expect((await db.query("delete from storage.objects where bucket_id = 'record-photos'")).rowCount).toBe(0);
      }));
  });
});
