import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    /** Connection string of a throw-away database with the migrations applied, or null when skipped. */
    testDatabaseUrl: string | null;
  }
}

const migrationsDir = join(import.meta.dirname, "../../../../supabase/migrations");
const stubsFile = join(import.meta.dirname, "supabase-stubs.sql");

function readMigrations(): string[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationsDir, file), "utf8"));
}

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

export default async function setup({ provide }: TestProject): Promise<(() => Promise<void>) | undefined> {
  const adminUrl = process.env["DATABASE_URL"];
  if (adminUrl === undefined || adminUrl === "") {
    if (process.env["CI"] !== undefined) {
      const message = "DATABASE_URL is required in CI: database tests must not be skipped";
      console.error(message);
      throw new Error(message);
    }
    console.warn("DATABASE_URL is not set: skipping database tests");
    provide("testDatabaseUrl", null);
    return undefined;
  }

  const name = `disco_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);

  const testUrl = withDatabase(adminUrl, name);
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  await client.query(readFileSync(stubsFile, "utf8"));
  for (const sql of readMigrations()) {
    await client.query(sql);
  }
  await client.end();

  provide("testDatabaseUrl", testUrl);

  return async () => {
    await admin.query(`drop database ${name} with (force)`);
    await admin.end();
  };
}
