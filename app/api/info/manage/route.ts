import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  // 画像アップロード（multipart/form-data）
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const lostId = form.get("lostId") as string | null;

    if (!file || !lostId) {
      return NextResponse.json({ error: "file と lostId は必須です" }, { status: 400 });
    }

    const ext      = file.name.split(".").pop() ?? "jpg";
    const fileName = `${lostId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("lost-items")
      .upload(fileName, file, { upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("lost-items").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("info_lost")
      .update({ image_url: imageUrl })
      .eq("id", lostId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, imageUrl });
  }

  // 通常のJSON POST（お知らせ・落とし物追加）
  const body = await req.json();
  const { type, ...data } = body;
  const table = type === "notice" ? "info_notices" : "info_lost";
  const { error } = await supabase.from(table).insert({
    ...data,
    created_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 追加したレコードのIDを返す（画像アップロード用）
  const { data: inserted } = await supabase
    .from(table)
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ success: true, id: inserted?.id ?? null });
}

export async function DELETE(req: Request) {
  const { type, id } = await req.json();
  const table = type === "notice" ? "info_notices" : "info_lost";

  // 落とし物の場合、Storageの画像も削除
  if (type === "lost") {
    const { data: record } = await supabase
      .from("info_lost")
      .select("image_url")
      .eq("id", id)
      .single();
    if (record?.image_url) {
      const fileName = record.image_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("lost-items").remove([fileName]);
      }
    }
  }

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
