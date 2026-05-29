import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getCallerUser(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401, error: "Sign in required" };
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false as const, status: 401, error: "Empty token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) return { ok: false as const, status: 401, error: "Invalid session" };
  return { ok: true as const, email: data.user.email.toLowerCase() };
}

function todayInNY(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const Route = createFileRoute("/api/public/member-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getCallerUser(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const { data: m } = await supabaseAdmin
          .from("memberships")
          .select("customer_email")
          .ilike("customer_email", auth.email)
          .in("status", ["active", "pending", "paused", "cancelled"])
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!m) return Response.json({ ok: false, error: "No membership found" }, { status: 404 });

        const today = todayInNY();

        const [upcomingRes, pastRes] = await Promise.all([
          supabaseAdmin
            .from("bookings")
            .select("id, appointment_date, appointment_time, service_name, staff_name, status, is_member, duration_minutes")
            .ilike("customer_email", m.customer_email)
            .gte("appointment_date", today)
            .neq("status", "cancelled")
            .order("appointment_date", { ascending: true })
            .order("appointment_time", { ascending: true })
            .limit(50),
          supabaseAdmin
            .from("bookings")
            .select("id, appointment_date, appointment_time, service_name, staff_name, status, is_member, duration_minutes")
            .ilike("customer_email", m.customer_email)
            .or(`appointment_date.lt.${today},status.eq.cancelled`)
            .order("appointment_date", { ascending: false })
            .order("appointment_time", { ascending: false })
            .limit(20),
        ]);

        return Response.json({
          ok: true,
          upcoming: upcomingRes.data ?? [],
          past: pastRes.data ?? [],
        });
      },
    },
  },
});
