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
  let query = supabase.from("pin_info").select("venue_key, datetime, content");
  if (venueKey) query = query.eq("venue_key", venueKey);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, NO_CACHE);
}
export async function POST(req: Request) {
  const { venueKey, datetime, content } = await req.json();
  if (!venueKey) return NextResponse.json({ error: "venueKey is required" }, { status: 400 });
  const { error } = await supabase.from("pin_info").upsert(
    { venue_key: venueKey, datetime: datetime ?? "", content: content ?? "", updated_at: new Date().toISOString() },
    { onConflict: "venue_key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
