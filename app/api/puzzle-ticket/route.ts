import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NO_CACHE = {
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  },
};

export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId) return NextResponse.json({ error: "visitorId missing" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ count: classCount }, { count: eventCount }] = await Promise.all([
    supabase.from("visits").select("*", { count: "exact", head: true }).eq("visitor_id", visitorId),
    supabase.from("event_visits").select("*", { count: "exact", head: true }).eq("visitor_id", visitorId),
  ]);

  const total = (classCount ?? 0) + (eventCount ?? 0);

  return NextResponse.json({ total }, NO_CACHE);
}
