"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"survey" | "submitting">("survey");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [transport, setTransport] = useState("");

  useEffect(() => {
    // visitor_id をcookieから取得 or 新規生成
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!existing) {
      const id = crypto.randomUUID();
      document.cookie = `visitor_id=${id}; path=/; SameSite=Lax`;
    }
  }, []);

  const handleSubmit = async () => {
    if (!gender) {
      alert("性別を選択してください");
      return;
    };
    if (!age) {
      alert("年齢を選択してください");
      return;
    };
    if (!transport) {
      alert("来場手段を選択してください");
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({ gender, age, transport }),
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
      <h1>入場登録</h1>
      <p style={{ color: "#555", fontSize: "14px", marginBottom: "30px" }}>
        アンケートにご協力ください
      </p>

      <div style={{ margin: "16px 0", textAlign: "left" }}>
        <label style={{ fontWeight: "bold" }}>性別</label>
        <br />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{ marginTop: "8px", padding: "10px", fontSize: "16px", width: "100%" }}
        >
          <option value="">選択してください</option>
          <option value="men">男性</option>
          <option value="women">女性</option>
          <option value="other">その他</option>
          <option value="none">回答しない</option>
        </select>
      </div>
      
      <div style={{ margin: "16px 0", textAlign: "left" }}>
        <label style={{ fontWeight: "bold" }}>年齢</label>
        <br />
        <select
          value={age}
          onChange={(e) => setAge(e.target.value)}
          style={{ marginTop: "8px", padding: "10px", fontSize: "16px", width: "100%" }}
        >
          <option value="">選択してください</option>
          <option value="u-elementary">小学生未満</option>
          <option value="elementary">小学生</option>
          <option value="juniorhigh">中学生</option>
          <option value="high">高校生</option>
          <option value="university">大学生・大学院生</option>
          <option value="20">20代 </option>
          <option value="30">30代</option>
          <option value="40">40代</option>
          <option value="50">50代</option>
          <option value="60">60代</option>
          <option value="70">70代</option>
          <option value="80+">80代以上</option>
        </select>
      </div>
      
      <div style={{ margin: "16px 0", textAlign: "left" }}>
        <label style={{ fontWeight: "bold" }}>来場手段</label>
        <br />
        <select
          value={transport}
          onChange={(e) => setTransport(e.target.value)}
          style={{ marginTop: "8px", padding: "10px", fontSize: "16px", width: "100%" }}
        >
          <option value="">選択してください</option>
          <option value="car">車</option>
          <option value="bike">自転車・バイク</option>
          <option value="train">電車</option>
          <option value="walk">徒歩</option>
          <option value="bus">バス</option>
          <option value="other">その他</option>
        </select>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "24px",
          padding: "14px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#1976d2",
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
