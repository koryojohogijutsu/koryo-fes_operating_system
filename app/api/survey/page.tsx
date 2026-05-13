import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NO_CACHE = {
  headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
};

// アンケート送信
export async function POST(req: Request) {
  const body = await req.json();
  const { visitorId, targetType, targetCode, targetLabel, answers } = body;

  if (!visitorId || !targetType || !targetCode || !answers) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  // 同じvisitorId × targetCodeの二重送信防止
  const { data: existing } = await supabase
    .from("surveys")
    .select("id")
    .eq("visitor_id", visitorId)
    .eq("target_code", targetCode)
    .single();

  if (existing) {
    return NextResponse.json({ error: "already_submitted" }, { status: 409 });
  }

  const { error } = await supabase.from("surveys").insert({
    visitor_id:   visitorId,
    target_type:  targetType,   // "class" | "event"
    target_code:  targetCode,   // クラスコード or イベントキー
    target_label: targetLabel,
    answers:      answers,      // JSONBカラム
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// 送信済みチェック（GET ?visitorId=xxx&targetCode=xxx）
export async function GET(req: NextRequest) {
  const visitorId  = req.nextUrl.searchParams.get("visitorId");
  const targetCode = req.nextUrl.searchParams.get("targetCode");

  if (!visitorId) {
    return NextResponse.json({ error: "visitorId missing" }, { status: 400 });
  }

  const query = supabase
    .from("surveys")
    .select("target_code")
    .eq("visitor_id", visitorId);

  if (targetCode) query.eq("target_code", targetCode);

  const { data } = await query;
  const submitted = (data ?? []).map((r: { target_code: string }) => r.target_code);

  return NextResponse.json({ submitted }, NO_CACHE);
}
