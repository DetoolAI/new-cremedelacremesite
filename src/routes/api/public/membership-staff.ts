import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTierBenefits, getBenefitVariants, currentPeriodStart, nextPeriodStart } from "@/lib/membership-tiers";

async function verifyAdmin(request: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Missing bearer token" };
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Empty token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Invalid token" };
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .in("role", ["admin", "staff"])
    .maybeSingle();
  if (!role) return { ok: false, status: 403, error: "Not authorized" };
  return { ok: true, userId: data.user.id };
}

const IdSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/public/membership-staff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const url = new URL(request.url);
        const parsed = IdSchema.safeParse({ id: url.searchParams.get("id") });
        if (!parsed.success) return Response.json({ ok: false, error: "Invalid id" }, { status: 400 });

        const { data: m } = await supabaseAdmin
          .from("memberships")
          .select("*")
          .eq("id", parsed.data.id)
          .maybeSingle();
        if (!m) return Response.json({ ok: false, error: "Membership not found" }, { status: 404 });

        const periodStart = currentPeriodStart(m.enrolled_at);
        const periodEnd = nextPeriodStart(m.enrolled_at);

        const { data: redemptions } = await supabaseAdmin
          .from("membership_redemptions")
          .select("*")
          .eq("membership_id", m.id)
          .order("redeemed_at", { ascending: false });

        const all = redemptions ?? [];
        const inPeriod = all.filter((r) => new Date(r.redeemed_at) >= periodStart);

        const tierBenefits = getTierBenefits(m.tier_name);
        const benefits = tierBenefits.map((b) => {
          const used = inPeriod.filter((r) => r.benefit_label === b.label).length;
          return {
            label: b.label,
            quantity: b.quantity,
            carryOver: 0,
            totalAllowed: b.quantity,
            used,
            remaining: Math.max(0, b.quantity - used),
            variants: getBenefitVariants(b.label),
          };
        });

        return Response.json({
          ok: true,
          membership: {
            id: m.id,
            name: `${m.customer_first_name} ${m.customer_last_name}`,
            email: m.customer_email,
            phone: m.customer_phone,
            tier: m.tier_name,
            monthlyPrice: `$${(m.monthly_price_cents / 100).toFixed(2)}`,
            status: m.status,
            enrolledAt: m.enrolled_at,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            lastVisit: all[0]?.redeemed_at ?? null,
            photoUrl: m.photo_url ?? null,
          },
          benefits,
          history: all.slice(0, 20),
        });
      },
    },
  },
});

export { verifyAdmin };
