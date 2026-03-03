"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [step, setStep] = useState<"complete" | "survey">("complete");
  const [groupSize, setGroupSize] = useState(1);
  const [transport, setTransport] = useState("");
  const router = useRouter();

  // generate visitor_id and save in cookie
  useEffect(() => {
    const cookies = document.cookie.split("; ").reduce((acc: any, row) => {
      const [key, value] = row.split("=");
      acc[key] = value;
      return acc;
    }, {});

    let visitorId = cookies["visitor_id"];
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      document.cookie = `visitor_id=${visitorId}; path=/; SameSite=Lax`;
      console.log("visitor_id generated:", visitorId);
    }
  }, []);

  // 1秒後にアンケート表示
  useEffect(() => {
    const timer = setTimeout(() => setStep("survey"), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) return alert("visitor_id がありません");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({ groupSize, transport }),
    });

    const result = await res.json();
    if (res.ok) {
      router.push("/");
    } else {
      alert("送信エラー: " + result.error);
    }
  };

  return (
    <main style={{ padding: "20px", textAlign: "center" }}>
      {step === "complete" && (
        <div>
          <h1>入場完了</h1>
          <p>入場者登録フォームを準備しています...</p>
        </div>
      )}

      {step === "survey" && (
        <div>
          <h2>入場者登録フォーム</h2>

          <div style={{ margin: "10px 0" }}>
            <label>登録人数</label>
            <br />
            <select
              value={groupSize}
              onChange={(e) => setGroupSize(Number(e.target.value))}
            >
              {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}人
                </option>
              ))}
            </select>
          </div>

          <div style={{ margin: "10px 0" }}>
            <label>来場手段</label>
            <br />
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="car">車</option>
              <option value="bike">自転車・二輪車</option>
              <option value="train">電車</option>
              <option value="walk">徒歩</option>
              <option value="bus">バス</option>
              <option value="other">その他</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            style={{ marginTop: "15px", padding: "10px 20px" }}
          >
            送信してホームへ
          </button>
        </div>
      )}
    </main>
  );
}
