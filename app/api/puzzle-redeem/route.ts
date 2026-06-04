import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { visitorId } = await req.json();
  const visitorIdStr = String(visitorId).trim();

  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  // クリア記録を取得
  const { data } = await supabase
    .from("puzzle_clears")
    .select("id, redeemed_at")
    .eq("visitor_id", visitorId)
    .single();

  if (!data) {
    return NextResponse.json({ error: "謎解きをクリアしていません" }, { status: 404 });
  }

  if (data.redeemed_at) {
    return NextResponse.json({ error: "すでに引き換え済みです" }, { status: 409 });
  }

  // redeemed_at を更新
  const { error } = await supabase
    .from("puzzle_clears")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
