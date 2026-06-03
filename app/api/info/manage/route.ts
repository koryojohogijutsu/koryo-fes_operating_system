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
    const form    = await req.formData();
    const file    = form.get("file")     as File   | null;
    const lostId  = form.get("lostId")   as string | null;
    const noticeId= form.get("noticeId") as string | null;

    if (!file || (!lostId && !noticeId)) {
      return NextResponse.json({ error: "file と lostId or noticeId は必須です" }, { status: 400 });
    }

    const isNotice = !!noticeId;
    const recordId = isNotice ? noticeId! : lostId!;
    const bucket   = isNotice ? "notice-images" : "lost-items";
    const table    = isNotice ? "info_notices"  : "info_lost";

    const ext      = file.name.split(".").pop() ?? "jpg";
    const fileName = `${recordId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from(table)
      .update({ image_url: imageUrl })
      .eq("id", recordId);

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
  const table  = type === "notice" ? "info_notices" : "info_lost";
  const bucket = type === "notice" ? "notice-images" : "lost-items";

  // Storage画像も削除
  const { data: record } = await supabase
    .from(table)
    .select("image_url")
    .eq("id", id)
    .single();

  if (record?.image_url) {
    const fileName = record.image_url.split("/").pop();
    if (fileName) await supabase.storage.from(bucket).remove([fileName]);
  }

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
