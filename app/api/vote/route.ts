import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { visitorId, type, selections } = await req.json();

  if (!visitorId || !type || !selections) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  // 各カテゴリをvotesテーブルにinsert
  const rows = Object.entries(selections).map(([category, targetId]) => ({
    visitor_id: visitorId,
    vote_type:  type,       // 'class' | 'event'
    category,              // 'grade1' | 'nodojiman' etc.
    target_id:  targetId,  // class_code or event_entry id
    voted_at:   new Date().toISOString(),
  }));

  const { error } = await supabase.from("votes").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
