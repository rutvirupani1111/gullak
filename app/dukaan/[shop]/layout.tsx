import { notFound } from "next/navigation";
import { ownerShop } from "@/lib/session";
import { admin } from "@/lib/db";
import OwnerNav from "@/components/owner/OwnerNav";

export const dynamic = "force-dynamic";
export default async function L({ children, params }: { children: React.ReactNode; params: Promise<{ shop: string }> }) {
  const { shop } = await params;
  const s = await ownerShop(shop).catch(() => null);
  if (!s) notFound();
  const row = await admin((q) => q.one("select name, palette, initial, is_demo from shops where id = $1", [s.id]));
  return (
    <div style={{ minHeight: "100dvh" }}>
      {row!.is_demo && <div className="demo-ribbon"><div>Demo dukaan: yeh asli dukaan nahi hai. Staff Ramesh ka PIN 1234 hai. Yeh sandbox 24 ghante mein mit jaata hai.</div></div>}
      <OwnerNav slug={s.slug} name={row!.name} />
      {children}
    </div>
  );
}
