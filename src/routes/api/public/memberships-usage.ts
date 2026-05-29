import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTierBenefits, currentPeriodStart, nextPeriodStart } from "@/lib/membership-tiers";

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

export const Route = createFileRoute("/api/public/memberships-usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const { data: rows } = await supabaseAdmin
          .from("memberships")
          .select("id, customer_first_name, customer_last_name, customer_email, customer_phone, tier_name, monthly_price_cents, status, enrolled_at")
          .order("enrolled_at", { ascending: false });

        const memberships = rows ?? [];
        const ids = memberships.map((m) => m.id);
        let redemptions: Array<{ membership_id: string; benefit_label: string; redeemed_at: string }> = [];
        if (ids.length > 0) {
          const { data: rd } = await supabaseAdmin
            .from("membership_redemptions")
            .select("membership_id, benefit_label, redeemed_at")
            .in("membership_id", ids);
          redemptions = rd ?? [];
        }

        const items = memberships.map((m) => {
          const periodStart = currentPeriodStart(m.enrolled_at);
          const periodEnd = nextPeriodStart(m.enrolled_at);
          const mine = redemptions.filter((r) => r.membership_id === m.id);
          const inPeriod = mine.filter((r) => new Date(r.redeemed_at) >= periodStart);
          const benefits = getTierBenefits(m.tier_name).map((b) => {
            const used = inPeriod.filter((r) => r.benefit_label === b.label).length;
            return { label: b.label, quantity: b.quantity, used, remaining: Math.max(0, b.quantity - used) };
          });
          const totalAllowed = benefits.reduce((s, b) => s + b.quantity, 0);
          const totalUsed = benefits.reduce((s, b) => s + b.used, 0);
          const lastRedeemed = mine.map((r) => r.redeemed_at).sort().pop() ?? null;
          return {
            id: m.id,
            name: `${m.customer_first_name} ${m.customer_last_name}`,
            email: m.customer_email,
            phone: m.customer_phone,
            tier: m.tier_name,
            monthlyPrice: `$${(m.monthly_price_cents / 100).toFixed(2)}`,
            status: m.status,
            enrolledAt: m.enrolled_at,
            periodEnd: periodEnd.toISOString(),
            totalAllowed,
            totalUsed,
            totalRemaining: Math.max(0, totalAllowed - totalUsed),
            lastRedeemed,
            benefits,
          };
        });

        return Response.json({ ok: true, items });
      },
    },
  },
});
