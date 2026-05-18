import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// *-* 形式かどうか判定（例: 1-1, 2-4）
function isClassCode(code: string): boolean {
  return /^\d+-\d+$/.test(code);
}

export async function POST(req: Request) {
  const { visitorId, classCode } = await req.json();

  if (!visitorId || !classCode) {
    return NextResponse.json({ error: "visitorId と classCode は必須です" }, { status: 400 });
  }

  // visits テーブルに入場記録（従来通り）
  const { error: visitError } = await supabase.from("visits").insert({
    visitor_id: visitorId,
    class_code: classCode,
    entered_at: new Date().toISOString(),
  });

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  // *-* 形式でない場合（将棋部・囲碁部等）はevent_visitsにも記録
  if (!isClassCode(classCode)) {
    // classesテーブルからlabelを取得
    const { data: classData } = await supabase
      .from("classes")
      .select("label")
      .eq("code", classCode)
      .single();

    const eventLabel = classData?.label ?? classCode;

    await supabase.from("event_visits").insert({
      visitor_id:  visitorId,
      event_key:   classCode,
      event_label: `部活動企画 / ${eventLabel}`,
      entered_at:  new Date().toISOString(),
    });
    // event_visitsへの記録失敗はエラーにしない（メイン記録は成功しているため）
  }

  return NextResponse.json({ success: true });
}
