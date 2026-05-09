import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CATEGORIES = [
  { key: "grade1",     label: "1年 最優秀賞" },
  { key: "grade2",     label: "2年 最優秀賞" },
  { key: "grade3",     label: "3年 最優秀賞" },
  { key: "decoration", label: "装飾賞（全学年）" },
];

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // クラス投票を全件取得
  const { data: votes, error } = await supabase
    .from("votes")
    .select("category, target_id")
    .eq("vote_type", "class");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // クラス一覧を取得
  const { data: classes } = await supabase
    .from("classes")
    .select("code, label")
    .order("code");

  const classMap: Record<string, string> = {};
  (classes ?? []).forEach((c) => { classMap[c.code] = c.label; });

  // カテゴリごとに集計
  const results = CATEGORIES.map((cat) => {
    const catVotes = (votes ?? []).filter((v) => v.category === cat.key);

    // 得票数を集計
    const countMap: Record<string, number> = {};
    catVotes.forEach((v) => {
      countMap[v.target_id] = (countMap[v.target_id] ?? 0) + 1;
    });

    // ランキング形式に整形
    const ranking = Object.entries(countMap)
      .map(([code, count]) => ({
        code,
        label: classMap[code] ?? "",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      key:     cat.key,
      label:   cat.label,
      total:   catVotes.length,
      ranking,
    };
  });

  return NextResponse.json({ results });
}
