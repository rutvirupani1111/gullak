import LiveQr from "@/components/staff/LiveQr";
export const metadata = { title: "Live QR: Gullak" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return <LiveQr shop={sp.shop} />;
}
