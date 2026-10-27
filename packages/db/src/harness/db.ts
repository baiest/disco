import { randomUUID } from "node:crypto";
import pg from "pg";
import { inject } from "vitest";

export type Role = "anon" | "authenticated" | "service_role";

export interface Session {
  query: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>;
  /** Runs a statement that must fail and returns the error message; the session stays usable. */
  fail: (sql: string, params?: unknown[]) => Promise<string>;
  /** Switches the database role and the JWT subject for the following statements. */
  as: (role: Role, userId?: string) => Promise<void>;
  /** Back to the superuser. */
  asAdmin: () => Promise<void>;
  newUser: () => Promise<string>;
}

export function databaseUrl(): string | null {
  return inject("testDatabaseUrl");
}

/** Runs `fn` inside a transaction that is always rolled back. */
export async function inTransaction(fn: (session: Session) => Promise<void>): Promise<void> {
  const url = databaseUrl();
  if (url === null) {
    throw new Error("database tests need DATABASE_URL");
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("begin");

  const session: Session = {
    query: (sql, params) => client.query(sql, params),
    fail: async (sql, params) => {
      await client.query("savepoint expected_failure");
      try {
        await client.query(sql, params);
      } catch (error) {
        await client.query("rollback to savepoint expected_failure");
        return error instanceof Error ? error.message : String(error);
      }
      throw new Error(`expected the statement to fail: ${sql}`);
    },
    as: async (role, userId) => {
      await client.query("reset role");
      await client.query(`set local role ${role}`);
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    },
    asAdmin: async () => {
      await client.query("reset role");
    },
    newUser: async () => {
      const id = randomUUID();
      await client.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
      return id;
    },
  };

  try {
    await fn(session);
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

/** Inserts a record owned by `ownerId` as admin and returns its id. */
export async function insertRecord(
  session: Session,
  ownerId: string,
  fields: {
    status?: string;
    photos?: number;
    priceCop?: number | null;
    title?: string | null;
    artist?: string | null;
    notes?: string | null;
  } = {},
): Promise<string> {
  const id = randomUUID();
  await session.asAdmin();
  await session.query("insert into public.records (id, owner_id, title, artist, notes) values ($1, $2, $3, $4, $5)", [
    id,
    ownerId,
    fields.title ?? null,
    fields.artist ?? null,
    fields.notes ?? null,
  ]);
  for (let position = 0; position < (fields.photos ?? 0); position += 1) {
    await insertMedia(session, ownerId, id, position);
  }
  if (fields.status !== undefined && fields.status !== "draft") {
    // A draft can only become available first (see the database rules).
    await session.query("update public.records set status = 'available' where id = $1", [id]);
    if (fields.status !== "available") {
      await session.query("update public.records set status = $2 where id = $1", [id, fields.status]);
    }
  }
  if (fields.priceCop !== undefined) {
    await session.query("update public.records set price_cop = $2 where id = $1", [id, fields.priceCop]);
  }
  return id;
}

export async function insertMedia(
  session: Session,
  ownerId: string,
  recordId: string,
  position: number,
  kind: "photo" | "video" = "photo",
): Promise<string> {
  const id = randomUUID();
  const extension = kind === "photo" ? "jpg" : "mp4";
  const duration = kind === "video" ? 30 : null;
  await session.query(
    "insert into public.record_media (id, record_id, owner_id, storage_path, position, kind, duration_seconds) values ($1, $2, $3, $4, $5, $6, $7)",
    [id, recordId, ownerId, `${ownerId}/${recordId}/${id}.${extension}`, position, kind, duration],
  );
  return id;
}
