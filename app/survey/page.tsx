"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ============================================================
// ★ 質問内容
// ============================================================
const QUESTIONS = [
  {
    key: "q1",
    label: "企画内容でよかったところはどこですか？",
    type: "text",
  },
  {
    key: "q2",
    label: "企画内容で改善すべき点を教えてください。",
    type: "text",
  },
  {
    key: "q3",
    label: "その他ご意見ご感想あればご記入ください。",
    type: "text",
  },
] as const;

// ============================================================

type QuestionKey = typeof QUESTIONS[number]["key"];
type Answers = Partial<Record<QuestionKey, string>>;

type TargetItem = { code: string; label: string; type: "class" | "event" };

const EVENT_KEYS = ["nodojiman", "coscon_solo", "coscon_group", "m1"];
const EVENT_LABELS: Record<string, string> = {
  nodojiman:    "のど自慢",
  coscon_solo:  "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1:           "M1",
};

type Phase = "select" | "form" | "done";

export default function SurveyPage() {
  const router = useRouter();
  const [visitorId,    setVisitorId]    = useState<string | null>(null);
  const [phase,        setPhase]        = useState<Phase>("select");
  const [targetType,   setTargetType]   = useState<"class" | "event">("class");
  const [targets,      setTargets]      = useState<TargetItem[]>([]);
  const [selected,     setSelected]     = useState<TargetItem | null>(null);
  const [answers,      setAnswers]      = useState<Answers>({});
  const [submitted,    setSubmitted]    = useState<string[]>([]); // 送信済みtargetCode
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    const id = document.cookie
      .split("; ")
      .find((r) => r.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!id) { router.push("/register"); return; }
    setVisitorId(id);

    // 入場済みクラス・イベント取得 + 送信済み取得を並列
    const load = async () => {
      const [classRes, eventRes, submittedRes] = await Promise.all([
        fetch("/api/get-entered-classes", { headers: { "x-visitor-id": id }, cache: "no-store" }),
        fetch(`/api/event-enter?visitorId=${id}`, { cache: "no-store" }),
        fetch(`/api/survey?visitorId=${id}`, { cache: "no-store" }),
      ]);

      const [classData, eventData, submittedData] = await Promise.all([
        classRes.json(),
        eventRes.json(),
        submittedRes.json(),
      ]);

      const classTargets: TargetItem[] = (classData.classCodes ?? []).map((code: string) => ({
        code,
        label: code,
        type: "class" as const,
      }));

      const eventTargets: TargetItem[] = (eventData.visits ?? []).map((v: { event_key: string; event_label: string }) => ({
        code: v.event_key,
        label: v.event_label,
        type: "event" as const,
      }));

      // 重複除去（同じevent_keyが複数あるケース）
      const uniqueEvents = eventTargets.filter(
        (v, i, arr) => arr.findIndex((x) => x.code === v.code) === i
      );

      setTargets([...classTargets, ...uniqueEvents]);
      setSubmitted(submittedData.submitted ?? []);
      setLoading(false);
    };

    load().catch(() => { setError("データの取得に失敗しました"); setLoading(false); });
  }, [router]);

  const classTargets = targets.filter((t) => t.type === "class");
  const eventTargets = targets.filter((t) => t.type === "event");
  const currentTargets = targetType === "class" ? classTargets : eventTargets;

  const handleSelect = (item: TargetItem) => {
    setSelected(item);
    setAnswers({});
    setPhase("form");
  };

  const handleAnswer = (key: QuestionKey, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const allAnswered = QUESTIONS.every((q) => {
    const val = answers[q.key];
    return val !== undefined && val.trim() !== "";
  });

  const handleSubmit = async () => {
    if (!visitorId || !selected) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        targetType:  selected.type,
        targetCode:  selected.code,
        targetLabel: selected.label,
        answers,
      }),
    });

    const data = await res.json();
    if (res.status === 409) {
      setSubmitted((prev) => [...prev, selected.code]);
      setPhase("done");
      setSubmitting(false);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "送信に失敗しました");
      setSubmitting(false);
      return;
    }

    setSubmitted((prev) => [...prev, selected.code]);
    setPhase("done");
    setSubmitting(false);
  };

  if (loading) return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ color: "#aaa" }}>読み込み中...</p>
    </main>
  );

  // ── 選択画面 ──
  if (phase === "select") {
    return (
      <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
          ← ホームに戻る
        </Link>
        <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>📝 アンケート</h1>
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>
          入場したクラス・参加したイベントにアンケートを送れます
        </p>

        {/* クラス / イベント タブ */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["class", "event"] as const).map((t) => (
            <button key={t} onClick={() => setTargetType(t)}
              style={{
                flex: 1, padding: "10px", fontSize: "14px", cursor: "pointer", borderRadius: "8px", border: "2px solid",
                borderColor: targetType === t ? "#e10102" : "#ddd",
                backgroundColor: targetType === t ? "#fff5f5" : "white",
                color: targetType === t ? "#e10102" : "#555",
                fontWeight: targetType === t ? "bold" : "normal",
              }}>
              {t === "class" ? "🏫 クラス" : "🎤 イベント"}
            </button>
          ))}
        </div>

        {currentTargets.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "14px", textAlign: "center", padding: "32px 0" }}>
            {targetType === "class" ? "まだクラスに入場していません" : "まだイベントに参加していません"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {currentTargets.map((item) => {
              const done = submitted.includes(item.code);
              return (
                <div key={item.code}
                  onClick={() => !done && handleSelect(item)}
                  style={{
                    padding: "14px 16px", borderRadius: "10px",
                    border: done ? "1px solid #ddd" : "1px solid #ddd",
                    backgroundColor: done ? "#f9f9f9" : "white",
                    cursor: done ? "not-allowed" : "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    opacity: done ? 0.6 : 1,
                  }}>
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "15px" }}>{item.label}</span>
                    {done && <span style={{ display: "block", fontSize: "12px", color: "#4caf50", marginTop: "2px" }}>✅ 送信済み</span>}
                  </div>
                  {!done && <span style={{ color: "#ccc", fontSize: "18px" }}>›</span>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  // ── フォーム画面 ──
  if (phase === "form" && selected) {
    return (
      <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
        <button onClick={() => setPhase("select")}
          style={{ background: "none", border: "none", color: "#888", fontSize: "14px", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
          ← 戻る
        </button>
        <h1 style={{ fontSize: "18px", marginBottom: "4px" }}>📝 アンケート</h1>
        <p style={{ color: "#e10102", fontSize: "14px", fontWeight: "bold", marginBottom: "24px" }}>{selected.label}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {QUESTIONS.map((q, idx) => (
            <div key={q.key}>
              <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px", color: "#222" }}>
                Q{idx + 1}. {q.label}
              </p>

              {q.type === "text" && (
                <textarea
                  value={answers[q.key] ?? ""}
                  onChange={(e) => handleAnswer(q.key, e.target.value)}
                  placeholder="ご記入ください"
                  rows={3}
                  style={{
                    width: "100%", padding: "12px", fontSize: "14px", borderRadius: "8px",
                    border: "1px solid #ddd", resize: "vertical", boxSizing: "border-box",
                    fontFamily: "sans-serif",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: "16px", padding: "10px", backgroundColor: "#fff0f0", border: "1px solid #f44336", borderRadius: "8px", color: "#f44336", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!allAnswered || submitting}
          style={{
            marginTop: "32px", width: "100%", padding: "14px", fontSize: "16px",
            cursor: allAnswered && !submitting ? "pointer" : "not-allowed",
            backgroundColor: allAnswered && !submitting ? "#e10102" : "#ccc",
            color: "white", border: "none", borderRadius: "8px", fontWeight: "bold",
          }}>
          {submitting ? "送信中..." : "アンケートを送信する"}
        </button>
      </main>
    );
  }

  // ── 完了モーダル ──
  return (
    <>
      <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
          ← ホームに戻る
        </Link>
      </main>

      <div style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "20px",
      }}>
        <div style={{
          backgroundColor: "white", borderRadius: "20px", padding: "32px 24px",
          textAlign: "center", maxWidth: "360px", width: "100%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px", color: "#222" }}>
            ご協力ありがとうございました！
          </h2>
          <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
            アンケートを送信しました
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => setPhase("select")}
              style={{ padding: "12px", fontSize: "15px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
              別のアンケートに回答する
            </button>
            <Link href="/"
              style={{ padding: "12px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", textDecoration: "none", display: "block" }}>
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
