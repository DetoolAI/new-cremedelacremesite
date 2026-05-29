// Wrapper around fetch() that attaches the current Supabase session's
// access token as a Bearer header. Use for any admin-protected route
// (verifyAdmin / requireSupabaseAuth on the server). Without this the
// server returns "Missing bearer token".
import { supabase } from "@/integrations/supabase/client";

export async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const base: Record<string, string> = {};
  if (token) base.Authorization = `Bearer ${token}`;
  if (extra) Object.assign(base, extra as Record<string, string>);
  return base;
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const merged: HeadersInit = await authHeaders(init.headers);
  return fetch(input, { ...init, headers: merged });
}

export async function adminFetchJson(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = await authHeaders({
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  });
  return fetch(input, { ...init, headers });
}
