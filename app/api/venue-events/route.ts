import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
const NO_CACHE = {
  headers: {
    "Cache-Control":     "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma":            "no-cache",
    "Expires":           "0",
    "Surrogate-Control": "no-store",
  },
};

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

// GET ?venueKey=gym
export async function GET(req: NextRequest) {
  const venueKey = req.nextUrl.searchParams.get("venueKey");
  let query = supabase.from("venue_events").select("*").order("order_num");
  if (venueKey) query = query.eq("venue_key", venueKey);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] }, NO_CACHE);
}

// POST { venueKey, title, description }
export async function POST(req: Request) {
  const { venueKey, title, description } = await req.json();
  if (!venueKey || !title) {
    return NextResponse.json({ error: "venueKey と title は必須です" }, { status: 400 });
  }
  const { error } = await supabase.from("venue_events").insert({
    venue_key:   venueKey,
    title,
    description: description ?? "",
    order_num:   Date.now(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE { id }
export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  const { error } = await supabase.from("venue_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
