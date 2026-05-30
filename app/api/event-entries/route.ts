import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const category = req.nextUrl.searchParams.get("category");

  // comment・datetime・image_url・members・festival_day も返す（修正: commentが漏れていたバグ修正）
  let query = supabase
    .from("event_entries")
    .select("id, category, name, description, comment, datetime, image_url, members, festival_day, order_num")
    .order("order_num");

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] }, NO_CACHE);
}
