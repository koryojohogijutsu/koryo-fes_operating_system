"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useInfoNotifications, NotificationBanners } from "@/lib/useInfoNotifications";

type VisitorType = "smartphone" | "paper" | "student";
type Status =
  | { state: "loading" }
  | { state: "ok"; visitorId: string; type: VisitorType }
  | { state: "error"; message: string };

function md5(str: string): string {
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md5blk(s: string) { const md5blks: number[] = []; for (let i = 0; i < 64; i += 4) { md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24); } return md5blks; }
  function md5blk_array(a: number[]) { const md5blks: number[] = []; for (let i = 0; i < 64; i += 4) { md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24); } return md5blks; }
  function md5cycle(x: number[], k: number[]) {
    let [a, b, c, d] = x;
    a = md5ff(a,b,c,d,k[0],7,-680876936); d = md5ff(d,a,b,c,k[1],12,-389564586); c = md5ff(c,d,a,b,k[2],17,606105819); b = md5ff(b,c,d,a,k[3],22,-1044525330);
    a = md5ff(a,b,c,d,k[4],7,-176418897); d = md5ff(d,a,b,c,k[5],12,1200080426); c = md5ff(c,d,a,b,k[6],17,-1473231341); b = md5ff(b,c,d,a,k[7],22,-45705983);
    a = md5ff(a,b,c,d,k[8],7,1770035416); d = md5ff(d,a,b,c,k[9],12,-1958414417); c = md5ff(c,d,a,b,k[10],17,-42063); b = md5ff(b,c,d,a,k[11],22,-1990404162);
    a = md5ff(a,b,c,d,k[12],7,1804603682); d = md5ff(d,a,b,c,k[13],12,-40341101); c = md5ff(c,d,a,b,k[14],17,-1502002290); b = md5ff(b,c,d,a,k[15],22,1236535329);
    a = md5gg(a,b,c,d,k[1],5,-165796510); d = md5gg(d,a,b,c,k[6],9,-1069501632); c = md5gg(c,d,a,b,k[11],14,643717713); b = md5gg(b,c,d,a,k[0],20,-373897302);
    a = md5gg(a,b,c,d,k[5],5,-701558691); d = md5gg(d,a,b,c,k[10],9,38016083); c = md5gg(c,d,a,b,k[15],14,-660478335); b = md5gg(b,c,d,a,k[4],20,-405537848);
    a = md5gg(a,b,c,d,k[9],5,568446438); d = md5gg(d,a,b,c,k[14],9,-1019803690); c = md5gg(c,d,a,b,k[3],14,-187363961); b = md5gg(b,c,d,a,k[8],20,1163531501);
    a = md5gg(a,b,c,d,k[13],5,-1444681467); d = md5gg(d,a,b,c,k[2],9,-51403784); c = md5gg(c,d,a,b,k[7],14,1735328473); b = md5gg(b,c,d,a,k[12],20,-1926607734);
    a = md5hh(a,b,c,d,k[5],4,-378558); d = md5hh(d,a,b,c,k[8],11,-2022574463); c = md5hh(c,d,a,b,k[11],16,1839030562); b = md5hh(b,c,d,a,k[14],23,-35309556);
    a = md5hh(a,b,c,d,k[1],4,-1530992060); d = md5hh(d,a,b,c,k[4],11,1272893353); c = md5hh(c,d,a,b,k[7],16,-155497632); b = md5hh(b,c,d,a,k[10],23,-1094730640);
    a = md5hh(a,b,c,d,k[13],4,681279174); d = md5hh(d,a,b,c,k[0],11,-358537222); c = md5hh(c,d,a,b,k[3],16,-722521979); b = md5hh(b,c,d,a,k[6],23,76029189);
    a = md5hh(a,b,c,d,k[9],4,-640364487); d = md5hh(d,a,b,c,k[12],11,-421815835); c = md5hh(c,d,a,b,k[15],16,530742520); b = md5hh(b,c,d,a,k[2],23,-995338651);
    a = md5ii(a,b,c,d,k[0],6,-198630844); d = md5ii(d,a,b,c,k[7],10,1126891415); c = md5ii(c,d,a,b,k[14],15,-1416354905); b = md5ii(b,c,d,a,k[5],21,-57434055);
    a = md5ii(a,b,c,d,k[12],6,1700485571); d = md5ii(d,a,b,c,k[3],10,-1894986606); c = md5ii(c,d,a,b,k[10],15,-1051523); b = md5ii(b,c,d,a,k[1],21,-2054922799);
    a = md5ii(a,b,c,d,k[8],6,1873313359); d = md5ii(d,a,b,c,k[15],10,-30611744); c = md5ii(c,d,a,b,k[6],15,-1560198380); b = md5ii(b,c,d,a,k[13],21,1309151649);
    a = md5ii(a,b,c,d,k[4],6,-145523070); d = md5ii(d,a,b,c,k[11],10,-1120210379); c = md5ii(c,d,a,b,k[2],15,718787259); b = md5ii(b,c,d,a,k[9],21,-343485551);
    x[0]=safeAdd(a,x[0]); x[1]=safeAdd(b,x[1]); x[2]=safeAdd(c,x[2]); x[3]=safeAdd(d,x[3]);
  }
  function md51(s: string) {
    const n = s.length; const state = [1732584193,-271733879,-1732584194,271733878]; let i;
    for (i=64; i<=n; i+=64) { md5cycle(state, md5blk(s.substring(i-64,i))); }
    const tail = s.substring(i-64); const tail2: number[] = [];
    for (let j=0; j<tail.length; j++) tail2[j]=tail.charCodeAt(j);
    tail2[tail.length]=0x80;
    for (let j=tail.length+1; j<64; j++) tail2[j]=0;
    if (tail.length>55) { md5cycle(state, md5blk_array(tail2)); for (let j=0;j<64;j++) tail2[j]=0; }
    tail2[56]=(n*8)&0xff; tail2[57]=((n*8)>>>8)&0xff; tail2[58]=((n*8)>>>16)&0xff; tail2[59]=((n*8)>>>24)&0xff;
    md5cycle(state, md5blk_array(tail2)); return state;
  }
  function rhex(n: number) { const hex="0123456789abcdef"; let s=""; for (let j=0;j<4;j++) s+=hex.charAt((n>>(j*8+4))&0x0f)+hex.charAt((n>>(j*8))&0x0f); return s; }
  const utf8 = unescape(encodeURIComponent(str));
  return md51(utf8).map(rhex).join("");
}

