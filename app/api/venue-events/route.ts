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

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const supabase = makeClient();
  const venueKey = req.nextUrl.searchParams.get("venueKey");
  let query = supabase.from("venue_events").select("id, venue_key, title, description, order_num").order("order_num");
  if (venueKey) query = query.eq("venue_key", venueKey);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] }, NO_CACHE);
}

export async function POST(req: Request) {
  const supabase = makeClient();
  const body = await req.json();
  const { venueKey, title, description } = body;

  if (!venueKey || !title) {
    return NextResponse.json({ error: "venueKey と title は必須です" }, { status: 400 });
  }

  // order_numをNumber型で明示的に渡す（bigint対応）
  const orderNum = Number(Math.floor(Date.now() / 1000000));

  const { data, error } = await supabase
    .from("venue_events")
    .insert({
      venue_key:   venueKey,
      title:       title,
      description: description ?? "",
      order_num:   orderNum,
    })
    .select();

  if (error) {
    console.error("venue_events insert error:", error);
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(req: Request) {
  const supabase = makeClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  const { error } = await supabase.from("venue_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
