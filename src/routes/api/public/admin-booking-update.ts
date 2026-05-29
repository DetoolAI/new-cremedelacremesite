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

const ALLOWED_STATUS = new Set(["new", "confirmed", "pending", "checked_in", "completed", "cancelled", "no_show"]);

export const Route = createFileRoute("/api/public/admin-booking-update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: any;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

        const id = String(body?.id ?? "").trim();
        if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

        const patch: Record<string, unknown> = {};
        if (typeof body.appointment_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.appointment_date)) {
          patch.appointment_date = body.appointment_date;
        }
        if (typeof body.appointment_time === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(body.appointment_time)) {
          patch.appointment_time = body.appointment_time.length === 5 ? `${body.appointment_time}:00` : body.appointment_time;
        }
        if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status)) {
          patch.status = body.status;
        }
        if (typeof body.notes === "string" && body.notes.length <= 2000) {
          patch.notes = body.notes;
        }
        if (typeof body.duration_minutes === "number" && body.duration_minutes > 0 && body.duration_minutes <= 600) {
          patch.duration_minutes = Math.round(body.duration_minutes);
        }

        if (Object.keys(patch).length === 0) {
          return Response.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("bookings").update(patch as never).eq("id", id).select("id").maybeSingle();

        if (error) {
          if ((error as any).code === "23505") {
            return Response.json({ ok: false, error: "That time slot is already taken." }, { status: 409 });
          }
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!data) return Response.json({ ok: false, error: "Booking not found" }, { status: 404 });

        return Response.json({ ok: true });
      },
    },
  },
});
