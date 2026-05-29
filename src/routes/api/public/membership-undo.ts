import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  redemptionId: z.string().uuid(),
});

// Allow undoing a redemption within this window after it was logged.
const UNDO_WINDOW_MINUTES = 60;

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401, error: "Missing bearer token" };
  const token = authHeader.slice(7).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: "Invalid token" };
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).maybeSingle();
  if (!role) return { ok: false as const, status: 403, error: "Not authorized" };
  return { ok: true as const, userId: data.user.id };
}

export const Route = createFileRoute("/api/public/membership-undo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: parsed.error.message }, { status: 400 });

        const { data: row } = await supabaseAdmin
          .from("membership_redemptions")
          .select("id, redeemed_at")
          .eq("id", parsed.data.redemptionId)
          .maybeSingle();

        if (!row) return Response.json({ ok: false, error: "Redemption not found" }, { status: 404 });

        const ageMs = Date.now() - new Date(row.redeemed_at).getTime();
        if (ageMs > UNDO_WINDOW_MINUTES * 60_000) {
          return Response.json(
            { ok: false, error: `Can only undo within ${UNDO_WINDOW_MINUTES} minutes of redemption.` },
            { status: 409 },
          );
        }

        const { error } = await supabaseAdmin
          .from("membership_redemptions")
          .delete()
          .eq("id", parsed.data.redemptionId);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
