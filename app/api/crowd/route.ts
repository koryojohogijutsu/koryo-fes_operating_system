import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// クラスごとの在場人数を計算
// stay_minutes以内に入場した人 = 今まだいる人
async function calcClassCrowds() {
  const now = new Date();

  const { data: layouts } = await supabase
    .from("map_layout")
    .select("class_code, capacity, thresh_mid, thresh_high, thresh_full, stay_minutes");

  if (!layouts || layouts.length === 0) return [];

  const results = await Promise.all(
    layouts.map(async (layout) => {
      const stayMs = (layout.stay_minutes ?? 60) * 60 * 1000;
      const since  = new Date(now.getTime() - stayMs).toISOString();

      // 入場記録は消さない。stay_minutes以内の入場数 = 現在の在場人数
      const { count } = await supabase
        .from("visits")
        .select("*", { count: "exact", head: true })
        .eq("class_code", layout.class_code)
        .gte("entered_at", since);

      const current = count ?? 0;
      const pct = layout.capacity > 0 ? (current / layout.capacity) * 100 : 0;

      let level = 0;
      if      (pct >= layout.thresh_full) level = 3;
      else if (pct >= layout.thresh_high) level = 2;
      else if (pct >= layout.thresh_mid)  level = 1;

      return {
        class_code: layout.class_code,
        current,
        capacity:   layout.capacity,
        pct:        Math.round(pct),
        level,
      };
    })
  );

  return results;
}

// GET: 混雑状況取得
// ?type=class | venue | all
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (type === "venue" || type === "all") {
    const { data: venueCrowd } = await supabase
      .from("venue_crowd")
      .select("venue_key, level, updated_at");

    if (type === "venue") {
      return NextResponse.json({ venues: venueCrowd ?? [] }, NO_CACHE);
    }

    const classCrowds = await calcClassCrowds();
    return NextResponse.json({ classes: classCrowds, venues: venueCrowd ?? [] }, NO_CACHE);
  }

  const classCrowds = await calcClassCrowds();
  return NextResponse.json({ classes: classCrowds }, NO_CACHE);
}

// POST: 会場混雑状況を手動更新
export async function POST(req: Request) {
  const body = await req.json();
  const { venueKey, level } = body;

  if (!venueKey || level === undefined) {
    return NextResponse.json({ error: "venueKey and level are required" }, { status: 400 });
  }
  if (level < 0 || level > 3) {
    return NextResponse.json({ error: "level must be 0-3" }, { status: 400 });
  }

  const { error } = await supabase
    .from("venue_crowd")
    .update({ level, updated_at: new Date().toISOString() })
    .eq("venue_key", venueKey);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
