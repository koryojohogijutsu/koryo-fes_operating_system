import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let visitorId = req.headers.get("x-visitor-id");

    if (!visitorId) {
      visitorId = randomUUID();
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("visits").insert({
      visitor_id: visitorId,
      class_code: body.classCode, // ← schoolなし
      entered_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("visitor_id", visitorId, {
      path: "/",
    });

    return response;

  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
