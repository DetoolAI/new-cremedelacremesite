import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Returns a booking owned by the calling member (matched by their auth email),
// plus the membership id for QR generation.
const Schema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/public/member-booking")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ ok: false, error: "Sign in to view" }, { status: 401 });
        }
        const token = authHeader.slice(7).trim();
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user?.email) {
          return Response.json({ ok: false, error: "Invalid session" }, { status: 401 });
        }
        const email = userData.user.email.toLowerCase();

        const url = new URL(request.url);
        const parsed = Schema.safeParse({ id: url.searchParams.get("id") });
        if (!parsed.success) return Response.json({ ok: false, error: "Invalid id" }, { status: 400 });

        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("*")
          .eq("id", parsed.data.id)
          .maybeSingle();
        if (!booking) return Response.json({ ok: false, error: "Booking not found" }, { status: 404 });
        if (booking.customer_email.toLowerCase() !== email) {
          return Response.json({ ok: false, error: "Not your booking" }, { status: 403 });
        }

        const { data: membership } = await supabaseAdmin
          .from("memberships")
          .select("id, tier_name, customer_first_name, customer_last_name")
          .ilike("customer_email", email)
          .in("status", ["active", "pending"])
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return Response.json({
          ok: true,
          booking: {
            id: booking.id,
            serviceName: booking.service_name,
            staffName: booking.staff_name,
            appointmentDate: booking.appointment_date,
            appointmentTime: booking.appointment_time,
            durationMinutes: booking.duration_minutes,
            status: booking.status,
            notes: booking.notes,
            firstName: booking.customer_first_name,
          },
          membership: membership ? {
            id: membership.id,
            tier: membership.tier_name,
          } : null,
        });
      },
    },
  },
});
