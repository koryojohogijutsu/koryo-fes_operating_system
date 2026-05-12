import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();

  const cookie = req.headers.get("cookie");
  const visitorId = cookie?.split("; ").find((row) => row.startsWith("visitor_id="))?.split("=")[1];
  // visitor_typeをcookieから取得（紙チケ来場者のみ設定されている）
  const visitorType = cookie?.split("; ").find((row) => row.startsWith("visitor_type="))?.split("=")[1] ?? "smartphone";

  if (!visitorId) {
    return NextResponse.json({ error: "visitor_id missing" }, { status: 400 });
  }

  const { error } = await supabase.from("visits").insert({
    visitor_id:    visitorId,
    transport:     body.transport,
    gender:        body.gender,
    age:           body.age,
    visitor_type:  visitorType, // "student" | "paper" | "smartphone"
    entered_at:    new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  const expires = new Date();
  expires.setDate(expires.getDate() + 180);
  response.cookies.set("visitor_id", visitorId, { path: "/", sameSite: "lax", expires });

  return response;
}
