import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const NO_CACHE = { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } };
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const DOSO_ID = "doso-singleton";
export async function GET() {
  const { data } = await supabase.from("doso_info").select("title, datetime, content").eq("id", DOSO_ID).single();
  return NextResponse.json({ info: data ?? null }, NO_CACHE);
}
export async function POST(req: Request) {
  const { title, datetime, content } = await req.json();
  const { error } = await supabase.from("doso_info").upsert(
    { id: DOSO_ID, title: title ?? "", datetime: datetime ?? "", content: content ?? "", updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
