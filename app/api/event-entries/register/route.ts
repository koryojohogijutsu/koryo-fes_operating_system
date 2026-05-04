import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { category, name, description } = await req.json();

  if (!category || !name) {
    return NextResponse.json({ error: "カテゴリと氏名は必須です" }, { status: 400 });
  }

  // 現在のカテゴリ内の最大order_numを取得
  const { data: existing } = await supabase
    .from("event_entries")
    .select("order_num")
    .eq("category", category)
    .order("order_num", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_num ?? 0) + 1;

  const { error } = await supabase.from("event_entries").insert({
    category,
    name,
    description: description ?? "",
    order_num: nextOrder,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "idは必須です" }, { status: 400 });
  }

  const { error } = await supabase.from("event_entries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
