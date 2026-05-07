import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const [noticeRes, lostRes] = await Promise.all([
    supabase.from("info_notices").select("*").order("created_at", { ascending: false }),
    supabase.from("info_lost").select("*").order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    notices: noticeRes.data ?? [],
    lost:    lostRes.data   ?? [],
  });
}
