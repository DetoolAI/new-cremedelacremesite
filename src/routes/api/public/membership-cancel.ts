import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401, error: "Missing bearer token" };
  const token = authHeader.slice(7).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: "Invalid token" };
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!role) return { ok: false as const, status: 403, error: "Not authorized" };
  return { ok: true as const };
}

const Schema = z.object({
  membershipId: z.string().uuid(),
  action: z.enum(["cancel", "pause"]),
});

export const Route = createFileRoute("/api/public/membership-cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "Invalid input" }, { status: 400 });

        const { membershipId, action } = parsed.data;

        const { data: m } = await supabaseAdmin
          .from("memberships")
          .select("id, square_subscription_id, status")
          .eq("id", membershipId)
          .maybeSingle();
        if (!m) return Response.json({ ok: false, error: "Membership not found" }, { status: 404 });

        const squareToken = process.env.SQUARE_ACCESS_TOKEN;
        const newStatus = action === "cancel" ? "cancelled" : "paused";
        let squareError: string | null = null;

        if (m.square_subscription_id && squareToken) {
          try {
            const path = action === "cancel"
              ? `/v2/subscriptions/${m.square_subscription_id}/cancel`
              : `/v2/subscriptions/${m.square_subscription_id}/pause`;
            const res = await fetch(`https://connect.squareup.com${path}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${squareToken}`,
                "Content-Type": "application/json",
                "Square-Version": "2024-10-17",
              },
              body: action === "pause" ? JSON.stringify({}) : undefined,
            });
            if (!res.ok) {
              const j = await res.text();
              squareError = `Square returned ${res.status}: ${j.slice(0, 200)}`;
              console.error("Square subscription action failed", squareError);
            }
          } catch (e: any) {
            squareError = e?.message ?? "Square API error";
            console.error("Square subscription action threw", squareError);
          }
        }

        const updateRow: { status: string; cancelled_at?: string } = { status: newStatus };
        if (action === "cancel") updateRow.cancelled_at = new Date().toISOString();

        const { error: upErr } = await supabaseAdmin
          .from("memberships")
          .update(updateRow)
          .eq("id", membershipId);
        if (upErr) return Response.json({ ok: false, error: upErr.message }, { status: 500 });

        return Response.json({ ok: true, status: newStatus, squareWarning: squareError });
      },
    },
  },
});
