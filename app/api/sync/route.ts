import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

export const dynamic  = "force-dynamic";
export const maxDuration = 300;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ai-api.koryo-fes.com";
const BASE_URL        = "https://venue.koryo-fes.com";

// ── スクレイピング対象URL（管理者ページ以外の全来場者向けページ） ────────
const TARGET_URLS: { url: string; label: string }[] = [
  { url: `${BASE_URL}/`,                label: "トップ・ホーム" },
  { url: `${BASE_URL}/map`,             label: "マップ・混雑情報" },
  { url: `${BASE_URL}/info`,            label: "インフォメーション（お知らせ・落とし物）" },
  { url: `${BASE_URL}/event-enter`,     label: "イベント入場・投票" },
  { url: `${BASE_URL}/vote`,            label: "クラス投票トップ" },
  { url: `${BASE_URL}/vote/class`,      label: "クラス投票一覧" },
  { url: `${BASE_URL}/puzzle`,          label: "謎解き" },
  { url: `${BASE_URL}/survey`,          label: "アンケート" },
  { url: `${BASE_URL}/history`,         label: "入退場履歴" },
  { url: `${BASE_URL}/penlight`,        label: "ペンライト" },
  { url: `${BASE_URL}/register`,        label: "来場者登録" },
];

// ── テキスト抽出・サニタイズ ─────────────────────────────────────────────
function extractText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, head, noscript, [aria-hidden='true']").remove();
  const text = $("main").text() || $("article").text() || $("body").text();
  return text
    .replace(/\s+/g, " ")
    .replace(/\u3000/g, " ")
    .trim()
    .slice(0, 8000);
}

// ── Ollama Embedding 取得 ────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mxbai-embed-large", prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embedding error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding as number[];
}

// ── メインハンドラ ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 認証チェック — シークレットは環境変数 SYNC_SECRET のみで管理
  const secret =
    req.headers.get("x-sync-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: { url: string; label: string; status: "ok" | "error"; message?: string }[] = [];

  for (const target of TARGET_URLS) {
    try {
      const htmlRes = await fetch(target.url, {
        headers: { "User-Agent": "KoryoFes-SyncBot/1.0" },
        cache: "no-store",
      });
      if (!htmlRes.ok) throw new Error(`HTTP ${htmlRes.status}`);

      const text = extractText(await htmlRes.text());
      if (!text || text.length < 20) {
        results.push({ url: target.url, label: target.label, status: "error", message: "テキストが短すぎます" });
        continue;
      }

      const embedding = await getEmbedding(text);

      const { error } = await supabase
        .from("documents")
        .upsert({ content: text, url: target.url, embedding }, { onConflict: "url" });

      if (error) throw new Error(error.message);
      results.push({ url: target.url, label: target.label, status: "ok" });
    } catch (e) {
      results.push({
        url:     target.url,
        label:   target.label,
        status:  "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({ summary: `${ok} / ${results.length} 件成功`, results });
}
