import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { adminId, password } = await req.json();

  const correctId = process.env.ADMIN_ID;
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!adminId || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  if (adminId !== correctId || password !== correctPassword) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  // 認証済みcookieをセット（1日有効）
  const expires = new Date();
  expires.setDate(expires.getDate() + 1);
  response.cookies.set("admin_auth", "1", {
    path: "/",
    expires,
    sameSite: "lax",
  });

  return response;
}
