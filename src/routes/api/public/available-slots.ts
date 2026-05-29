import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SQUARE_API = "https://connect.squareup.com/v2";
const TZ = "America/New_York";

function isoToNYTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h === "24" ? "00" : h}:${m}`;
}

function getNYDayRange(dateStr: string): { start: string; end: string } {
  const [y, mo, d] = dateStr.split("-").map(Number);
  for (const off of [-5, -4]) {
    const candidate = new Date(Date.UTC(y, mo - 1, d, -off, 0, 0));
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(candidate);
    const [lm, ld, ly] = local.split("/").map(Number);
    if (ly === y && lm === mo && ld === d) {
      const end = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
      return { start: candidate.toISOString(), end: end.toISOString() };
    }
  }
  const fallback = new Date(Date.UTC(y, mo - 1, d, 5, 0, 0));
  return { start: fallback.toISOString(), end: new Date(fallback.getTime() + 24 * 60 * 60 * 1000).toISOString() };
}

export const Route = createFileRoute("/api/public/available-slots")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get("date");
        const serviceId = url.searchParams.get("service_id");
        const staffId = url.searchParams.get("staff_id");
        const durationMinutes = parseInt(url.searchParams.get("duration_minutes") ?? "0") || null;

        if (!date) return Response.json({ error: "date required" }, { status: 400 });

        const token = process.env.SQUARE_ACCESS_TOKEN;
        const locationId = process.env.SQUARE_LOCATION_ID;
        if (!token || !locationId) return Response.json({ available_slots: [], fallback: true });

        // Get variation ID for this service
        let variationId: string | null = null;
        if (serviceId) {
          const { data: svc } = await supabaseAdmin
            .from("services")
            .select("square_variation_id")
            .eq("id", serviceId)
            .maybeSingle();
          variationId = svc?.square_variation_id ?? null;
        }

        // If no variation ID fall back
        if (!variationId) return Response.json({ available_slots: [], fallback: true });

        // Get Square team member ID if specific staff selected
        let teamMemberId: string | null = null;
        if (staffId && staffId !== "any") {
          const { data: staffRow } = await supabaseAdmin
            .from("staff")
            .select("square_team_member_id")
            .eq("id", staffId)
            .maybeSingle();
          teamMemberId = staffRow?.square_team_member_id ?? null;
        }

        const { start, end } = getNYDayRange(date);

        const body: any = {
          query: {
            filter: {
              start_at_range: { start_at: start, end_at: end },
              location_id: locationId,
              segment_filters: [
                {
                  service_variation_id: variationId,
                  ...(teamMemberId ? { team_member_id_filter: { any: [teamMemberId] } } : {}),
                  ...(durationMinutes ? { duration_minutes: durationMinutes } : {}),
                },
              ],
            },
          },
        };

        try {
          const res = await fetch(`${SQUARE_API}/bookings/availability/search`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Square-Version": "2024-10-17",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("Square availability error:", JSON.stringify(data));
            return Response.json({ available_slots: [], fallback: true });
          }

          const slots = (data.availabilities ?? [])
            .map((a: any) => isoToNYTime(a.start_at))
            .filter((t: string) => {
              const [h, m] = t.split(":").map(Number);
              const min = h * 60 + m;
              return min >= 10 * 60 && min <= 18 * 60 + 30;
            })
            .sort();

          return Response.json({ available_slots: [...new Set(slots)], fallback: false });
        } catch (err) {
          console.error("Square availability failed:", err);
          return Response.json({ available_slots: [], fallback: true });
        }
      },
    },
  },
});
