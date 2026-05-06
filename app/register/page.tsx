"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TRANSPORT_OPTIONS = [
  { value: "car",   label: "車" },
  { value: "bike",  label: "自転車・バイク" },
  { value: "train", label: "電車" },
  { value: "walk",  label: "徒歩" },
  { value: "bus",   label: "バス" },
  { value: "other", label: "その他" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step,       setStep]       = useState<"survey" | "submitting">("survey");
  const [groupSize,  setGroupSize]  = useState(1);
  const [transports, setTransports] = useState<string[]>([]);

  useEffect(() => {
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!existing) {
      const id = crypto.randomUUID();
      document.cookie = `visitor_id=${id}; path=/; SameSite=Lax`;
    }
  }, []);

  const toggleTransport = (value: string) => {
    setTransports((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (transports.length === 0) {
      alert("来場手段を1つ以上選択してください");
      return;
    }

    setStep("submitting");

    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) {
      alert("エラー: visitor_id が見つかりません");
      setStep("survey");
      return;
    }

    const res = await fetch("/api/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-visitor-id": visitorId },
      body:    JSON.stringify({ groupSize, transport: transports.join(",") }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      const result = await res.json();
      alert("エラー: " + result.error);
      setStep("survey");
    }
  };

  if (step === "submitting") {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <p>送信中...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "30px 20px", textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>入場登録</h1>
      <p style={{ color: "#555", fontSize: "14px", marginBottom: "30px" }}>
        アンケートにご協力ください
      </p>

      {/* グループ人数 */}
      <div style={{ margin: "16px 0", textAlign: "left" }}>
        <label style={{ fontWeight: "bold", fontSize: "15px" }}>グループの人数</label>
        <select
          value={groupSize}
          onChange={(e) => setGroupSize(Number(e.target.value))}
          style={{ marginTop: "8px", padding: "10px", fontSize: "16px", width: "100%", borderRadius: "6px", border: "1px solid #ccc" }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>{num}人</option>
          ))}
        </select>
      </div>

      {/* 来場手段（複数回答可） */}
      <div style={{ margin: "20px 0", textAlign: "left" }}>
        <label style={{ fontWeight: "bold", fontSize: "15px" }}>来場手段（複数回答可）</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
          {TRANSPORT_OPTIONS.map((opt) => {
            const checked = transports.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => toggleTransport(opt.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: checked ? "2px solid #e10102" : "1px solid #ddd",
                  backgroundColor: checked ? "#fff5f5" : "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "15px",
                }}
              >
                <span style={{
                  width: "20px", height: "20px",
                  borderRadius: "4px",
                  border: checked ? "none" : "2px solid #ccc",
                  backgroundColor: checked ? "#e10102" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {checked && <span style={{ color: "white", fontSize: "13px", fontWeight: "bold" }}>✓</span>}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "24px",
          padding: "14px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#e10102",
          color: "white",
          border: "none",
          borderRadius: "8px",
          width: "100%",
        }}
      >
        登録してホームへ
      </button>
    </main>
  );
}
