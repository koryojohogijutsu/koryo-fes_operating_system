import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// クリア状態確認
export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  const { data } = await supabase
    .from("puzzle_clears")
    .select("cleared_at, redeemed_at")
    .eq("visitor_id", visitorId)
    .single();

  return NextResponse.json({
    cleared:    !!data,
    redeemed:   !!data?.redeemed_at,
  }, NO_CACHE);
}

// クリア記録
export async function POST(req: Request) {
  const { visitorId } = await req.json();
  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  // 既存チェック（二重登録防止）
  const { data: existing } = await supabase
    .from("puzzle_clears")
    .select("id")
    .eq("visitor_id", visitorId)
    .single();

  if (existing) return NextResponse.json({ success: true, alreadyCleared: true });

  const { error } = await supabase.from("puzzle_clears").insert({
    visitor_id:  visitorId,
    cleared_at:  new Date().toISOString(),
    redeemed_at: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
