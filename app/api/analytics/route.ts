import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? "7");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("page_views")
    .select("visitor_id, page, is_admin, viewed_at")
    .gte("viewed_at", since.toISOString())
    .order("viewed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const views = data ?? [];

  // 日別×ページ別集計
  type DayPageKey = string;
  const counts: Record<DayPageKey, number> = {};
  const adminLogs: { date: string; page: string; visitor_id: string; viewed_at: string }[] = [];

  for (const v of views) {
    const date = new Date(v.viewed_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
    const key  = `${date}__${v.page}__${v.is_admin ? "admin" : "user"}`;
    counts[key] = (counts[key] ?? 0) + 1;

    if (v.is_admin) {
      adminLogs.push({
        date,
        page:       v.page,
        visitor_id: v.visitor_id ?? "不明",
        viewed_at:  v.viewed_at,
      });
    }
  }

  // 集計結果を整形
  const summary = Object.entries(counts).map(([key, count]) => {
    const [date, page, type] = key.split("__");
    return { date, page, type, count };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.page.localeCompare(b.page));

  return NextResponse.json({ summary, adminLogs }, NO_CACHE);
}
