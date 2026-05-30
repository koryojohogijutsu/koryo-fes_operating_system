import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { code, label } = await req.json();
  if (!code || !label) return NextResponse.json({ error: "コードと表示名は必須です" }, { status: 400 });
  const { error } = await supabase.from("classes").insert({ code, label, comment: "", image_url: null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const { id, comment, image_url } = await req.json();
  if (!id) return NextResponse.json({ error: "idは必須です" }, { status: 400 });
  const updates: Record<string, any> = {};
  if (comment   !== undefined) updates.comment   = comment ?? "";
  if (image_url !== undefined) updates.image_url = image_url;
  const { error } = await supabase.from("classes").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "idは必須です" }, { status: 400 });
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
