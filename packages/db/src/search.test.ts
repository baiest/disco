import { describe, expect, it } from "vitest";
import { databaseUrl, inTransaction, insertRecord, type Session } from "./harness/db";

interface Hit {
  id: string;
  title: string | null;
  status: string;
  is_close_match: boolean;
  media_count: number;
  first_media_path: string | null;
  sold_at: Date | null;
  facebook_posted_at: Date | null;
  facebook_needs_update: boolean;
}

async function search(db: Session, query: string, filter = "all", limit = 50): Promise<Hit[]> {
  const { rows } = await db.query("select * from public.search_records($1, $2, $3)", [query, filter, limit]);
  return rows as Hit[];
}

async function seed(db: Session) {
  const user = await db.newUser();
  const lavoe = await insertRecord(db, user, { title: "La Voz", artist: "Héctor Lavoe", photos: 2, status: "available" });
  const ritmo = await insertRecord(db, user, {
    title: "Ritmo de Santo",
    artist: "Candita Batista y sus Tambores Batá",
    notes: "LP original americano",
    photos: 1,
    status: "available",
  });
  const cosa = await insertRecord(db, user, { title: "Cosa Nuestra", artist: "Willie Colón y Rubén Blades", photos: 1, status: "sold" });
  return { user, lavoe, ritmo, cosa };
}

