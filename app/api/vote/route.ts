import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { visitorId, type, selections } = await req.json();

  if (!visitorId || !type || !selections) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  // 重複投票チェック：同じ visitor_id × category の組み合わせが既にあれば拒否
  const categories = Object.keys(selections);
  const { data: existing } = await supabase
    .from("votes")
    .select("category")
    .eq("visitor_id", visitorId)
    .eq("vote_type", type)
    .in("category", categories);

  if (existing && existing.length > 0) {
    const duplicated = existing.map((r) => r.category).join("、");
    return NextResponse.json(
      { error: `すでに投票済みです（${duplicated}）` },
      { status: 409 }
    );
  }

  const rows = Object.entries(selections).map(([category, targetId]) => ({
    visitor_id: visitorId,
    vote_type:  type,
    category,
    target_id:  targetId,
    voted_at:   new Date().toISOString(),
  }));

  const { error } = await supabase.from("votes").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
