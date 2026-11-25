import Transfer from "@/components/customer/Transfer";
export const metadata = { title: "Gullak naye phone mein: Gullak" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return <Transfer claimToken={typeof sp.t === "string" ? sp.t : null} />;
}
