import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { category, name, description, comment } = await req.json();
  if (!category || !name) {
    return NextResponse.json({ error: "category と name は必須です" }, { status: 400 });
  }
  const { error } = await supabase.from("event_entries").insert({
    category,
    name,
    description: description ?? "",
    comment:     comment     ?? "",
    order_num:   Date.now(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const { id, comment } = await req.json();
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  const { error } = await supabase
    .from("event_entries")
    .update({ comment: comment ?? "" })
    .eq("id", id);
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
