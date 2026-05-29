import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isWithinBusinessHours } from "@/lib/membership-tiers";

const Schema = z.object({
  membershipId: z.string().uuid(),
  benefitLabel: z.string().min(1).max(200),
  variantName: z.string().min(1).max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  force: z.boolean().optional(),
  actorName: z.string().min(1).max(120).optional().nullable(),
  // Optional ISO timestamp for back-dating a redemption (e.g. logging a visit
  // that happened earlier). Defaults to now when omitted.
  redeemedAt: z.string().datetime().optional().nullable(),
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
  return { ok: true as const, userId: data.user.id, email: data.user.email ?? null };
}

export const Route = createFileRoute("/api/public/membership-redeem")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: parsed.error.message }, { status: 400 });

        // Block outside business hours unless explicitly overridden by staff.
        // Skip the check when back-dating (redeemedAt provided) — the visit
        // already happened, hours don't apply.
        if (!parsed.data.force && !parsed.data.redeemedAt && !isWithinBusinessHours()) {
          return Response.json(
            { ok: false, error: "outside_hours", message: "Outside salon hours (8 AM – 10 PM ET). Tap Override to redeem anyway." },
            { status: 409 },
          );
        }

        const redeemedAt = parsed.data.redeemedAt ?? new Date().toISOString();
        const { error } = await supabaseAdmin.from("membership_redemptions").insert({
          membership_id: parsed.data.membershipId,
          benefit_label: parsed.data.benefitLabel,
          variant_name: parsed.data.variantName ?? null,
          notes: parsed.data.notes ?? null,
          redeemed_by: auth.userId,
          redeemed_by_name: parsed.data.actorName?.trim() || auth.email,
          redeemed_at: redeemedAt,
        });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        // Note: redemption confirmation email is sent on a 1-hour delay by the
        // /api/public/dispatch-redemption-emails cron endpoint. This gives staff
        // time to undo accidental redemptions before the customer is notified.

        return Response.json({ ok: true });
      },
    },
  },
});