// ── チャットコンポーネント ───────────────────────────────────────────────
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function ChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [bounce,   setBounce]   = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text };
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "エラーが発生しました🙏" } : m));
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // フォーマット: 0:"token"

        for (const line of chunk.split("\n")) {
          if (!line.startsWith("0:")) continue;
          try {
            const token: string = JSON.parse(line.slice(2));
            accumulated += token;
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m));
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "通信エラーが発生しました🙏" } : m));
    } finally {
      setIsLoading(false);
    }
  };

  // 最初の3秒だけバウンスアニメーション
  useEffect(() => {
    const t = setTimeout(() => setBounce(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // 新しいメッセージが来たら一番下にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* キャラクターボタン（右下固定） */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "16px",
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          zIndex: 300,
          padding: 0,
          animation: bounce ? "chatBounce 0.7s infinite alternate" : "none",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
          lineHeight: 0,
        }}
        aria-label="AIアシスタントを開く"
      >
        <img
          src="/mizuchi.gif"
          alt="蛟龍くん"
          style={{ width: "72px", height: "72px", objectFit: "contain" }}
        />
        {/* 未オープン時の吹き出し */}
        {!open && (
          <div style={{
            position: "absolute", bottom: "70px", right: "0",
            backgroundColor: "white", border: "2px solid #e10102",
            borderRadius: "12px 12px 0 12px",
            padding: "4px 10px", fontSize: "11px", fontWeight: "bold",
            color: "#e10102", whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}>
            聞いて！🐉
          </div>
        )}
      </button>

      {/* チャットウィンドウ */}
      {open && (
        <div style={{
          position: "fixed", bottom: "100px", right: "16px",
          width: "min(360px, calc(100vw - 32px))",
          height: "480px",
          backgroundColor: "white",
          borderRadius: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          zIndex: 300,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}>
          {/* ヘッダー */}
          <div style={{
            backgroundColor: "#e10102", color: "white",
            padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px" }}>🐉</span>
              <div>
                <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>蛟龍くん</p>
                <p style={{ fontSize: "11px", margin: 0, opacity: 0.85 }}>蛟龍祭AIアシスタント</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "4px" }}>
              ✕
            </button>
          </div>

          {/* メッセージ一覧 */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "10px",
          }}>
            {/* 最初の案内メッセージ */}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: "28px", margin: "0 0 8px" }}>🐉</p>
                <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.6 }}>
                  こんにちは！蛟龍くんです🎉<br/>
                  蛟龍祭について何でも聞いてね！
                </p>
                {/* クイック質問ボタン */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
                  {["体育館は？", "混んでる？", "落とし物は？", "のど自慢は？"].map((q) => (
                    <button key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => {
                          const form = document.getElementById("chat-form") as HTMLFormElement;
                          form?.requestSubmit();
                        }, 50);
                      }}
                      style={{
                        padding: "6px 12px", fontSize: "12px", cursor: "pointer",
                        backgroundColor: "#fff5f5", color: "#e10102",
                        border: "1px solid #ffd0d0", borderRadius: "16px",
                      }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end", gap: "6px",
              }}>
                {m.role === "assistant" && (
                  <span style={{ fontSize: "20px", flexShrink: 0 }}>🐉</span>
                )}
                <div style={{
                  maxWidth: "76%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  backgroundColor: m.role === "user" ? "#e10102" : "#f5f5f5",
                  color: m.role === "user" ? "white" : "#333",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* ローディングインジケーター */}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                <span style={{ fontSize: "20px" }}>🐉</span>
                <div style={{
                  padding: "10px 14px", borderRadius: "18px 18px 18px 4px",
                  backgroundColor: "#f5f5f5", display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ccc",
                      animation: `chatDot 1.2s ${i * 0.2}s infinite`,
                      display: "inline-block",
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <form id="chat-form" onSubmit={handleSubmit} style={{
            padding: "10px 12px", borderTop: "1px solid #eee",
            display: "flex", gap: "8px", flexShrink: 0,
            backgroundColor: "white",
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="質問を入力..."
              disabled={isLoading}
              style={{
                flex: 1, padding: "10px 14px", fontSize: "14px",
                border: "1px solid #ddd", borderRadius: "20px",
                outline: "none", backgroundColor: isLoading ? "#f9f9f9" : "white",
              }}
            />
            <button type="submit" disabled={isLoading || !input.trim()}
              style={{
                width: "40px", height: "40px", borderRadius: "50%", border: "none",
                backgroundColor: isLoading || !input.trim() ? "#ddd" : "#e10102",
                color: "white", fontSize: "16px", cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
              ➤
            </button>
          </form>
        </div>
      )}

      {/* アニメーション定義 */}
      <style>{`
        @keyframes chatBounce {
          from { transform: translateY(0px); }
          to   { transform: translateY(-8px); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────
export default function Home() {
  return (
    <Suspense fallback={<main style={{ padding:"40px", textAlign:"center" }}><p style={{ color:"#aaa" }}>読み込み中...</p></main>}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status,     setStatus]     = useState<Status>({ state: "loading" });
  const [subModal,   setSubModal]   = useState(false);
  const [clearCount, setClearCount] = useState<number | null>(null);
  const { banners, dismissBanner } = useInfoNotifications();

  useEffect(() => {
    fetch("/api/puzzle-clear?count=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === "number") setClearCount(d.count); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let rawId   = searchParams.get("id");
    let cdParam = searchParams.get("cd");

    if (rawId && rawId.includes(",cd=")) {
      const parts = rawId.split(",cd=");
      rawId   = parts[0];
      cdParam = parts[1];
    }

    const idParam = rawId;

    if (!idParam) {
      const visitorId = document.cookie.split("; ").find((row) => row.startsWith("visitor_id="))?.split("=")[1];
      if (!visitorId) { router.push("/register"); return; }
      setStatus({ state: "ok", visitorId, type: "smartphone" });
      return;
    }

    if (!cdParam) {
      setStatus({ state: "error", message: "無効なURLです（cdパラメータがありません）" });
      return;
    }

    const isStudent    = cdParam.endsWith("m$");
    const cdValue      = isStudent ? cdParam.slice(0, -2) : cdParam;
    const salt         = isStudent ? "akagioroshi" : "kakouryubu";
    const expectedHash = md5(`${idParam}${salt}`);

    if (expectedHash !== cdValue) {
      setStatus({ state: "error", message: "チケットの認証に失敗しました。\nQRコードを正しく読み取ってください。" });
      return;
    }

    const visitorId = cdValue;
    const expires   = new Date();
    expires.setDate(expires.getDate() + 180);
    document.cookie = `visitor_id=${visitorId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    document.cookie = `visitor_type=${isStudent ? "student" : "paper"}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

    setStatus({ state: "ok", visitorId, type: isStudent ? "student" : "paper" });
  }, [searchParams, router]);

  if (status.state === "loading") return <main style={{ padding:"40px", textAlign:"center" }}><p style={{ color:"#aaa" }}>読み込み中...</p></main>;

  if (status.state === "error") return (
    <main style={{ padding:"40px 20px", textAlign:"center" }}>
      <div style={{ fontSize:"48px", marginBottom:"16px" }}>⚠️</div>
      <h1 style={{ fontSize:"20px", marginBottom:"12px" }}>認証エラー</h1>
      <p style={{ color:"#888", whiteSpace:"pre-line", fontSize:"14px" }}>{status.message}</p>
    </main>
  );

  const typeLabel =
    status.type === "student" ? "前高生" :
    status.type === "paper"   ? "一般来場者（紙チケ）" : "第60回 蛟龍祭";

  return (
    <>
      <NotificationBanners banners={banners} dismiss={dismissBanner} />
      <main style={{ padding:"32px 20px 100px", textAlign:"center", maxWidth:"400px", margin:"0 auto", position:"relative" }}>
        <button onClick={() => setSubModal(true)}
          style={{ position:"absolute", top:"20px", right:"20px", width:"40px", height:"40px", borderRadius:"50%", border:"1px solid #ddd", backgroundColor:"white", fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.08)" }}>
          ☰
        </button>

        <h1 style={{ fontSize:"24px", marginBottom:"4px", marginTop:"8px" }}>蛟龍祭 場内サイト</h1>
        <p style={{ color:"#888", fontSize:"13px", marginBottom:"24px" }}>{typeLabel}</p>

        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <Link href="/enter"
            style={{ padding:"18px", fontSize:"17px", cursor:"pointer", backgroundColor:"#e10102", color:"white", border:"none", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            QRを表示する
          </Link>
          <Link href="/vote"
            style={{ padding:"16px", fontSize:"16px", cursor:"pointer", backgroundColor:"white", color:"#e10102", border:"2px solid #e10102", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            🗳️ クラス投票
          </Link>
          <Link href="/event-enter"
            style={{ padding:"16px", fontSize:"16px", cursor:"pointer", backgroundColor:"white", color:"#e10102", border:"2px solid #e10102", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            🎤 イベント入場・投票
          </Link>
          <Link href="/puzzle"
            style={{ padding:"16px", fontSize:"16px", cursor:"pointer", backgroundColor:"white", color:"#e10102", border:"2px solid #e10102", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            🕵️ 謎解き
          </Link>
          <Link href="/survey"
            style={{ padding:"16px", fontSize:"16px", cursor:"pointer", backgroundColor:"white", color:"#e10102", border:"2px solid #e10102", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            📝 アンケート
          </Link>
          <Link href="/info"
            style={{ padding:"16px", fontSize:"16px", cursor:"pointer", backgroundColor:"white", color:"#e10102", border:"2px solid #e10102", borderRadius:"10px", textDecoration:"none", display:"block" }}>
            ℹ️ インフォメーション
          </Link>
        </div>

        {clearCount !== null && clearCount > 0 && (
          <div style={{ marginTop:"24px", display:"inline-flex", alignItems:"center", gap:"6px", backgroundColor:"#fff8e1", border:"1px solid #ffe082", borderRadius:"20px", padding:"8px 20px", fontSize:"13px", color:"#b8860b" }}>
            <span>🏆</span>
            <span>謎解きコンプリート: <strong>{clearCount}人</strong></span>
          </div>
        )}

        <div style={{ marginTop:"24px" }}>
          <a href="/admin" style={{ fontSize:"12px", color:"#ccc", textDecoration:"none" }}>管理者ログイン</a>
        </div>
        <p style={{ marginTop:"16px", fontSize:"11px", color:"#ccc", textAlign:"center" }}>©Koryo Festival Committee　　All Rights Reserved.</p>
      </main>

      {/* サブメニューモーダル */}
      {subModal && (
        <div onClick={() => setSubModal(false)}
          style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor:"white", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:"480px" }}>
            <div style={{ width:"40px", height:"4px", backgroundColor:"#ddd", borderRadius:"2px", margin:"0 auto 20px" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[
                { label:"📋 履歴を見る", path:"/history" },
                { label:"🎇 ペンライト",  path:"/penlight" },
                { label:"📍 マップ",      path:"/map" },
              ].map((item) => (
                <button key={item.label}
                  onClick={() => { router.push(item.path); setSubModal(false); }}
                  style={{ padding:"14px 16px", fontSize:"15px", cursor:"pointer", backgroundColor:"white", color:"#333", border:"1px solid #eee", borderRadius:"8px", textAlign:"left" }}>
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={() => setSubModal(false)}
              style={{ marginTop:"16px", width:"100%", padding:"12px", fontSize:"14px", cursor:"pointer", backgroundColor:"#f5f5f5", color:"#555", border:"none", borderRadius:"8px" }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* AIチャットウィジェット（右下固定） */}
      <ChatWidget />
    </>
  );
}
