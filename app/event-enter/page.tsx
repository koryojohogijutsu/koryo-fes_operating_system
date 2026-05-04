"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

// イベント名とSHA256ハッシュの対応表
// ハッシュはビルド時に計算済みのものを埋め込む
const EVENT_MAP: Record<string, string> = {
  nodojiman:    "d0e2c5e5e4e6e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5", // placeholder
  coscon_solo:  "placeholder",
  coscon_group: "placeholder",
  m1:           "placeholder",
};

const EVENT_LABELS: Record<string, string> = {
  nodojiman:    "のど自慢",
  coscon_solo:  "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1:           "M1",
};

// SHA-256を計算する関数（Web Crypto API）
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 起動時にハッシュ対応表を計算
async function buildHashMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const key of Object.keys(EVENT_LABELS)) {
    map[await sha256(key)] = key;
  }
  return map;
}

type EventVisit = {
  event_key: string;
  event_label: string;
  entered_at: string;
};

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

    if (!id) { router.push("/register"); return; }
    setVisitorId(id);

    // ハッシュ対応表を構築
    buildHashMap().then((map) => { hashMapRef.current = map; });

    // 入場履歴を取得
    fetchHistory(id);
  }, [router]);

  const fetchHistory = async (id: string) => {
    setLoadingHistory(true);
    const res = await fetch(`/api/event-enter?visitorId=${id}`);
    const data = await res.json();
    setEventVisits(data.visits ?? []);
    setLoadingHistory(false);
  };

  const handleScan = async (scannedHash: string) => {
    if (scanningRef.current || !visitorId) return;
    scanningRef.current = true;
    setMessage(null);

    // ハッシュからイベントキーを逆引き
    const eventKey = hashMapRef.current[scannedHash.trim()];
    if (!eventKey) {
      setMessage({ text: "❌ 無効なQRコードです", ok: false });
      setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2000);
      return;
    }

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

    setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2500);
  };

  useEffect(() => {
    if (!visitorId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode("event-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan,
        () => {}
      )
      .catch(() => {
        setMessage({ text: "カメラを起動できませんでした", ok: false });
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [visitorId]);

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← ホームに戻る
      </a>

      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>イベント入場</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
        会場のQRコードをスキャンしてください
      </p>

      {/* QRスキャナー */}
      <div id="event-reader" style={{ width: "100%", maxWidth: "300px", margin: "0 auto 16px" }} />

      {/* メッセージ */}
      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          backgroundColor: message.ok ? "#4caf50" : "#f44336",
          color: "white",
          fontSize: "15px",
          textAlign: "center",
          marginBottom: "16px",
        }}>
          {message.text}
        </div>
      )}

      {/* 入場履歴 */}
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
                  {new Date(v.entered_at).toLocaleString("ja-JP", {
                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
