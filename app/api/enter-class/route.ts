import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { visitorId, classCode } = await req.json();

    // QRの文字列が空の場合はエラーを返す
    if (!visitorId) {
      return NextResponse.json({ error: "QRコードが無効です" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 送られてきた visitorId (QRの文字列) をそのままDBに保存
    const { error } = await supabase.from("visits").insert({
      visitor_id: visitorId,
      class_code: classCode,
      entered_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, visitorId });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
