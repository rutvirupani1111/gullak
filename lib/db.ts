// Neon Postgres access. Every shop-scoped read or write goes through withShop(), which opens a
// transaction and sets app.shop_id first, so row level security hides every other shop's rows.
// admin() is the narrow cross-shop path (owner auth, wallet across shops, demo clone, rollup, purge).
import "server-only";
import { Pool } from "@neondatabase/serverless";

export type Row = Record<string, any>;
export interface Q {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
}

const g = globalThis as unknown as { __gkPool?: Pool };
function pool() {
  if (!g.__gkPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    g.__gkPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 6 });
  }
  return g.__gkPool;
}

async function run<T>(setup: (c: Q) => Promise<void>, fn: (q: Q) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  const q: Q = {
    async query<R>(sql: string, params: unknown[] = []) {
      return (await c.query(sql, params as unknown[])).rows as R[];
    },
    async one<R>(sql: string, params: unknown[] = []) {
      return (await c.query(sql, params as unknown[])).rows[0] as R | undefined;
    },
  };
  try {
    await c.query("begin");
    await setup(q);
    const out = await fn(q);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export function withShop<T>(shopId: string, fn: (q: Q) => Promise<T>) {
  return run(async (q) => {
    await q.query("select set_config('app.shop_id', $1, true)", [shopId]);
  }, fn);
}

export function admin<T>(fn: (q: Q) => Promise<T>) {
  return run(async (q) => {
    await q.query("select set_config('app.bypass', 'on', true)");
  }, fn);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public hi: string,
    public en: string,
    public extra: Row = {},
  ) {
    super(code);
  }
}
