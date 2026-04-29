"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COLORS = [
  { name: "レッド",     hex: "#FF0033" },
  { name: "ピンク",     hex: "#FF3399" },
  { name: "オレンジ",   hex: "#FF6600" },
  { name: "イエロー",   hex: "#FFEE00" },
  { name: "ライム",     hex: "#99FF00" },
  { name: "グリーン",   hex: "#00FF66" },
  { name: "シアン",     hex: "#00FFEE" },
  { name: "スカイ",     hex: "#00AAFF" },
  { name: "ブルー",     hex: "#0033FF" },
  { name: "パープル",   hex: "#8800FF" },
  { name: "バイオレット", hex: "#CC00FF" },
  { name: "ホワイト",   hex: "#FFFFFF" },
];

const STYLE = `
  .color-btn {
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .color-btn:active {
    transform: scale(0.9);
  }
`;

export default function PenlightPage() {
  const router = useRouter();
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 画面表示中はスリープを防ぐ（Wake Lock API）
  useEffect(() => {
    if (!activeColor) return;
    let wakeLock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      (navigator.wakeLock as WakeLock).request("screen")
        .then((lock) => { wakeLock = lock; })
        .catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, [activeColor]);

  // フルスクリーン制御
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleColorSelect = (hex: string) => {
    setActiveColor(hex);
  };

  const handleClose = () => {
    setActiveColor(null);
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <style>{STYLE}</style>

      {/* フルスクリーン発光画面 */}
      {activeColor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: activeColor,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "40px",
          }}
        >
          {/* 発光感のためのグラデーションオーバーレイ */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at center, ${activeColor}cc 0%, ${activeColor} 70%)`,
            pointerEvents: "none",
          }} />

          {/* 色選択パレット（前面に表示） */}
          <div style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
            padding: "16px",
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: "20px",
            backdropFilter: "blur(8px)",
            maxWidth: "340px",
            width: "90%",
          }}>
            {COLORS.map((c) => (
              <button
                key={c.hex}
                className="color-btn"
                onClick={() => handleColorSelect(c.hex)}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: c.hex,
                  border: activeColor === c.hex
                    ? "3px solid white"
                    : "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  boxShadow: activeColor === c.hex
                    ? `0 0 12px ${c.hex}, 0 0 24px ${c.hex}`
                    : "none",
                }}
                title={c.name}
              />
            ))}

            {/* 閉じるボタン */}
            <button
              onClick={handleClose}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.5)",
                border: "2px solid rgba(255,255,255,0.5)",
                color: "white",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 通常画面（色選択） */}
      <main style={{ padding: "30px 20px", textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "16px",
            padding: 0,
            display: "block",
          }}
        >
          ← ホームに戻る
        </button>

        <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>🎇 ペンライト</h1>
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "30px" }}>
          色をタップして点灯
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "30px",
        }}>
          {COLORS.map((c) => (
            <button
              key={c.hex}
              className="color-btn"
              onClick={() => handleColorSelect(c.hex)}
              style={{
                aspectRatio: "1",
                borderRadius: "12px",
                backgroundColor: c.hex,
                border: "2px solid rgba(0,0,0,0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${c.hex}66`,
              }}
            >
              <span style={{
                fontSize: "10px",
                color: ["#FFEE00", "#99FF00", "#FFFFFF"].includes(c.hex) ? "#333" : "white",
                fontWeight: "bold",
                marginTop: "4px",
                textShadow: "none",
              }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={toggleFullscreen}
          style={{
            padding: "10px 20px",
            fontSize: "13px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "#555",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          {isFullscreen ? "フルスクリーン解除" : "フルスクリーンで使う"}
        </button>
      </main>
    </>
  );
}
