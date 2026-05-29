import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// UTCのDateをJST（UTC+9）の日付文字列に変換
function toJSTDateLabel(utcDate: string): string {
  const d = new Date(utcDate);
  // JSTはUTC+9
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
}

export async function GET(req: NextRequest) {
  const days  = Math.min(Number(req.nextUrl.searchParams.get("days") ?? "7"), 90);
  // JSTで"days日前の0時"を計算
  const now   = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jstNow.setUTCHours(0, 0, 0, 0);
  jstNow.setUTCDate(jstNow.getUTCDate() - days);
  const since = new Date(jstNow.getTime() - 9 * 60 * 60 * 1000); // UTCに戻す

  const { data, error } = await supabase
    .from("page_views")
    .select("visitor_id, page, is_admin, viewed_at")
    .gte("viewed_at", since.toISOString())
    .order("viewed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const views = data ?? [];
  const counts: Record<string, number> = {};
  const adminLogs: { date: string; page: string; visitor_id: string; viewed_at: string }[] = [];
  const userLogs:  { date: string; page: string; visitor_id: string; viewed_at: string }[] = [];

  for (const v of views) {
    const date = toJSTDateLabel(v.viewed_at);
    const key  = `${date}__${v.page}__${v.is_admin ? "admin" : "user"}`;
    counts[key] = (counts[key] ?? 0) + 1;
    const logEntry = { date, page: v.page, visitor_id: v.visitor_id ?? "不明", viewed_at: v.viewed_at };
    if (v.is_admin) { adminLogs.push(logEntry); }
    else            { userLogs.push(logEntry);  }
  }

  const summary = Object.entries(counts).map(([key, count]) => {
    const [date, page, type] = key.split("__");
    return { date, page, type, count };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.page.localeCompare(b.page));

  return NextResponse.json({ summary, adminLogs, userLogs }, NO_CACHE);
}
