"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STYLE = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes spin-rev {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.6); }
  }
  @keyframes corner-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }
  @keyframes notify-in {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

const QR_SIZE = 240;
const GAP = 18;
const R1 = QR_SIZE / 2 + GAP;
const R2 = QR_SIZE / 2 + GAP + 14;
const CX = QR_SIZE / 2 + R2 + 4;
const CY = CX;
const SVG_SIZE = CX * 2;

export default function EnterPage() {
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [notification, setNotification] = useState<{ classCode: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 時計（1秒ごと更新）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

    QRCode.toDataURL(id, {
      width: QR_SIZE,
      margin: 2,
      color: { dark: "#e10102", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(console.error);

    // Supabase Realtime：自分への入場記録を監視
    const channel = supabase
      .channel(`visits:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visits",
          filter: `visitor_id=eq.${id}`,
        },
        (payload) => {
          setNotification({ classCode: payload.new.class_code });
          setTimeout(() => setNotification(null), 5000);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [router]);

  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  const cornerPositions = [
    [CX - QR_SIZE / 2 - GAP / 2, CY - QR_SIZE / 2 - GAP / 2, "0s"],
    [CX + QR_SIZE / 2 + GAP / 2, CY - QR_SIZE / 2 - GAP / 2, "0.4s"],
    [CX - QR_SIZE / 2 - GAP / 2, CY + QR_SIZE / 2 + GAP / 2, "0.8s"],
    [CX + QR_SIZE / 2 + GAP / 2, CY + QR_SIZE / 2 + GAP / 2, "1.2s"],
  ];

  return (
    <>
      <style>{STYLE}</style>

      <main style={{ padding: "24px 20px", textAlign: "center", userSelect: "none" }}>
        <h1 style={{ fontSize: "18px", marginBottom: "2px" }}>あなたのQRコード</h1>
        <p style={{ color: "#888", fontSize: "12px", marginBottom: "16px" }}>
          係員に向けてこの画面を見せてください
        </p>

        {/* 時刻表示 */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            fontSize: "38px",
            fontWeight: "bold",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "3px",
            color: "#111",
          }}>
            {timeStr}
          </div>
          <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
            {dateStr}
          </div>
        </div>

        {/* QR + アニメーション（SVGはQRの外側のみ） */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
        <div style={{
          position: "relative",
          width: `${SVG_SIZE}px`,
          height: `${SVG_SIZE}px`,
          flexShrink: 0,
          transform: `scale(${Math.min(1, 340 / SVG_SIZE)})`,
          transformOrigin: "top center",
        }}>
          {/* SVGアニメーション */}
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {/* 内リング（時計回り破線） */}
            <circle
              cx={CX} cy={CY} r={R1}
              fill="none"
              stroke="#e10102"
              strokeWidth="2"
              strokeDasharray="8 6"
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                animation: "spin 8s linear infinite",
              }}
            />
            {/* 外リング（反時計回り） */}
            <circle
              cx={CX} cy={CY} r={R2}
              fill="none"
              stroke="#e10102"
              strokeWidth="1.5"
              strokeDasharray="3 12"
              opacity="0.35"
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                animation: "spin-rev 12s linear infinite",
              }}
            />
            {/* 四隅の点滅ドット */}
            {cornerPositions.map(([x, y, delay], i) => (
              <circle
                key={i}
                cx={x as number}
                cy={y as number}
                r={4.5}
                fill="#e10102"
                style={{ animation: `corner-blink 1.6s ease-in-out ${delay} infinite` }}
              />
            ))}
            {/* 上下左右の脈動ドット */}
            {[0, 90, 180, 270].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const r = R1 + 8;
              return (
                <circle
                  key={i}
                  cx={CX + r * Math.sin(rad)}
                  cy={CY - r * Math.cos(rad)}
                  r={3}
                  fill="#e10102"
                  opacity="0.65"
                  style={{ animation: `pulse-dot 2s ease-in-out ${i * 0.5}s infinite` }}
                />
              );
            })}
          </svg>

          {/* QR本体（SVGの中央・アニメと重ならない） */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QRコード"
                width={QR_SIZE}
                height={QR_SIZE}
                draggable={false}
                style={{ display: "block", borderRadius: "4px" }}
              />
            ) : (
              <div style={{
                width: QR_SIZE,
                height: QR_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ccc",
              }}>
                生成中...
              </div>
            )}
          </div>
        </div>
        </div>

        <p style={{ fontSize: "11px", color: "#ccc", marginTop: "16px" }}>
          ID: {visitorId?.slice(0, 8)}...
        </p>

        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: "10px",
            padding: "10px 24px",
            fontSize: "14px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "#555",
            border: "1px solid #ddd",
            borderRadius: "6px",
          }}
        >
          ホームに戻る
        </button>
      </main>

      {/* 読み取り通知オーバーレイ */}
      {notification && (
        <div
          onClick={() => setNotification(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "40px 32px",
            textAlign: "center",
            maxWidth: "300px",
            width: "88%",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            animation: "notify-in 0.3s ease",
          }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>✅</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              読み取られました！
            </div>
            <div style={{ fontSize: "15px", color: "#555" }}>
              クラス: <strong>{notification.classCode}</strong>
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "20px" }}>
              タップで閉じる
            </div>
          </div>
        </div>
      )}
    </>
  );
}
