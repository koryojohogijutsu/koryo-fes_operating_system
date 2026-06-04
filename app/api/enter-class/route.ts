import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isClassCode(code: string): boolean {
  return /^\d+-\d+$/.test(code);
}

export async function POST(req: NextRequest) {
  const supabase = makeClient();
  const { visitorId, classCode, visitorType } = await req.json();

  if (!visitorId || !classCode) {
    return NextResponse.json({ error: "visitorId と classCode は必須です" }, { status: 400 });
  }

  // visitor_id を必ず文字列（text）として扱う
  const visitorIdStr = String(visitorId).trim();

  // visits テーブルに入場記録
  const { error: visitError } = await supabase.from("visits").insert({
    visitor_id:   visitorIdStr,
    class_code:   classCode,
    entered_at:   new Date().toISOString(),
    visitor_type: visitorType ?? "smartphone", // paper / student / teacher / smartphone
  });

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  // *-* 形式でない場合はevent_visitsにも記録
  if (!isClassCode(classCode)) {
    const { data: classData } = await supabase
      .from("classes")
      .select("label")
      .eq("code", classCode)
      .single();

    await supabase.from("event_visits").insert({
      visitor_id:  visitorIdStr,
      event_key:   classCode,
      event_label: `部活動企画 / ${classData?.label ?? classCode}`,
      entered_at:  new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}
