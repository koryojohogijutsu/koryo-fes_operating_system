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
  // decoded_cd: cd=の元の値（suffix含む）をURLデコードして記録
  const decodedCdRaw = cookie?.split("; ").find((row) => row.startsWith("decoded_cd="))?.split("=")[1];
  const decodedCd = decodedCdRaw ? decodeURIComponent(decodedCdRaw) : null;
  const ticketNumRaw = cookie?.split("; ").find((row) => row.startsWith("ticket_num="))?.split("=")[1];
  const ticketNum = ticketNumRaw ? decodeURIComponent(ticketNumRaw) : null;

  if (!visitorId) {
    return NextResponse.json({ error: "visitor_id missing" }, { status: 400 });
  }

  const { error } = await supabase.from("visits").insert({
    visitor_id:    visitorId,
    transport:     body.transport,
    gender:        body.gender,
    age:           body.age,
    visitor_type:  visitorType, // "student" | "teacher" | "paper" | "smartphone"
    decoded_cd:    decodedCd,   // cd=の元の値（suffix含む）
    ticket_num:    ticketNum,   // tk=の番号
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
