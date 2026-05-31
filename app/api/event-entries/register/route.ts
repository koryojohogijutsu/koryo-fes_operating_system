import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: Request) {
  const { category, name, description, comment, datetime, imageUrl, members, festivalDay, orderNum } = await req.json();
  if (!category || !name) return NextResponse.json({ error: "category と name は必須です" }, { status: 400 });
  const { error } = await supabase.from("event_entries").insert({
    category, name,
    description:  description  ?? "",
    comment:      comment      ?? "",
    datetime:     datetime     ?? null,
    image_url:    imageUrl     ?? null,
    members:      members      ?? null,
    festival_day: festivalDay  ?? "day1",
    // orderNumが指定されていればそれを使用、なければMath.floor(Date.now() / 1000000)
    order_num:    typeof orderNum === "number" ? orderNum : Math.floor(Date.now() / 1000000),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const { id, comment, datetime, imageUrl, members, festivalDay, orderNum } = await req.json();
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  const updates: Record<string, any> = { comment: comment ?? "" };
  if (datetime    !== undefined) updates.datetime     = datetime;
  if (imageUrl    !== undefined) updates.image_url    = imageUrl;
  if (members     !== undefined) updates.members      = members;
  if (festivalDay !== undefined) updates.festival_day = festivalDay;
  if (orderNum    !== undefined) updates.order_num    = orderNum;
  const { error } = await supabase.from("event_entries").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  const { error } = await supabase.from("event_entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
