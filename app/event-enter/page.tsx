"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

const EVENT_KEYS = ["nodojiman", "coscon_solo", "coscon_group", "m1"];
const EVENT_LABELS: Record<string, string> = {
  nodojiman:    "のど自慢",
  coscon_solo:  "コスコン（個人）",
  coscon_group: "コスコン（団体）",
  m1:           "M1",
};

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type EventVisit = { event_key: string; event_label: string; entered_at: string };

export default function EventEnterPage() {
  const router = useRouter();
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const startedRef  = useRef(false);
  const scanningRef = useRef(false);
  const hashMapRef  = useRef<Record<string, string>>({});
  const lastScanRef = useRef<{ hash: string; time: number } | null>(null);

  const [visitorId,      setVisitorId]      = useState<string | null>(null);
  const [eventVisits,    setEventVisits]    = useState<EventVisit[]>([]);
  const [message,        setMessage]        = useState<{ text: string; ok: boolean } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scanning,       setScanning]       = useState(false);
  const [voting,         setVoting]         = useState(false);

  useEffect(() => {
    const id = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!id) { router.push("/register"); return; }
    setVisitorId(id);

    Promise.all(EVENT_KEYS.map(async (key) => ({ key, hash: await sha256(key) })))
      .then((pairs) => {
        const map: Record<string, string> = {};
        pairs.forEach(({ key, hash }) => { map[hash] = key; });
        hashMapRef.current = map;
      });

    fetchHistory(id);
  }, [router]);

  const fetchHistory = async (id: string) => {
    setLoadingHistory(true);
    const res  = await fetch(`/api/event-enter?visitorId=${id}`);
    const data = await res.json();
    setEventVisits(data.visits ?? []);
    setLoadingHistory(false);
  };

  const handleScan = async (scanned: string) => {
    if (scanningRef.current || !visitorId) return;

    // 10秒以内に同じQRのスキャンを排除
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.hash === scanned && now - lastScanRef.current.time < 10000) {
      return;
    }
    lastScanRef.current = { hash: scanned, time: now };
    scanningRef.current = true;
    setMessage(null);

    const eventKey = hashMapRef.current[scanned.trim()];
    if (!eventKey) {
      setMessage({ text: "❌ 無効なQRコードです", ok: false });
      setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2000);
      return;
    }

    const res  = await fetch("/api/event-enter", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ visitorId, eventKey }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage({ text: `✅ ${EVENT_LABELS[eventKey]} に入場しました！`, ok: true });
      fetchHistory(visitorId);
      // スキャナーを止める
      stopScanner();
      setScanning(false);
    } else {
      setMessage({ text: `❌ ${data.error || "エラーが発生しました"}`, ok: false });
      setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2500);
    }
  };

  const startScanner = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setScanning(true);

    const scanner = new Html5Qrcode("event-reader");
    scannerRef.current = scanner;
    scanner
      .start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, handleScan, () => {})
      .catch(() => {
        setMessage({ text: "カメラを起動できませんでした", ok: false });
        setScanning(false);
        startedRef.current = false;
      });
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    startedRef.current  = false;
    scanningRef.current = false;
  };

  const handleVoteButton = async () => {
    if (!visitorId) return;
    setVoting(true);

    // 直近の入場イベントをDBから取得
    const res  = await fetch(`/api/event-enter?visitorId=${visitorId}`);
    const data = await res.json();
    const visits: EventVisit[] = data.visits ?? [];

    if (visits.length === 0) {
      alert("まだイベントに入場していません");
      setVoting(false);
      return;
    }

    // 直近の入場イベント
    const latest = visits[visits.length - 1];
    const category = latest.event_key;

    // 投票ステータス確認
    const statusRes  = await fetch(`/api/event-vote-status?eventKey=${category}`);
    const statusData = await statusRes.json();

    if (!statusData.is_open) {
      alert(`「${EVENT_LABELS[category]}」の投票はまだ開始されていません`);
      setVoting(false);
      return;
    }

    // 投票ページへ（確認画面から直接投票）
    router.push(`/vote/event/${category}`);
    setVoting(false);
  };

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← ホームに戻る
      </a>

      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎤 イベント</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>
        会場のQRを読み取って入場記録、または投票できます
      </p>

      {/* ボタン2つ */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={scanning ? () => { stopScanner(); setScanning(false); } : startScanner}
          style={{
            padding: "14px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: scanning ? "#555" : "#e10102",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          {scanning ? "📷 スキャン中（タップで停止）" : "📷 QRを読み取る"}
        </button>

        <button
          onClick={handleVoteButton}
          disabled={voting}
          style={{
            padding: "14px",
            fontSize: "16px",
            cursor: voting ? "not-allowed" : "pointer",
            backgroundColor: "white",
            color: "#e10102",
            border: "2px solid #e10102",
            borderRadius: "8px",
          }}
        >
          🗳️ 投票する
        </button>
      </div>

      {/* QRスキャナー */}
      {scanning && (
        <div id="event-reader" style={{ width: "100%", maxWidth: "300px", margin: "0 auto 16px" }} />
      )}
      {!scanning && <div id="event-reader" style={{ display: "none" }} />}

      {/* メッセージ */}
      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px",
          backgroundColor: message.ok ? "#4caf50" : "#f44336",
          color: "white", fontSize: "15px", textAlign: "center", marginBottom: "16px",
        }}>
          {message.text}
        </div>
      )}

      {/* 入場履歴 */}
      <section style={{ marginTop: "12px" }}>
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
