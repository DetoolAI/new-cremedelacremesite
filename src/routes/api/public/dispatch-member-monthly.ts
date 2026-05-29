import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTierBenefits, currentPeriodStart } from "@/lib/membership-tiers";
import { verifyAdmin } from "@/lib/verify-admin";

// Dispatches the two monthly member nudge emails:
//   ?type=start  → 1st-of-the-month "your services have refreshed, come book"
//   ?type=mid    → 15th-of-the-month "here's what you have left"
//
// Called by pg_cron. Idempotent within a calendar month per (membership, type):
// we record a sent marker in email_send_log via the existing send_log path so
// re-running the cron the same day is safe. We additionally guard with a
// per-month idempotency_key.

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

async function sendForType(type: "start" | "mid", origin: string) {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthLabel = MONTH_NAMES[now.getUTCMonth()];

  const { data: members, error } = await supabaseAdmin
    .from("memberships")
    .select("id, customer_first_name, customer_email, tier_name, enrolled_at, status")
    .eq("status", "active");
  if (error) return { ok: false, error: error.message, sent: 0 };

  let sent = 0;
  for (const m of members ?? []) {
    if (!m.customer_email) continue;
    const benefits = getTierBenefits(m.tier_name);
    if (benefits.length === 0) continue;

    try {
      if (type === "start") {
        const benefitsList = benefits
          .map((b) => `• ${b.quantity} × ${b.label}`)
          .join("\n");

        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: "member-month-start",
            recipient_email: m.customer_email,
            idempotency_key: `member-month-start-${m.id}-${monthKey}`,
            message_id: crypto.randomUUID(),
            template_data: {
              customerName: m.customer_first_name ?? "there",
              tierName: m.tier_name,
              benefitsList,
              monthLabel,
              bookingUrl: `${origin}/book-now?open=1`,
              membershipCardUrl: `${origin}/membership-card?id=${m.id}`,
            },
          } as never,
        });
        sent++;
      } else {
        // mid-month: compute remaining for the current billing period
        const periodStart = currentPeriodStart(m.enrolled_at);
        const { data: rows } = await supabaseAdmin
          .from("membership_redemptions")
          .select("benefit_label")
          .eq("membership_id", m.id)
          .gte("redeemed_at", periodStart.toISOString());

        const used = new Map<string, number>();
        for (const r of rows ?? []) {
          used.set(r.benefit_label, (used.get(r.benefit_label) ?? 0) + 1);
        }
        const remainingLines: string[] = [];
        let totalRemaining = 0;
        for (const b of benefits) {
          const u = used.get(b.label) ?? 0;
          const left = Math.max(0, b.quantity - u);
          totalRemaining += left;
          remainingLines.push(`• ${left} of ${b.quantity} ${b.label}`);
        }
        const hasUnused = totalRemaining > 0;

        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: "member-mid-month",
            recipient_email: m.customer_email,
            idempotency_key: `member-mid-month-${m.id}-${monthKey}`,
            message_id: crypto.randomUUID(),
            template_data: {
              customerName: m.customer_first_name ?? "there",
              tierName: m.tier_name,
              remainingList: remainingLines.join("\n"),
              hasUnused,
              bookingUrl: `${origin}/book-now?open=1`,
              membershipCardUrl: `${origin}/membership-card?id=${m.id}`,
            },
          } as never,
        });
        sent++;
      }
    } catch (e) {
      console.error("dispatch-member-monthly failed for", m.id, e);
    }
  }
  return { ok: true, sent, scanned: members?.length ?? 0 };
}

async function handle(request: Request) {
  // Allow either an authenticated admin OR a request bearing the shared CRON_SECRET header.
  const cronSecret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  const cronOk = !!cronSecret && !!provided && provided === cronSecret;
  if (!cronOk) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (type !== "start" && type !== "mid") {
    return Response.json({ ok: false, error: "type must be 'start' or 'mid'" }, { status: 400 });
  }
  const result = await sendForType(type, url.origin);
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export const Route = createFileRoute("/api/public/dispatch-member-monthly")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
