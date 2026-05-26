import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const bucket   = formData.get("bucket") as string | null;
  const path     = formData.get("path") as string | null;
  if (!file || !bucket || !path) {
    return NextResponse.json({ error: "file, bucket, path are required" }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type, upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
