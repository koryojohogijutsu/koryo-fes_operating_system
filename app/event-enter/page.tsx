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
  const scanningRef = useRef(false);
  const hashMapRef = useRef<Record<string, string>>({});
  const lastScanRef = useRef<{ hash: string; time: number } | null>(null);

  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [eventVisits, setEventVisits] = useState<EventVisit[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [voting, setVoting] = useState(false);

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

    Promise.all(EVENT_KEYS.map(async (key) => ({ key, hash: await sha256(key) })))
      .then((pairs) => {
        const map: Record<string, string> = {};
        pairs.forEach(({ key, hash }) => { map[hash] = key; });
        hashMapRef.current = map;
      });

    fetchHistory(id);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  const fetchHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/event-enter?visitorId=${id}`);
      const data = await res.json();
      setEventVisits(data.visits ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScan = async (scanned: string) => {
    if (scanningRef.current || !visitorId) return;

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

    const res = await fetch("/api/event-enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, eventKey }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage({ text: `✅ ${EVENT_LABELS[eventKey]} に入場しました！`, ok: true });
      fetchHistory(visitorId);
      stopScanner();
    } else {
      setMessage({ text: `❌ ${data.error || "エラーが発生しました"}`, ok: false });
      setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2500);
    }
  };

  const startScanner = async () => {
    if (isInitializing || scanning) return;
    setIsInitializing(true);
    setMessage(null);

    // 1. まず表示状態にする（これでDOMのdisplayがblockになる）
    setScanning(true);

    // 2. DOMがレンダリングされるのを少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("event-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 // 正方形で表示
        },
        handleScan,
        () => {} 
      );
    } catch (err) {
      console.error("Scanner start error:", err);
      setMessage({ text: "カメラを起動できませんでした。ブラウザの設定で許可してください。", ok: false });
      setScanning(false); // 失敗したら非表示に戻す
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Stop error:", err);
      } finally {
        scannerRef.current = null;
        setScanning(false);
        scanningRef.current = false;
      }
    }
  };

  const handleVoteButton = async () => {
    if (!visitorId || voting) return;
    setVoting(true);

    const res = await fetch(`/api/event-enter?visitorId=${visitorId}`);
    const data = await res.json();
    const visits: EventVisit[] = data.visits ?? [];

    if (visits.length === 0) {
      alert("まだイベントに入場していません");
      setVoting(false);
      return;
    }

    const latest = visits[visits.length - 1];
    const category = latest.event_key;

    const statusRes = await fetch(`/api/event-vote-status?eventKey=${category}`);
    const statusData = await statusRes.json();

    if (!statusData.is_open) {
      alert(`「${EVENT_LABELS[category]}」の投票はまだ開始されていません`);
      setVoting(false);
      return;
    }

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

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={scanning ? stopScanner : startScanner}
          disabled={isInitializing}
          style={{
            padding: "14px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: isInitializing ? "not-allowed" : "pointer",
            backgroundColor: scanning ? "#555" : "#e10102",
            color: "white",
            border: "none",
            borderRadius: "8px",
            opacity: isInitializing ? 0.7 : 1,
          }}
        >
          {isInitializing ? "カメラ起動中..." : scanning ? "📷 スキャンを停止する" : "📷 QRを読み取る"}
        </button>

        <button
          onClick={handleVoteButton}
          disabled={voting || scanning}
          style={{
            padding: "14px",
            fontSize: "16px",
            cursor: (voting || scanning) ? "not-allowed" : "pointer",
            backgroundColor: "white",
            color: "#e10102",
            border: "2px solid #e10102",
            borderRadius: "8px",
            opacity: scanning ? 0.5 : 1
          }}
        >
          {voting ? "確認中..." : "🗳️ 投票する"}
        </button>
      </div>

      {/* カメラ映像が表示されるエリア */}
      <div
        style={{
          display: scanning ? "block" : "none",
          width: "100%",
          maxWidth: "320px",
          margin: "0 auto 20px",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#000", // 起動前の背景を黒にする
          border: "2px solid #e10102",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <div id="event-reader" style={{ width: "100%", minHeight: "250px" }} />
      </div>

      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px",
          backgroundColor: message.ok ? "#4caf50" : "#f44336",
          color: "white", fontSize: "15px", textAlign: "center", marginBottom: "16px",
          fontWeight: "bold"
        }}>
          {message.text}
        </div>
      )}

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
              <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px" }}>
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
