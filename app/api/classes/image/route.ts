import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const code = formData.get("code") as string | null;
  if (!file || !code) return NextResponse.json({ error: "file and code are required" }, { status: 400 });
  const ext  = file.name.split(".").pop() ?? "png";
  const path = `${code}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from("class-images").upload(path, arrayBuffer, {
    contentType: file.type, upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = supabase.storage.from("class-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
