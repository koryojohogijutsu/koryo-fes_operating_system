"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RevokedRecord = {
  id: string;
  old_ticket_num: string;
  new_ticket_num: string;
  reason: string;
  created_at: string;
};

export default function TicketRevokePage() {
  const router = useRouter();
  const [authed,    setAuthed]    = useState(false);
  const [records,   setRecords]   = useState<RevokedRecord[]>([]);
  const [oldNum,    setOldNum]    = useState("");
  const [newNum,    setNewNum]    = useState("");
  const [reason,    setReason]    = useState("紛失");
  const [saving,    setSaving]    = useState(false);
  const [checkNum,  setCheckNum]  = useState("");
  const [checkResult, setCheckResult] = useState<{ revoked: boolean; record: RevokedRecord | null } | null>(null);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    loadRecords();
  }, [router]);

  const loadRecords = async () => {
    const res = await fetch("/api/ticket-revoke", { cache: "no-store" });
    const data = await res.json();
    setRecords(data.records ?? []);
  };

  const handleRevoke = async () => {
    if (!oldNum.trim() || !newNum.trim()) { alert("元の番号と新しい番号を入力してください"); return; }
    setSaving(true);
    const res = await fetch("/api/ticket-revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldTicketNum: oldNum.trim(), newTicketNum: newNum.trim(), reason }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ 無効化しました");
      setOldNum(""); setNewNum(""); setReason("紛失");
      loadRecords();
    } else {
      alert("エラー: " + data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このレコードを削除しますか？（無効化を取り消します）")) return;
    await fetch("/api/ticket-revoke", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadRecords();
  };

  const handleCheck = async () => {
    if (!checkNum.trim()) return;
    const res = await fetch(`/api/ticket-revoke?ticket_num=${encodeURIComponent(checkNum.trim())}`, { cache: "no-store" });
    const data = await res.json();
    setCheckResult(data);
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px", fontSize: "14px", borderRadius: "6px",
    border: "1px solid #ccc", width: "100%", boxSizing: "border-box",
    backgroundColor: "var(--input-bg)", color: "var(--foreground)",
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "560px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 管理者メニューに戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎫 紙チケット紛失管理</h1>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px" }}>
        前高生の紙チケット紛失時に、元の番号を無効化して新しい番号と紐づけます。
      </p>

      {/* 番号確認 */}
      <div style={{ padding: "16px", border: "1px solid var(--card-border)", borderRadius: "10px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px" }}>🔍 番号の状態を確認</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="チケット番号（tk=の値）"
            value={checkNum}
            onChange={(e) => setCheckNum(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleCheck}
            style={{ padding: "10px 16px", fontSize: "14px", cursor: "pointer", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "6px", flexShrink: 0 }}>
            確認
          </button>
        </div>
        {checkResult !== null && (
          <div style={{ marginTop: "12px", padding: "12px", borderRadius: "8px",
            backgroundColor: checkResult.revoked ? "rgba(244,67,54,0.1)" : "rgba(76,175,80,0.1)",
            border: `1px solid ${checkResult.revoked ? "#f44336" : "#4caf50"}` }}>
            {checkResult.revoked ? (
              <>
                <p style={{ fontWeight: "bold", color: "#f44336" }}>⛔ この番号は無効化されています</p>
                <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                  新しい番号: <strong>{checkResult.record?.new_ticket_num}</strong>
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                  理由: {checkResult.record?.reason} / 登録日時: {checkResult.record ? new Date(checkResult.record.created_at).toLocaleString("ja-JP") : ""}
                </p>
              </>
            ) : (
              <p style={{ fontWeight: "bold", color: "#4caf50" }}>✅ この番号は有効です</p>
            )}
          </div>
        )}
      </div>

      {/* 無効化フォーム */}
      <div style={{ padding: "16px", border: "1px solid var(--card-border)", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px" }}>🚫 番号を無効化する</h2>
        <input
          placeholder="元の番号（紛失したチケットのtk=の値）*"
          value={oldNum}
          onChange={(e) => setOldNum(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="新しい番号（再発行したチケットのtk=の値）*"
          value={newNum}
          onChange={(e) => setNewNum(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="理由（例: 紛失、盗難など）"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleRevoke} disabled={saving}
          style={{ padding: "10px", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saving ? "#ccc" : "#f44336", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold" }}>
          {saving ? "処理中..." : "元の番号を無効化する"}
        </button>
        <p style={{ fontSize: "11px", color: "var(--muted)" }}>
          ⚠️ 無効化すると、元の番号のQRコードはスキャン時に警告が出ます。
        </p>
      </div>

      {/* 一覧 */}
      <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", borderBottom: "2px solid #f44336", paddingBottom: "6px" }}>
        無効化済み番号一覧 ({records.length}件)
      </h2>
      {records.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>まだ無効化された番号はありません</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {records.map((rec) => (
            <div key={rec.id} style={{ padding: "12px 16px", border: "1px solid var(--card-border)", borderRadius: "8px", backgroundColor: "var(--card-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "13px", margin: 0 }}>
                    <span style={{ color: "#f44336", fontWeight: "bold" }}>旧: {rec.old_ticket_num}</span>
                    <span style={{ color: "var(--muted)", margin: "0 8px" }}>→</span>
                    <span style={{ color: "#4caf50", fontWeight: "bold" }}>新: {rec.new_ticket_num}</span>
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                    理由: {rec.reason} ／ {new Date(rec.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
                <button onClick={() => handleDelete(rec.id)}
                  style={{ color: "#888", background: "none", border: "none", cursor: "pointer", fontSize: "12px", flexShrink: 0, marginLeft: "8px" }}>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
