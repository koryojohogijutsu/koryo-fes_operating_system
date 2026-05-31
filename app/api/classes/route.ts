import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
const NO_CACHE = {
  headers: {
    "Cache-Control":     "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma":            "no-cache",
    "Expires":           "0",
    "Surrogate-Control": "no-store",
  },
};

export async function GET() {
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

  const { data, error } = await supabase
    .from("classes")
    .select("id, code, label, comment, image_url")
    .order("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const classes = (data ?? []).map((c) => ({
    id:        c.id        ?? "",
    code:      c.code      ?? "",
    label:     c.label     ?? "",
    comment:   c.comment   ?? "",
    image_url: c.image_url ?? null,
  }));

  return NextResponse.json({ classes }, NO_CACHE);
}
