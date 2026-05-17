import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  }
);

export async function GET() {
  const [noticeRes, lostRes] = await Promise.all([
    supabase.from("info_notices").select("*").order("created_at", { ascending: false }),
    supabase.from("info_lost").select("*").order("created_at", { ascending: false }),
  ]);

  return NextResponse.json(
    {
      notices: noticeRes.data ?? [],
      lost:    lostRes.data   ?? [],
    },
    {
      headers: {
        "Cache-Control":     "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma":            "no-cache",
        "Expires":           "0",
        "Surrogate-Control": "no-store",
      },
    }
  );
}
