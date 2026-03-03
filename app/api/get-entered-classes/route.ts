import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const visitorId = req.headers.get("x-visitor-id");

  if (!visitorId) {
    return NextResponse.json({ error: "visitor_idなし" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("visits")
    .select("class_code")
    .eq("visitor_id", visitorId)
    .eq("entered_class", true);

  if (error) {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }

  const classCodes = [...new Set(data.map(d => d.class_code))];

  return NextResponse.json({ classCodes });
}
