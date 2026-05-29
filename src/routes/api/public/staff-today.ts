import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function verifyAuthorized(request: Request) {
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

function todayInNY(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const Route = createFileRoute("/api/public/staff-today")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAuthorized(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const date = todayInNY();

        const { data: bookings, error } = await supabaseAdmin
          .from("bookings")
          .select("id, customer_first_name, customer_last_name, customer_email, customer_phone, appointment_time, appointment_date, service_name, staff_name, status, is_member, deposit_paid, duration_minutes")
          .eq("appointment_date", date)
          .neq("status", "cancelled")
          .order("appointment_time", { ascending: true });

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        // Lookup membership IDs by email for member bookings
        const memberEmails = Array.from(
          new Set((bookings ?? []).filter((b) => b.is_member && b.customer_email).map((b) => b.customer_email.toLowerCase())),
        );
        const emailToMembershipId = new Map<string, string>();
        if (memberEmails.length) {
          const { data: members } = await supabaseAdmin
            .from("memberships")
            .select("id, customer_email")
            .in("customer_email", memberEmails)
            .in("status", ["active", "pending", "paused"]);
          for (const m of members ?? []) {
            const k = (m.customer_email ?? "").toLowerCase();
            if (k && !emailToMembershipId.has(k)) emailToMembershipId.set(k, m.id);
          }
        }

        const enriched = (bookings ?? []).map((b) => ({
          ...b,
          membership_id: b.customer_email ? emailToMembershipId.get(b.customer_email.toLowerCase()) ?? null : null,
        }));

        return Response.json({ ok: true, date, bookings: enriched });
      },
    },
  },
});
