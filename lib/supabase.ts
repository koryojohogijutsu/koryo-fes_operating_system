import { createClient } from "@supabase/supabase-js";

// ブラウザ・サーバー両対応のシングルトンクライアント（anon key用）
// 複数インスタンス生成によるGoTrueClient警告を防ぐ
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ブラウザ環境ではグローバルにキャッシュしてシングルトンを保証
const globalForSupabase = globalThis as unknown as {
  _supabaseClient: ReturnType<typeof createClient> | undefined;
};

export const supabase =
  globalForSupabase._supabaseClient ??
  createClient(supabaseUrl, supabaseAnon);

if (typeof window !== "undefined") {
  globalForSupabase._supabaseClient = supabase;
}

// サーバーサイド専用（Service Role Key）はAPIルート内で都度生成
// ※ Service Role Keyはクライアントに露出させないこと
