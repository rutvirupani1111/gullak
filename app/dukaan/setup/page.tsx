import { redirect } from "next/navigation";
import { owner } from "@/lib/session";
import Setup from "@/components/owner/Setup";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await owner())) redirect("/signup");
  return <Setup />;
}
