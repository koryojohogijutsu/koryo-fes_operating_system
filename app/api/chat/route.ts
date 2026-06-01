import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;
export const runtime     = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ai-api.koryo-fes.com";

const CHARACTER_PERSONA = `あなたは「蛟龍祭（こうりょうさい）」のAIアシスタントです。自分のことは「蛟（みずち）」と名乗ってください。
蛟龍祭は群馬県立前橋高等学校の文化祭です。
来場者に対して、丁寧かつ親しみやすい口調で案内してください。
以下のルールを守ってください：
- 自称は「蛟」を使う（「私は蛟です」「蛟がお答えします」など）
- 提供されたコンテキスト情報を優先して回答する
- コンテキストに情報がない場合は「詳細は係員にお尋ねください」と伝える
- 回答は簡潔に、200文字以内を目安にする
- 絵文字を適度に使い、読みやすく親しみやすい回答にする`.trim();

async function getQueryEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mxbai-embed-large", prompt: text }),
  });
  if (!res.ok) throw new Error(`embedding error: ${res.status}`);
  return (await res.json()).embedding as number[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages が空です" }, { status: 400 });
    }

    const userQuery = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // RAG: embedding → pgvector検索
    let systemPrompt = CHARACTER_PERSONA;
    try {
      const embedding = await getQueryEmbedding(userQuery);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: docs } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 3,
      });
      if (docs && docs.length > 0) {
        const context = (docs as { content: string }[]).map((d) => d.content).join("\n\n---\n\n");
        systemPrompt = `${CHARACTER_PERSONA}\n\n【参考情報】\n${context}`;
      }
    } catch (e) {
      console.error("RAG failed, continuing without context:", e);
    }

    // Ollamaへストリーミングリクエスト（OpenAI互換API）
    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer ollama" },
      body: JSON.stringify({
        model: "elyza",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      const text = await ollamaRes.text();
      console.error("Ollama error:", text);
      return NextResponse.json({ error: `Ollama error: ${ollamaRes.status}` }, { status: 502 });
    }

    // OllamaのSSEストリームをそのままクライアントへパイプ
    // useChat互換のtext/event-stream形式で返す
    const encoder = new TextEncoder();
    const reader  = ollamaRes.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            // SSEの各行を処理
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const token: string = json.choices?.[0]?.delta?.content ?? "";
                if (token) {
                  // Vercel AI SDK useChat互換フォーマット: 0:"token"\n
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(token)}\n`));
                }
              } catch { /* JSON parse失敗は無視 */ }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (e) {
    console.error("chat route error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
