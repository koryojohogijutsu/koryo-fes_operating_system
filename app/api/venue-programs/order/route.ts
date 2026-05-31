import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: Request) {
  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: "items required" }, { status: 400 });
  await Promise.all(
    items.map(({ id, order_num }: { id: string; order_num: number }) =>
      supabase.from("venue_programs").update({ order_num }).eq("id", id)
    )
  );
  return NextResponse.json({ success: true });
}
