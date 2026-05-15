import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: マップレイアウト取得
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // "class" | "venue"

  if (type === "venue") {
    const { data, error } = await supabase
      .from("venue_map_layout")
      .select("venue_key, x, y");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ layouts: data ?? [] }, NO_CACHE);
  }

  const { data, error } = await supabase
    .from("map_layout")
    .select("class_code, x, y, capacity, thresh_mid, thresh_high, thresh_full");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layouts: data ?? [] }, NO_CACHE);
}

// POST: クラスのマップ配置・設定を一括保存
export async function POST(req: Request) {
  const body = await req.json();
  const { type, layouts } = body;

  if (!layouts || !Array.isArray(layouts)) {
    return NextResponse.json({ error: "layouts array required" }, { status: 400 });
  }

  if (type === "venue") {
    // 会場マップ配置を保存
    for (const layout of layouts) {
      const { error } = await supabase
        .from("venue_map_layout")
        .upsert({
          venue_key:  layout.venue_key,
          x:          layout.x,
          y:          layout.y,
          updated_at: new Date().toISOString(),
        }, { onConflict: "venue_key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // クラスマップ配置を保存
    for (const layout of layouts) {
      const { error } = await supabase
        .from("map_layout")
        .upsert({
          class_code:  layout.class_code,
          x:           layout.x,
          y:           layout.y,
          capacity:    layout.capacity,
          thresh_mid:  layout.thresh_mid,
          thresh_high: layout.thresh_high,
          thresh_full: layout.thresh_full,
          updated_at:  new Date().toISOString(),
        }, { onConflict: "class_code" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
