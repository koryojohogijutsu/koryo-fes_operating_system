import { NextRequest, NextResponse } from "next/server";

// 記録しないパス
const IGNORE = [
  "/api/",
  "/_next/",
  "/favicon",
  "/crowd-",
  "/map.",
  "/venue-map",
  "/puzzle/",
  "/class-images/",
  "/live/",
  "/survey/",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 無視するパスはスキップ
  if (IGNORE.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ページリクエストのみ記録（HTMLリクエスト）
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return NextResponse.next();
  }

  // cookieからvisitor_idを取得
  const visitorId = req.cookies.get("visitor_id")?.value ?? null;

  // 非同期でアクセス記録（レスポンスをブロックしない）
  const baseUrl = req.nextUrl.origin;
  fetch(`${baseUrl}/api/page-view`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ page: pathname, visitorId }),
  }).catch(() => {}); // エラーは無視

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
