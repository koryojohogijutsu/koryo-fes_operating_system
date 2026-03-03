// app/api/vote/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const visitorId = req.headers.get("x-visitor-id");
    if (!visitorId) {
      return NextResponse.json({ error: "visitor_id missing" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // todayを環境変数か手動で設定
    const today = Number(process.env.FESTIVAL_DAY || 2); // 1 or 2

    // visitor情報取得
    const { data: visitor } = await supabase
      .from("visitors")
      .select("*")
      .eq("visitor_id", visitorId)
      .single();

    if (!visitor) {
      return NextResponse.json({ error: "visitor not found" }, { status: 404 });
    }

    // 投票処理
    if (today === 1) {
      await supabase.from("votes").insert({
        visitor_id: visitorId,
        class_code: body.classCode,
        festival_day: 1,
        voted_at: new Date().toISOString(),
      });
    }

    if (today === 2) {
      if (visitor.day1) {
        // 両日来場者 → 1日目の投票を更新
        await supabase
          .from("votes")
          .update({ class_code: body.classCode })
          .eq("visitor_id", visitorId)
          .eq("festival_day", 1);
      } else {
        // 2日目のみ
        await supabase.from("votes").insert({
          visitor_id: visitorId,
          class_code: body.classCode,
          festival_day: 2,
          voted_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GETで集計
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // RPC関数 vote_counts を呼び出す
    const { data, error } = await supabase.rpc("vote_counts");

    if (error) throw error;

    return NextResponse.json({ counts: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "集計取得失敗" }, { status: 500 });
  }
}
