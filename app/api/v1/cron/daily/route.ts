import { route, ok, fail } from "@/lib/http";
import { admin } from "@/lib/db";
import { buildDemo } from "@/lib/server/shop";

export const maxDuration = 60;
export const GET = route(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return fail(401, "no", "Nahi.", "Unauthorized.");
  const out: Record<string, number> = {};
  // Each purge runs in chunks of 2,000 rows, one short transaction each, so a busy day never holds a long lock.
  const chunked = async (name: string, sql: string) => {
    let total = 0;
    for (let i = 0; i < 50; i++) {
      const n = (await admin((q) => q.query(sql))).length;
      total += n;
      if (n < 2000) break;
    }
    out[name] = total;
  };
  await chunked("sandboxes", "delete from shops where id in (select id from shops where is_demo and sandbox_expires_at < now() limit 2000 for update skip locked) returning id");
  await chunked("rate_buckets", "delete from rate_buckets where key in (select key from rate_buckets where updated_at < now() - interval '1 day' limit 2000 for update skip locked) returning key");
  await chunked("pow_nonces", "delete from pow_nonces where nonce in (select nonce from pow_nonces where used_at < now() - interval '1 day' limit 2000 for update skip locked) returning nonce");
  await chunked("transfers", "delete from device_transfers where token_hash in (select token_hash from device_transfers where expires_at < now() limit 2000 for update skip locked) returning token_hash");
  await chunked("abuse", "delete from abuse_log where id in (select id from abuse_log where created_at < now() - interval '90 days' limit 2000 for update skip locked) returning id");
  await admin(async (q) => {
    for (const m of [0, 1, 2]) {
      const r = await q.one<{ a: string; b: string; n: string }>("select to_char(date_trunc('month', now()) + make_interval(months => $1), 'YYYY-MM-DD') a, to_char(date_trunc('month', now()) + make_interval(months => $1 + 1), 'YYYY-MM-DD') b, to_char(date_trunc('month', now()) + make_interval(months => $1), 'YYYY_MM') n", [m]);
      await q.query(`create table if not exists events_${r!.n} partition of events for values from ('${r!.a}') to ('${r!.b}')`);
    }
    const ended = await q.query("update campaigns set status = 'ended' where status in ('live','paused') and ends_at < now() returning id");
    out.ended = ended.length;
  });
  // The public demo shop on the landing page is rebuilt fresh each day.
  const demo = await admin((q) => q.one("select id from shops where slug = 'sharma-ji-ki-tapri'"));
  if (demo) await admin((q) => q.query("delete from shops where id = $1", [demo.id]));
  await buildDemo("sharma-ji-ki-tapri", false);
  out.demo = 1;
  return ok(out);
});
