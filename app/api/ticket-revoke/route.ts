import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: 無効化済み番号一覧 or 特定番号の確認
export async function GET(req: NextRequest) {
  const supabase = makeClient();
  const ticketNum = req.nextUrl.searchParams.get("ticket_num");

  if (ticketNum) {
    // 特定番号が無効化されているか確認
    const { data, error } = await supabase
      .from("revoked_tickets")
      .select("*")
      .eq("old_ticket_num", ticketNum)
      .single();
    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ revoked: !!data, record: data ?? null });
  }

  // 全一覧
  const { data, error } = await supabase
    .from("revoked_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}

// POST: 番号を無効化して新番号と紐づけ
export async function POST(req: Request) {
  const supabase = makeClient();
  const { oldTicketNum, newTicketNum, reason } = await req.json();

  if (!oldTicketNum || !newTicketNum) {
    return NextResponse.json(
      { error: "oldTicketNum と newTicketNum は必須です" },
      { status: 400 }
    );
  }

  // 既に無効化済みか確認
  const { data: existing } = await supabase
    .from("revoked_tickets")
    .select("id")
    .eq("old_ticket_num", oldTicketNum)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "この番号は既に無効化されています" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("revoked_tickets").insert({
    old_ticket_num: oldTicketNum,
    new_ticket_num: newTicketNum,
    reason: reason ?? "紛失",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE: 無効化レコードを削除（管理用）
export async function DELETE(req: Request) {
  const supabase = makeClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await supabase.from("revoked_tickets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
