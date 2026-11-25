// Applies migrations/*.sql in order, once each. Usage: DATABASE_URL=... node scripts/migrate.mjs
import { Pool, neonConfig } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
const pool = new Pool({ connectionString: process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL });
const c = await pool.connect();
await c.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const done = new Set((await c.query("select name from schema_migrations")).rows.map((r) => r.name));
for (const f of readdirSync(new URL("../migrations", import.meta.url)).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const sql = readFileSync(new URL("../migrations/" + f, import.meta.url), "utf8");
  await c.query("begin");
  try {
    await c.query(sql);
    await c.query("insert into schema_migrations (name) values ($1)", [f]);
    await c.query("commit");
    console.log("applied", f);
  } catch (e) {
    await c.query("rollback");
    console.error("failed", f, e.message);
    process.exit(1);
  }
}
c.release();
await pool.end();
