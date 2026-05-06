"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

const EVENT_KEYS = ["nodojiman", "coscon_solo", "coscon_group", "m1"];

const EVENT_LABELS: Record<string, string> = {
  nodojiman: "のど自慢",
  coscon_solo: "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1: "M1",
};

// SHA-256ハッシュ化関数
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type EventVisit = { event_key: string; event_label: string; entered_at: string };

export default function EventEnterPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const scanningRef = useRef(false);
  const hashMapRef = useRef<Record<string, string>>({});

  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [eventVisits, setEventVisits] = useState<EventVisit[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const id = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!id) {
      router.push("/register");
      return;
    }
    setVisitorId(id);

    // ハッシュ逆引きマップを構築
    const initHashes = async () => {
      const map: Record<string, string> = {};
      console.log("--- 登録されている正解ハッシュ一覧 ---");
      for (const key of EVENT_KEYS) {
        const hash = await sha256(key);
        map[hash] = key;
        // 開発者ツールのコンソールでこれを確認してください
        console.log(`${EVENT_LABELS[key]}: ${hash}`);
      }
      hashMapRef.current = map;
      console.log("---------------------------------------");
    };

    initHashes();
    fetchHistory(id);
  }, [router]);

  const fetchHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/event-enter?visitorId=${id}`);
      const data = await res.json();
      setEventVisits(data.visits ?? []);
    } catch (e) {
      console.error("履歴の取得に失敗しました");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScan = async (scanned: string) => {
    if (scanningRef.current || !visitorId) return;
    
    // 前後の空白・改行を除去し、小文字に統一
    const cleanScanned = scanned.trim().toLowerCase();
    
    // デバッグ用スキャン値ログ
    console.log("スキャンされた値:", cleanScanned);

    const eventKey = hashMapRef.current[cleanScanned];

    if (!eventKey) {
      scanningRef.current = true;
      setMessage({ text: "❌ 無効なQRコードです", ok: false });
      setTimeout(() => {
        scanningRef.current = false;
        setMessage(null);
      }, 2000);
      return;
    }

    // 二重送信防止
    scanningRef.current = true;
    setMessage({ text: "⏳ 送信中...", ok: true });

    try {
      const res = await fetch("/api/event-enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, eventKey }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: `✅ ${EVENT_LABELS[eventKey]} に入場しました！`, ok: true });
        fetchHistory(visitorId);
      } else {
        setMessage({ text: `❌ ${data.error || "エラーが発生しました"}`, ok: false });
      }
    } catch (e) {
      setMessage({ text: "❌ 通信エラーが発生しました", ok: false });
    }

    setTimeout(() => {
      scanningRef.current = false;
      setMessage(null);
    }, 3000);
  };

  useEffect(() => {
    if (!visitorId || startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode("event-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {} // 読み取り失敗（スキャン中）は無視
      )
      .catch((err) => {
        console.error(err);
        setMessage({ text: "カメラを起動できませんでした。ブラウザの設定を確認してください。", ok: false });
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(console.error);
      }
    };
  }, [visitorId]);

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← ホームに戻る
      </a>

      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎤 イベント入場</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
        会場に設置されたQRコードをスキャンしてください
      </p>

      {/* スキャナー表示領域 */}
      <div 
        id="event-reader" 
        style={{ 
          width: "100%", 
          maxWidth: "300px", 
          margin: "0 auto 16px", 
          overflow: "hidden", 
          borderRadius: "12px",
          backgroundColor: "#f0f0f0"
        }} 
      />

      {/* メッセージ表示 */}
      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px",
          backgroundColor: message.ok ? (message.text.includes("⏳") ? "#666" : "#4caf50") : "#f44336",
          color: "white", fontSize: "15px", textAlign: "center", marginBottom: "16px",
          fontWeight: "bold", transition: "all 0.3s"
        }}>
          {message.text}
        </div>
      )}

      {/* 入場履歴セクション */}
      <section style={{ marginTop: "28px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
          入場履歴
        </h2>
        {loadingHistory ? (
          <p style={{ color: "#aaa", fontSize: "13px" }}>読み込み中...</p>
        ) : eventVisits.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "13px" }}>まだ入場記録がありません</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {eventVisits.map((v, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px" }}>
                <strong>{v.event_label}</strong>
                <span style={{ color: "#888", fontSize: "12px" }}>
                  {new Date(v.entered_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
