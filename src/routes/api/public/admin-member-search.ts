import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401, error: "Missing bearer token" };
  const token = authHeader.slice(7).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: "Invalid token" };
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).maybeSingle();
  if (!role) return { ok: false as const, status: 403, error: "Not authorized" };
  return { ok: true as const };
}

export const Route = createFileRoute("/api/public/admin-member-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) {
          return Response.json({ ok: true, results: [] });
        }
        // Escape PostgREST `or` special characters in the search term.
        const safe = q.replace(/[,()*]/g, " ").trim();
        const pattern = `%${safe}%`;

        const { data, error } = await supabaseAdmin
          .from("memberships")
          .select("id, customer_first_name, customer_last_name, customer_phone, tier_name, status")
          .or(
            `customer_phone.ilike.${pattern},customer_first_name.ilike.${pattern},customer_last_name.ilike.${pattern}`
          )
          .order("enrolled_at", { ascending: false })
          .limit(5);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, results: data ?? [] });
      },
    },
  },
});
