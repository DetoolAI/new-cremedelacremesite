import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/admin-booking-detail")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const url = new URL(request.url);
        const id = (url.searchParams.get("id") ?? "").trim();
        if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

        // Try by bookings.id (uuid) first, then fallback to square_booking_id.
        let booking: any = null;
        if (UUID_RE.test(id)) {
          const { data } = await supabaseAdmin.from("bookings").select("*").eq("id", id).maybeSingle();
          booking = data;
        }
        if (!booking) {
          const { data } = await supabaseAdmin.from("bookings").select("*").eq("square_booking_id", id).maybeSingle();
          booking = data;
        }
        if (!booking) return Response.json({ ok: false, error: "Booking not found" }, { status: 404 });

        return Response.json({ ok: true, booking });
      },
    },
  },
});
