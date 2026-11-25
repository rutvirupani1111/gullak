import { notFound } from "next/navigation";
import { admin } from "@/lib/db";
import CustomerApp from "@/components/customer/CustomerApp";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await admin((q) => q.one("select name, city from shops where slug = $1", [slug]));
  return { title: s ? `${s.name}, ${s.city}: Gullak` : "Gullak" };
}
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const s = await admin((q) =>
    q.one("select s.slug, s.name, s.name_local, s.address, s.city, s.palette, s.initial, s.keeper, s.is_demo, s.language, encode(k.public_key, 'base64') pub, k.kv from shops s join shop_keys k on k.shop_id = s.id and k.retired_at is null where s.slug = $1 order by k.kv desc limit 1", [slug]),
  );
  if (!s) notFound();
  return <CustomerApp shop={s as never} query={{ lqt: sp.lqt, cb: sp.cb, src: sp.src, khula: sp.khula }} />;
}
