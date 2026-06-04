import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 答えはサーバー側環境変数のみ（NEXT_PUBLIC_ 不使用 → クライアントJSに漏れない）
// Vercelの環境変数名: PUZZLE_ANS_0 〜 PUZZLE_ANS_5
function getAnswers(index: number): string[] {
  const raw = process.env[`PUZZLE_ANS_${index}`] ?? "";
  return raw.split("|").map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: NextRequest) {
  const { questionIndex, answer } = await req.json();

  if (typeof questionIndex !== "number" || questionIndex < 0 || questionIndex > 5) {
    return NextResponse.json({ error: "invalid question" }, { status: 400 });
  }
  if (typeof answer !== "string") {
    return NextResponse.json({ error: "invalid answer" }, { status: 400 });
  }

  const correct = getAnswers(questionIndex);
  if (correct.length === 0) {
    return NextResponse.json({ error: "answer not configured" }, { status: 500 });
  }

  const isCorrect = correct.some(
    (c) => answer.trim().toLowerCase() === c.toLowerCase()
  );

  return NextResponse.json({ correct: isCorrect });
}
