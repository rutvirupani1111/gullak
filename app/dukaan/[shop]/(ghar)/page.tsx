import { ownerShop } from "@/lib/session";
import { shopHome } from "@/lib/server/owner";
import Home from "@/components/owner/Home";
export default async function Page({ params }: { params: Promise<{ shop: string }> }) {
  const s = await ownerShop((await params).shop);
  const d = await shopHome(s.id);
  return <Home d={JSON.parse(JSON.stringify(d))} />;
}
