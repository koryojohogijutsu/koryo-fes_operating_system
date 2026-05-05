import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EVENT_LABELS: Record<string, string> = {
  nodojiman:    "のど自慢",
  coscon_solo:  "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1:           "M1",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  const { data, error } = await supabase
    .from("event_visits")
    .select("event_key, entered_at")
    .eq("visitor_id", visitorId)
    .order("entered_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const visits = (data ?? []).map((v) => ({
    event_key:   v.event_key,
    event_label: EVENT_LABELS[v.event_key] ?? v.event_key,
    entered_at:  v.entered_at,
  }));

  return NextResponse.json({ visits });
}

export async function POST(req: Request) {
  const { visitorId, eventKey } = await req.json();

  if (!visitorId || !eventKey) {
    return NextResponse.json({ error: "visitorId と eventKey は必須です" }, { status: 400 });
  }

  if (!EVENT_LABELS[eventKey]) {
    return NextResponse.json({ error: "無効なイベントキーです" }, { status: 400 });
  }

  const { error } = await supabase.from("event_visits").insert({
    visitor_id: visitorId,
    event_key:  eventKey,
    entered_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, eventLabel: EVENT_LABELS[eventKey] });
}
