import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();

  // cookieからvisitor_idを取得
  const cookie = req.headers.get("cookie");
  const visitorId = cookie
    ?.split("; ")
    .find((row) => row.startsWith("visitor_id="))
    ?.split("=")[1];

  if (!visitorId) {
    return NextResponse.json({ error: "visitor_id missing" }, { status: 400 });
  }

  // visitsテーブルにアンケート情報を記録
  const { error } = await supabase.from("visits").insert({
    visitor_id: visitorId,
    transport:  body.transport,
    gender:     body.gender,
    age:        body.age,
    entered_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  // 半年（180日）有効
  const expires = new Date();
  expires.setDate(expires.getDate() + 180);
  response.cookies.set("visitor_id", visitorId, { path: "/", sameSite: "lax", expires });

  return response;
}
