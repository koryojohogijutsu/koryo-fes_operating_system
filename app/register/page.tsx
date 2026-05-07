"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TRANSPORT_OPTIONS = [
  { value: "car",   label: "車" },
  { value: "bike",  label: "自転車・バイク" },
  { value: "train", label: "電車" },
  { value: "walk",  label: "徒歩" },
  { value: "bus",   label: "バス" },
  { value: "other", label: "その他" },
];

const GENDER_OPTIONS = [
  { value: "male",   label: "男性" },
  { value: "female", label: "女性" },
  { value: "other",  label: "その他" },
  { value: "none",   label: "回答しない" },
];

const AGE_OPTIONS = [
  { value: "under_elementary", label: "小学生未満" },
  { value: "elementary",       label: "小学生" },
  { value: "junior_high",      label: "中学生" },
  { value: "high_school",      label: "高校生" },
  { value: "university",       label: "大学生・大学院生" },
  { value: "20s",              label: "20代" },
  { value: "30s",              label: "30代" },
  { value: "40s",              label: "40代" },
  { value: "50s",              label: "50代" },
  { value: "60s",              label: "60代" },
  { value: "70s",              label: "70代" },
  { value: "80plus",           label: "80代以上" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step,       setStep]       = useState<"survey" | "submitting">("survey");
  const [transports, setTransports] = useState<string[]>([]);
  const [gender,     setGender]     = useState("");
  const [age,        setAge]        = useState("");

  useEffect(() => {
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!existing) {
      const id = crypto.randomUUID();
      // 半年（180日）有効
      const expires = new Date();
      expires.setDate(expires.getDate() + 180);
      document.cookie = `visitor_id=${id}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    }
  }, []);

  const toggleTransport = (value: string) => {
    setTransports((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (transports.length === 0) { alert("来場手段を1つ以上選択してください"); return; }
    if (!gender) { alert("性別を選択してください"); return; }
    if (!age)    { alert("年齢を選択してください"); return; }

    setStep("submitting");

    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) { alert("エラー: visitor_id が見つかりません"); setStep("survey"); return; }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-visitor-id": visitorId },
      body: JSON.stringify({ transport: transports.join(","), gender, age }),
    });

    if (res.ok) { router.push("/"); }
    else { const r = await res.json(); alert("エラー: " + r.error); setStep("survey"); }
  };

  if (step === "submitting") return <main style={{ padding: "40px", textAlign: "center" }}><p>送信中...</p></main>;

  return (
    <main style={{ padding: "30px 20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "8px", textAlign: "center" }}>入場登録</h1>
      <p style={{ color: "#555", fontSize: "14px", marginBottom: "24px", textAlign: "center" }}>アンケートにご協力ください</p>

      {/* 来場手段（複数回答可） */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ fontWeight: "bold", fontSize: "15px", display: "block", marginBottom: "10px" }}>来場手段（複数回答可）</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {TRANSPORT_OPTIONS.map((opt) => {
            const checked = transports.includes(opt.value);
            return (
              <div key={opt.value} onClick={() => toggleTransport(opt.value)}
                style={{ padding: "12px 16px", borderRadius: "8px", border: checked ? "2px solid #e10102" : "1px solid #ddd", backgroundColor: checked ? "#fff5f5" : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "4px", border: checked ? "none" : "2px solid #ccc", backgroundColor: checked ? "#e10102" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {checked && <span style={{ color: "white", fontSize: "13px", fontWeight: "bold" }}>✓</span>}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* 性別 */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ fontWeight: "bold", fontSize: "15px", display: "block", marginBottom: "10px" }}>性別</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {GENDER_OPTIONS.map((opt) => {
            const selected = gender === opt.value;
            return (
              <div key={opt.value} onClick={() => setGender(opt.value)}
                style={{ padding: "12px", borderRadius: "8px", border: selected ? "2px solid #e10102" : "1px solid #ddd", backgroundColor: selected ? "#fff5f5" : "white", cursor: "pointer", textAlign: "center", fontSize: "14px" }}>
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* 年齢 */}
      <div style={{ marginBottom: "28px" }}>
        <label style={{ fontWeight: "bold", fontSize: "15px", display: "block", marginBottom: "10px" }}>年齢</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {AGE_OPTIONS.map((opt) => {
            const selected = age === opt.value;
            return (
              <div key={opt.value} onClick={() => setAge(opt.value)}
                style={{ padding: "12px 16px", borderRadius: "8px", border: selected ? "2px solid #e10102" : "1px solid #ddd", backgroundColor: selected ? "#fff5f5" : "white", cursor: "pointer", fontSize: "15px" }}>
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={handleSubmit}
        style={{ width: "100%", padding: "14px", fontSize: "16px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        登録してホームへ
      </button>
    </main>
  );
}
