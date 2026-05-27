import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function GET() {
  const { data } = await supabase
    .from("festival_settings")
    .select("day1_date, day2_date, display_mode")
    .eq("id", "singleton")
    .single();
  return NextResponse.json({ settings: data ?? { day1_date: "", day2_date: "", display_mode: "auto" } }, NO_CACHE);
}
export async function POST(req: Request) {
  const { day1Date, day2Date, displayMode } = await req.json();
  const { error } = await supabase
    .from("festival_settings")
    .upsert({ id: "singleton", day1_date: day1Date ?? "", day2_date: day2Date ?? "", display_mode: displayMode ?? "auto", updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
