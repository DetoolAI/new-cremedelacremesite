import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/verify-admin";

async function authorize(request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // Accept either a cron token (header/query) or an admin bearer token.
  const cronToken = process.env.CRON_DISPATCH_TOKEN;
  if (cronToken) {
    const header = request.headers.get("x-cron-token");
    const qs = new URL(request.url).searchParams.get("token");
    if (header === cronToken || qs === cronToken) return { ok: true };
  }
  const admin = await verifyAdmin(request);
  if (admin.ok) return { ok: true };
  return { ok: false, status: admin.status, error: admin.error };
}

// Redemption confirmation emails are DISABLED.
// Per owner request: customers should not be emailed every time a staff
// member manually checks them in. The dispatcher still runs (so the cron
// job stays green) but only flushes the queue without sending anything.
// If a self-scan QR redemption flow is added later, wire it to enqueue a
// different template instead of re-enabling this path.
async function handle(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("membership_redemptions")
    .select("id")
    .is("email_sent_at", null)
    .lte("redeemed_at", cutoff)
    .limit(500);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length > 0) {
    await supabaseAdmin
      .from("membership_redemptions")
      .update({ email_sent_at: new Date().toISOString() })
      .in("id", ids);
  }
  return Response.json({ ok: true, suppressed: ids.length });
}

export const Route = createFileRoute("/api/public/dispatch-redemption-emails")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
