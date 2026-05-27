import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function GET(req: NextRequest) {
  const venueKey = req.nextUrl.searchParams.get("venueKey");
  let query = supabase.from("venue_programs").select("id, venue_key, name, datetime, comment, festival_day").order("datetime", { nullsFirst: false });
  if (venueKey) query = query.eq("venue_key", venueKey);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programs: data ?? [] }, NO_CACHE);
}
export async function POST(req: Request) {
  const { venueKey, name, datetime, comment, festivalDay } = await req.json();
  if (!venueKey || !name) return NextResponse.json({ error: "venueKey and name are required" }, { status: 400 });
  const { error } = await supabase.from("venue_programs").insert({
    venue_key:    venueKey,
    name,
    datetime:     datetime    ?? "",
    comment:      comment     ?? "",
    festival_day: festivalDay ?? "both",
    order_num:    Date.now(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await supabase.from("venue_programs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
