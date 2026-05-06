import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 投票ステータス確認
export async function GET(req: NextRequest) {
  const eventKey = req.nextUrl.searchParams.get("eventKey");
  if (!eventKey) return NextResponse.json({ error: "eventKey missing" }, { status: 400 });

  const { data } = await supabase
    .from("event_vote_status")
    .select("is_open")
    .eq("event_key", eventKey)
    .single();

  return NextResponse.json({ is_open: data?.is_open ?? false });
}

// 投票開始・〆切
export async function POST(req: Request) {
  const { eventKey, isOpen } = await req.json();
  if (!eventKey || typeof isOpen !== "boolean") {
    return NextResponse.json({ error: "eventKey と isOpen は必須です" }, { status: 400 });
  }

  const { error } = await supabase
    .from("event_vote_status")
    .upsert(
      { event_key: eventKey, is_open: isOpen, updated_at: new Date().toISOString() },
      { onConflict: "event_key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
