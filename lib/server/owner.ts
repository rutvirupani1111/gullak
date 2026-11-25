import "server-only";
import { admin, HttpError, withShop } from "../db";
import { ownerShop } from "../session";

export async function campaignForOwner(cid: string) {
  const row = await admin((q) => q.one("select shop_id from campaigns where id = $1", [cid]));
  if (!row) throw new HttpError(404, "not_found", "Khel nahi mila.", "Campaign not found.");
  const shop = await ownerShop(row.shop_id);
  const c = await withShop(shop.id, (q) => q.one("select * from campaigns where id = $1", [cid]));
  if (!c) throw new HttpError(404, "not_found", "Khel nahi mila.", "Campaign not found.");
  return { c, shop };
}

/** Everything the owner home needs, in one transaction. */
export async function shopHome(shopId: string) {
  return withShop(shopId, async (q) => {
    const shop = await q.one("select id, slug, name, name_local, address, city, palette, initial, keeper, is_demo, language from shops where id = $1", [shopId]);
    const campaigns = await q.query("select id, name, title_hi, title_en, status, game, starts_at, ends_at, version from campaigns where shop_id = $1 order by (status='live') desc, starts_at desc", [shopId]);
    const today = await q.one(
      `select count(*) filter (where kind='scan')::int scans, count(*) filter (where kind='play')::int plays, count(*) filter (where kind='win')::int wins,
              (count(*) filter (where kind='redeem') - count(*) filter (where kind='undo'))::int redeemed
       from events where shop_id = $1 and created_at > date_trunc('day', now() + interval '330 minutes') - interval '330 minutes'`,
      [shopId],
    );
    const staff = await q.query("select id, name from staff where shop_id = $1 and active order by name", [shopId]);
    const alert = await q.one(
      `with d as (select staff_id, staff_name, date_trunc('day', created_at + interval '330 minutes') d, count(*) n from redemptions where shop_id = $1 and undone_at is null and created_at > now() - interval '15 days' group by 1,2,3)
       select staff_name, n from d t where d = date_trunc('day', now() + interval '330 minutes') and n >= 15
         and n > 3 * coalesce((select percentile_cont(.5) within group (order by n) from d x where x.staff_id = t.staff_id and x.d < t.d), 0) limit 1`,
      [shopId],
    );
    // what the owner has already done, so the home page can say what to do next (read, never guessed)
    const progress = await q.one(
      `select (select count(*)::int from plays where shop_id = $1) plays,
              (select count(*)::int from redemptions where shop_id = $1 and undone_at is null) stamps,
              (select count(*)::int from campaigns where shop_id = $1 and status = 'live') live,
              (select count(*)::int from prizes where shop_id = $1 and version > 1)
                + (select count(*)::int from campaigns where shop_id = $1 and version > 1 and status <> 'ended') tuned`,
      [shopId],
    );
    return { shop: shop!, campaigns, today: today!, staff, alert, progress: progress! };
  });
}
