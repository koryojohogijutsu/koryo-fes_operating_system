import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLASS_CATEGORY_LABELS: Record<string, string> = {
  grade1:     "1年 最優秀賞",
  grade2:     "2年 最優秀賞",
  grade3:     "3年 最優秀賞",
  decoration: "装飾賞",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  nodojiman:    "のど自慢",
  coscon_solo:  "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1:           "M1",
};

export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("votes")
    .select("vote_type, category, target_id, voted_at")
    .eq("visitor_id", visitorId)
    .order("voted_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // クラスの表示名を取得
  const classCodes = (data ?? [])
    .filter((v) => v.vote_type === "class")
    .map((v) => v.target_id);

  let classMap: Record<string, string> = {};
  if (classCodes.length > 0) {
    const { data: classes } = await supabase
      .from("classes")
      .select("code, label")
      .in("code", classCodes);
    (classes ?? []).forEach((c) => { classMap[c.code] = c.label; });
  }

  // イベント出場者の表示名を取得
  const entryIds = (data ?? [])
    .filter((v) => v.vote_type === "event")
    .map((v) => v.target_id);

  let entryMap: Record<string, string> = {};
  if (entryIds.length > 0) {
    const { data: entries } = await supabase
      .from("event_entries")
      .select("id, name")
      .in("id", entryIds);
    (entries ?? []).forEach((e) => { entryMap[e.id] = e.name; });
  }

  const votes = (data ?? []).map((v) => ({
    vote_type:      v.vote_type,
    category_label:
      v.vote_type === "class"
        ? CLASS_CATEGORY_LABELS[v.category] ?? v.category
        : EVENT_CATEGORY_LABELS[v.category] ?? v.category,
    target_label:
      v.vote_type === "class"
        ? `${v.target_id}${classMap[v.target_id] ? `（${classMap[v.target_id]}）` : ""}`
        : entryMap[v.target_id] ?? v.target_id,
    voted_at: v.voted_at,
  }));

  return NextResponse.json({ votes });
}
