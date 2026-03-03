// app/api/register/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const today = Number(process.env.FESTIVAL_DAY || 1); // 1 or 2

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  // クライアント側で cookie に保存されている visitor_id を受け取る
  let visitorId: string | null = body.visitorId || null;

  if (!visitorId) {
    visitorId = randomUUID();
  }

  // 既存 visitor を取得
  const { data: existing } = await supabase
    .from("visitors")
    .select("*")
    .eq("visitor_id", visitorId)
    .single();

  if (!existing) {
    // 新規 visitor
    await supabase.from("visitors").insert({
      visitor_id: visitorId,
      day1: today === 1,
      day2: today === 2,
      created_at: new Date().toISOString(),
    });
  } else {
    // 既存 visitor → 両日対応
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

  const response = NextResponse.json({ success: true, visitorId });
  // cookie に visitor_id を保存
  response.cookies.set("visitor_id", visitorId, { path: "/" });

  return response;
}
