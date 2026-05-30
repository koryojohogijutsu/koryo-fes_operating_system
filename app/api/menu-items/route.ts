import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 対応するvenue_key一覧（サンデリカ追加）
const VALID_VENUE_KEYS = ["tontonhiroba", "football", "mockstore", "sundelica"];

export async function GET(req: NextRequest) {
  const venueKey = req.nextUrl.searchParams.get("venueKey");
  const type     = req.nextUrl.searchParams.get("type");

  if (type === "info") {
    let q = supabase.from("menu_venue_info").select("venue_key, title, description");
    if (venueKey) q = q.eq("venue_key", venueKey);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ infos: data ?? [] }, NO_CACHE);
  }

  let query = supabase
    .from("menu_items")
    .select("id, venue_key, title, description, image_url, price")
    .order("order_num");
  if (venueKey) query = query.eq("venue_key", venueKey);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, NO_CACHE);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, venueKey } = body;

  if (type === "info") {
    const { title, description } = body;
    if (!venueKey) return NextResponse.json({ error: "venueKey is required" }, { status: 400 });
    const { error } = await supabase.from("menu_venue_info").upsert(
      { venue_key: venueKey, title: title ?? "", description: description ?? "", updated_at: new Date().toISOString() },
      { onConflict: "venue_key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { title, description, imageUrl, price } = body;
  if (!venueKey || !title) return NextResponse.json({ error: "venueKey and title are required" }, { status: 400 });
  if (!VALID_VENUE_KEYS.includes(venueKey)) return NextResponse.json({ error: "無効なvenueKeyです" }, { status: 400 });

  const { error } = await supabase.from("menu_items").insert({
    venue_key: venueKey, title, description: description ?? "", image_url: imageUrl ?? null, price: price ?? null, order_num: Date.now(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
