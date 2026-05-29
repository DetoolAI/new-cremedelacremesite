import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type VerifyAdminResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function verifyAdmin(request: Request): Promise<VerifyAdminResult> {
  const authHeader =
    request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = authHeader.slice(7).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return { ok: false, status: 403, error: "Not authorized" };
  return { ok: true, userId: data.user.id };
}
