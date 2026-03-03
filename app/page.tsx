"use client";
// 1. useRef を追加。useRouter は next/navigation からインポート
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation"; 
import QRScanner from "@/components/QRScanner";

export default function Home() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const hasScanned = useRef(false);

  // visitor_id をクライアント側で生成
  useEffect(() => {
    if (typeof document === "undefined") return;

    const cookies = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="));

    if (!cookies) {
      const visitorId = crypto.randomUUID();
      document.cookie = `visitor_id=${visitorId}; path=/; SameSite=Lax`;
      console.log("visitor_id generated:", visitorId);
    }
  }, []);

  const handleScan = async (classCode: string) => {
    if (hasScanned.current) return;
    hasScanned.current = true;

    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) {
      alert("visitor_id がありません");
      hasScanned.current = false; // Reset
      return;
    }

    try {
      const res = await fetch("/api/enter-class", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-visitor-id": visitorId,
        },
        body: JSON.stringify({ classCode }),
      });

      if (res.ok) {
        alert("入場完了：" + classCode);
      } else {
        const data = await res.json();
        alert("エラー: " + (data.error || "不明"));
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setScanning(false);
    }
  };

  return (
    <main style={{ padding: "20px", textAlign: "center" }}>
      <h1>クラス入場</h1>

      {!scanning && (
        <>
          <button
            onClick={() => {
              hasScanned.current = false; // スキャン開始時にフラグをリセット
              setScanning(true);
            }}
            style={{
              padding: "15px 30px",
              fontSize: "18px",
              cursor: "pointer",
              marginBottom: "20px"
            }}
          >
            QRを読み込む
          </button>

          <br />

          <a href="/vote-auth">
            <button
              style={{
                padding: "10px 25px",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              投票はこちら
            </button>
          </a>
        </>
      )}

      {scanning && <QRScanner onScan={handleScan} />}
    </main>
  );
}
