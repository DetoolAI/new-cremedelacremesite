import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Allows admins/staff to correct an existing redemption — change the date/time
// it was performed, the technician who performed it, or the note. Useful when
// a visit was logged late or attributed to the wrong tech.
const Schema = z.object({
  redemptionId: z.string().uuid(),
  redeemedAt: z.string().datetime().optional().nullable(),
  redeemedByName: z.string().min(1).max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

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

export const Route = createFileRoute("/api/public/membership-edit-redemption")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: parsed.error.message }, { status: 400 });

        const update: { redeemed_at?: string; redeemed_by_name?: string; notes?: string | null } = {};
        if (parsed.data.redeemedAt) update.redeemed_at = parsed.data.redeemedAt;
        if (parsed.data.redeemedByName !== undefined && parsed.data.redeemedByName !== null) {
          update.redeemed_by_name = parsed.data.redeemedByName.trim();
        }
        if (parsed.data.notes !== undefined) {
          update.notes = parsed.data.notes ? parsed.data.notes.trim() : null;
        }
        if (Object.keys(update).length === 0) {
          return Response.json({ ok: false, error: "Nothing to update" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
          .from("membership_redemptions")
          .update(update)
          .eq("id", parsed.data.redemptionId);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
