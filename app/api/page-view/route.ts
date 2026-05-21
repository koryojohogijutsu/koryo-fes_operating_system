import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 記録しないパス（静的ファイル・API・内部パス）
const IGNORE_PREFIXES = [
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

const ADMIN_PREFIXES = [
  "/admin",
  "/event-admin",
  "/event-manage",
  "/staff",
];

export async function POST(req: NextRequest) {
  const { page, visitorId } = await req.json();

  if (!page) return NextResponse.json({ ok: false });

  // 無視するパスはスキップ
  if (IGNORE_PREFIXES.some((p) => page.startsWith(p))) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const isAdmin = ADMIN_PREFIXES.some((p) => page.startsWith(p));

  await supabase.from("page_views").insert({
    visitor_id: visitorId ?? null,
    page,
    is_admin:   isAdmin,
    viewed_at:  new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
