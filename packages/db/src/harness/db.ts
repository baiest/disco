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
  fields: { status?: string; photos?: number; priceCop?: number | null } = {},
): Promise<string> {
  const id = randomUUID();
  await session.asAdmin();
  await session.query("insert into public.records (id, owner_id) values ($1, $2)", [id, ownerId]);
  for (let position = 0; position < (fields.photos ?? 0); position += 1) {
    await insertPhoto(session, ownerId, id, position);
  }
  if (fields.status !== undefined && fields.status !== "draft") {
    await session.query("update public.records set status = $2 where id = $1", [id, fields.status]);
  }
  if (fields.priceCop !== undefined) {
    await session.query("update public.records set price_cop = $2 where id = $1", [id, fields.priceCop]);
  }
  return id;
}

export async function insertPhoto(
  session: Session,
  ownerId: string,
  recordId: string,
  position: number,
): Promise<string> {
  const id = randomUUID();
  await session.query(
    "insert into public.record_photos (id, record_id, owner_id, storage_path, position) values ($1, $2, $3, $4, $5)",
    [id, recordId, ownerId, `${ownerId}/${recordId}/${id}.jpg`, position],
  );
  return id;
}
