import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { getTierBenefits, getBenefitVariants } from "@/lib/membership-tiers";

// Public lookup of a member's status by membership id (the value embedded in
// their QR code). Returns just enough info for the front desk to confirm:
// name, tier, monthly price, status, enrolled date. No card / billing data.

const Schema = z.object({
  id: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/membership-card")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Schema.safeParse({ id: url.searchParams.get("id") });
        if (!parsed.success) {
          return Response.json({ error: "Invalid membership id" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("memberships")
          .select(
            "id, customer_first_name, customer_last_name, customer_email, tier_name, monthly_price_cents, status, enrolled_at, photo_url",
          )
          .eq("id", parsed.data.id)
          .maybeSingle();

        if (error || !data) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }

        const benefits = getTierBenefits(data.tier_name).map((b) => ({
          label: b.label,
          quantity: b.quantity,
          variants: getBenefitVariants(b.label) ?? null,
        }));

        // Redact email so the public lookup can't be used to harvest member
        // addresses. Front desk only needs to confirm identity, not see PII.
        const redactEmail = (e: string | null | undefined): string | null => {
          if (!e) return null;
          const at = e.indexOf("@");
          if (at <= 0) return "***";
          const local = e.slice(0, at);
          const domain = e.slice(at);
          const visible = local.slice(0, Math.min(2, local.length));
          return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}${domain}`;
        };

        return Response.json({
          id: data.id,
          name: `${data.customer_first_name} ${data.customer_last_name}`,
          email: redactEmail(data.customer_email),
          tier: data.tier_name,
          monthlyPrice: `$${(data.monthly_price_cents / 100).toFixed(2)}`,
          status: data.status,
          enrolledAt: data.enrolled_at,
          // squareSubscriptionId intentionally omitted — public endpoint
          active: data.status === "active",
          photoUrl: data.photo_url ?? null,
          benefits,
        });
      },
    },
  },
});
