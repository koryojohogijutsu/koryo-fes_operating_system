import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const visitorId = req.headers.get("x-visitor-id");
    if (!visitorId)
      return NextResponse.json(
        { error: "visitor_id missing" },
        { status: 400 }
      );

    const { groupSize, transport } = await req.json();

    const { error } = await supabase.from("visits").insert({
      visitor_id: visitorId,
      group_size: groupSize,
      transport,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /register error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
