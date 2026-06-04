import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE = {
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache", "Expires": "0", "Surrogate-Control": "no-store",
  },
};

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url: RequestInfo | URL, opts: RequestInit = {}) => fetch(url, { ...opts, cache: "no-store" }) } }
  );
}

// GET: ?visitorId=xxx → その来場者の評価済み一覧
// GET: ?summary=1 → 全体の平均評価
export async function GET(req: NextRequest) {
  const supabase   = makeClient();
  const visitorId  = req.nextUrl.searchParams.get("visitorId");
  const summary    = req.nextUrl.searchParams.get("summary");

  if (summary) {
    const { data, error } = await supabase
      .from("event_ratings")
      .select("target_key, target_label, stars");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // target_key ごとに平均・件数を集計
    const map: Record<string, { label: string; total: number; count: number }> = {};
    for (const r of data ?? []) {
      if (!map[r.target_key]) map[r.target_key] = { label: r.target_label, total: 0, count: 0 };
      map[r.target_key].total += r.stars;
      map[r.target_key].count += 1;
    }
    const ratings = Object.entries(map).map(([key, v]) => ({
      target_key:   key,
      target_label: v.label,
      avg:          Math.round((v.total / v.count) * 10) / 10,
      count:        v.count,
    }));
    return NextResponse.json({ ratings }, NO_CACHE);
  }

  if (visitorId) {
    const { data, error } = await supabase
      .from("event_ratings")
      .select("target_key, stars")
      .eq("visitor_id", visitorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // { target_key: stars } のマップで返す
    const rated: Record<string, number> = {};
    for (const r of data ?? []) rated[r.target_key] = r.stars;
    return NextResponse.json({ rated }, NO_CACHE);
  }

  return NextResponse.json({ error: "visitorId or summary required" }, { status: 400 });
}

// POST: { visitorId, targetKey, targetLabel, stars }
export async function POST(req: Request) {
  const supabase = makeClient();
  const { visitorId, targetKey, targetLabel, stars } = await req.json();

  const visitorIdStr = String(visitorId).trim();

  if (!visitorId || !targetKey || !stars) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }
  if (stars < 1 || stars > 5) {
    return NextResponse.json({ error: "starsは1〜5で指定してください" }, { status: 400 });
  }

  const { error } = await supabase
    .from("event_ratings")
    .upsert(
      { visitor_id: visitorId, target_key: targetKey, target_label: targetLabel, stars, rated_at: new Date().toISOString() },
      { onConflict: "visitor_id,target_key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
