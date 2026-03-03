import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  // 1日目 or 2日目を判定（手動 or 環境変数などで切替可能）
  const today: number = 2; // 1日目なら1、2日目なら2

  // visitorId を初期化
  let visitorId: string | null = null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // クライアントから visitorId が送られてきた場合は使う
  // (今回は POST body から受け取ることも可能)
  // ここでは単純に新規生成
  visitorId = randomUUID();

  // すでに visitor が存在するか確認
  const { data: existing, error: fetchError } = await supabase
    .from("visitors")
    .select("*")
    .eq("visitor_id", visitorId)
    .single();

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError);
    return NextResponse.json({ error: "来場者確認に失敗しました" }, { status: 500 });
  }

  if (!existing) {
    // 新規登録
    await supabase.from("visitors").insert({
      visitor_id: visitorId,
      day1: today === 1 ? true : false,
      day2: today === 2 ? true : false,
      created_at: new Date().toISOString(),
    });
  } else {
    // 既存 → 両日処理
    if (today === 1 && !existing.day1) {
      await supabase
        .from("visitors")
        .update({ day1: true })
        .eq("visitor_id", visitorId);
    }
    if (today === 2 && !existing.day2) {
      await supabase
        .from("visitors")
        .update({ day2: true })
        .eq("visitor_id", visitorId);
    }
  }

  // Cookie に visitor_id をセット
  const response = NextResponse.json({ success: true });
  response.cookies.set("visitor_id", visitorId, { path: "/" });

  return response;
}