describe.skipIf(databaseUrl() === null)("search_records", () => {
  it("finds a record by title, artist or notes, ignoring case", () =>
    inTransaction(async (db) => {
      const { user, lavoe, ritmo } = await seed(db);
      await db.as("authenticated", user);
      expect((await search(db, "LA VOZ")).map((r) => r.id)).toEqual([lavoe]);
      expect((await search(db, "tambores")).map((r) => r.id)).toEqual([ritmo]);
      expect((await search(db, "americano")).map((r) => r.id)).toEqual([ritmo]);
    }));

  it("ignores accents in both directions", () =>
    inTransaction(async (db) => {
      const { user, lavoe, cosa } = await seed(db);
      await db.as("authenticated", user);
      const withoutAccent = await search(db, "hector");
      expect(withoutAccent.map((r) => r.id)).toEqual([lavoe]);
      // An exact match once accents are ignored, not a typo match.
      expect(withoutAccent[0]?.is_close_match).toBe(false);
      expect((await search(db, "Héctor")).map((r) => r.id)).toEqual([lavoe]);
      expect((await search(db, "colon")).map((r) => r.id)).toEqual([cosa]);
      expect((await search(db, "ruben")).map((r) => r.id)).toEqual([cosa]);
    }));

  it("matches partial words, in any order", () =>
    inTransaction(async (db) => {
      const { user, lavoe } = await seed(db);
      await db.as("authenticated", user);
      expect((await search(db, "lavo")).map((r) => r.id)).toEqual([lavoe]);
      expect((await search(db, "lavoe hector")).map((r) => r.id)).toEqual([lavoe]);
      expect((await search(db, "voz hec")).map((r) => r.id)).toEqual([lavoe]);
    }));

  it("needs every word to match", () =>
    inTransaction(async (db) => {
      const { user } = await seed(db);
      await db.as("authenticated", user);
      expect(await search(db, "hector blades")).toEqual([]);
    }));

  it("tolerates a typo and says the match is only close", () =>
    inTransaction(async (db) => {
      const { user, ritmo } = await seed(db);
      await db.as("authenticated", user);
      const typo = await search(db, "ritmo de sato");
      expect(typo.map((r) => r.id)).toEqual([ritmo]);
      expect(typo[0]?.is_close_match).toBe(true);

      const exact = await search(db, "ritmo santo");
      expect(exact.map((r) => r.id)).toEqual([ritmo]);
      expect(exact[0]?.is_close_match).toBe(false);
    }));

  it("does not match short words by similarity", () =>
    inTransaction(async (db) => {
      const { user } = await seed(db);
      await db.as("authenticated", user);
      expect(await search(db, "zzz")).toEqual([]);
      expect(await search(db, "xq")).toEqual([]);
    }));

  it("ranks title above artist above notes", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const inNotes = await insertRecord(db, user, { title: "Otro", notes: "disco santo raro", photos: 1 });
      const inArtist = await insertRecord(db, user, { title: "Uno", artist: "Santo Domingo Band", photos: 1 });
      const inTitle = await insertRecord(db, user, { title: "Santo y Seña", photos: 1 });
      await db.as("authenticated", user);
      expect((await search(db, "santo")).map((r) => r.id)).toEqual([inTitle, inArtist, inNotes]);
    }));

  it("returns everything, newest first, for an empty or symbol-only query", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const first = await insertRecord(db, user, { title: "Primero" });
      const second = await insertRecord(db, user, { title: "Segundo" });
      // Triggers would reset updated_at to the transaction time, so switch them off for this one update.
      await db.query("set local session_replication_role = replica");
      await db.query("update public.records set updated_at = '2020-01-01' where id = $1", [first]);
      await db.query("set local session_replication_role = origin");
      await db.as("authenticated", user);
      for (const query of ["", "   ", "---", "%_\\"]) {
        expect((await search(db, query)).map((r) => r.id)).toEqual([second, first]);
      }
    }));

  it("never treats LIKE symbols in the query as wildcards", () =>
    inTransaction(async (db) => {
      const { user } = await seed(db);
      await db.as("authenticated", user);
      expect(await search(db, "voz%")).toEqual(expect.arrayContaining([expect.objectContaining({ title: "La Voz" })]));
      expect(await search(db, "xyz%_")).toEqual([]);
    }));

  it("leaves out deleted records", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      const id = await insertRecord(db, user, { title: "Borrado" });
      await db.query("update public.records set deleted_at = now() where id = $1", [id]);
      await db.as("authenticated", user);
      expect(await search(db, "borrado")).toEqual([]);
    }));

  describe("filters", () => {
    it("available and sold", () =>
      inTransaction(async (db) => {
        const { user, lavoe, ritmo, cosa } = await seed(db);
        await db.as("authenticated", user);
        expect((await search(db, "", "available")).map((r) => r.id).sort()).toEqual([lavoe, ritmo].sort());
        expect((await search(db, "", "sold")).map((r) => r.id)).toEqual([cosa]);
        expect((await search(db, "cosa", "available"))).toEqual([]);
      }));

    it("no price", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const without = await insertRecord(db, user, { title: "Sin precio" });
        await insertRecord(db, user, { title: "Con precio", priceCop: 50_000 });
        await db.as("authenticated", user);
        expect((await search(db, "", "no_price")).map((r) => r.id)).toEqual([without]);
      }));

    it("available records not yet posted on Facebook", () =>
      inTransaction(async (db) => {
        const user = await db.newUser();
        const pending = await insertRecord(db, user, { title: "Pendiente", photos: 1, status: "available" });
        const posted = await insertRecord(db, user, { title: "Publicado", photos: 1, status: "available" });
        await db.query("update public.records set facebook_posted_at = now() where id = $1", [posted]);
        await insertRecord(db, user, { title: "Borrador" });
        await db.as("authenticated", user);
        expect((await search(db, "", "not_on_facebook")).map((r) => r.id)).toEqual([pending]);
      }));

    it("rejects an unknown filter", () =>
      inTransaction(async (db) => {
        const { user } = await seed(db);
        await db.as("authenticated", user);
        expect(await db.fail("select * from public.search_records('', 'bogus', 10)")).toMatch(/unknown filter/);
      }));
  });

  it("returns what the screen needs: status, sale date, Facebook state and the first photo", () =>
    inTransaction(async (db) => {
      const { user, cosa, lavoe } = await seed(db);
      await db.query("update public.records set facebook_posted_at = now() where id = $1", [cosa]);
      await db.query("update public.records set status = 'available' where id = $1", [cosa]);
      await db.query("update public.records set status = 'sold' where id = $1", [cosa]);
      await db.as("authenticated", user);

      const [sold] = await search(db, "cosa nuestra");
      expect(sold).toMatchObject({ id: cosa, status: "sold", facebook_needs_update: true, media_count: 1 });
      expect(sold?.sold_at).toBeInstanceOf(Date);
      expect(sold?.facebook_posted_at).toBeInstanceOf(Date);

      const [withTwo] = await search(db, "la voz");
      expect(withTwo).toMatchObject({ id: lavoe, media_count: 2 });
      expect(withTwo?.first_media_path).toMatch(new RegExp(`^${user}/${lavoe}/.+\\.jpg$`));
    }));

  it("respects the limit", () =>
    inTransaction(async (db) => {
      const user = await db.newUser();
      for (let index = 0; index < 5; index += 1) {
        await insertRecord(db, user, { title: `Disco ${String(index)}` });
      }
      await db.as("authenticated", user);
      expect(await search(db, "disco", "all", 3)).toHaveLength(3);
      expect(await search(db, "disco", "all", 0)).toHaveLength(1);
    }));

  it("only searches the caller's own records", () =>
    inTransaction(async (db) => {
      const alice = await db.newUser();
      const bob = await db.newUser();
      await insertRecord(db, alice, { title: "De Alice" });
      await insertRecord(db, bob, { title: "De Bob" });
      await db.as("authenticated", bob);
      expect((await search(db, "de")).map((r) => r.title)).toEqual(["De Bob"]);
    }));

  it("is not available to anonymous visitors", () =>
    inTransaction(async (db) => {
      const { rows } = await db.query(
        "select has_function_privilege('anon', 'public.search_records(text,text,integer)', 'execute') as anon_can, has_function_privilege('authenticated', 'public.search_records(text,text,integer)', 'execute') as user_can",
      );
      expect(rows[0]).toMatchObject({ anon_can: false, user_can: true });
      await db.as("anon");
      expect(await db.fail("select * from public.search_records('', 'all', 10)")).toMatch(/permission denied/);
    }));
});
