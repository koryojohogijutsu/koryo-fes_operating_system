import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const visitorId = req.headers.get("x-visitor-id");

    if (!visitorId) {
      return NextResponse.json({ error: "visitor_idなし" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 投票済確認
    const { data: existing } = await supabase
      .from("votes")
      .select("*")
      .eq("visitor_id", visitorId)
      .eq("class_code", body.classCode);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "すでに投票済みです" },
        { status: 400 }
      );
    }

    // 投票保存
    const { error } = await supabase.from("votes").insert({
      visitor_id: visitorId,
      class_code: body.classCode,
      voted_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
