import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Verifies the calling user is a logged-in staff/admin, then exchanges a
// 4-digit PIN for the matching active technician profile. Returns
// { ok: true, staff: { id, name } } when the PIN matches one active staff
// row, otherwise 401. The bearer auth is the real security boundary — the
// PIN is just an operational "who is using the iPad right now" switch.
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

const Schema = z.object({ pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits") });

export const Route = createFileRoute("/api/public/staff-pin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAuthorized(request);
        if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "Invalid PIN" }, { status: 400 });

        const { data: staff } = await supabaseAdmin
          .from("staff")
          .select("id, name")
          .eq("active", true)
          .eq("pin", parsed.data.pin)
          .maybeSingle();

        if (!staff) {
          // Tiny delay to slow brute force attempts.
          await new Promise((r) => setTimeout(r, 400));
          return Response.json({ ok: false, error: "Incorrect PIN" }, { status: 401 });
        }

        return Response.json({ ok: true, staff: { id: staff.id, name: staff.name } });
      },
    },
  },
});
