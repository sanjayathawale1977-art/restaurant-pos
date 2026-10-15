import { redirect } from "next/navigation";

// The old /menu customer page is replaced by /order (same menu, safer ordering).
// Any old QR codes that point to /menu?table=T-1 keep working.
export default async function MenuRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { table } = await searchParams;
  const t = Array.isArray(table) ? table[0] : table;
  redirect(t ? `/order?table=${encodeURIComponent(t)}` : "/order");
}
