import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dayRangeIso } from "@/lib/booking";
import { loadStaffSquareMap } from "@/lib/staff-square-map";

// Returns busy time ranges for a given date (and optional staff_id) so the
// public booking UI can grey out conflicting slots. Returns ONLY anonymized
// {start, duration} pairs — no customer info, names, or IDs.
//
// Sources merged:
//   1. Bookings made on this website (database)
//   2. Bookings on Angie's Square Appointments calendar (live fetch)
//
// Query: ?date=YYYY-MM-DD&staff_id=<uuid|"any">

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";
const TZ = "America/New_York";

type BusySlot = {
  start: string;
  duration_minutes: number;
  staff_id: string | null;
  source: "website" | "square";
  square_booking_id?: string | null;
};

/** Convert a UTC ISO timestamp into local "HH:MM:SS" in the salon TZ. */
function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let h = get("hour");
  if (h === "24") h = "00";
  return `${h}:${get("minute")}:${get("second")}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** YYYY-MM-DD in salon TZ for an ISO timestamp. */
function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}


async function fetchSquareBookings(date: string): Promise<BusySlot[]> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) return [];

  const { start, end } = dayRangeIso(date);
  try {
    const res = await fetch(
      `${SQUARE_API}/bookings?location_id=${encodeURIComponent(
        locationId,
      )}&start_at_min=${encodeURIComponent(start)}&start_at_max=${encodeURIComponent(end)}&limit=200`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Square-Version": SQUARE_VERSION,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      console.error("Square bookings fetch failed:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const json = await res.json();
    const bookings: Array<{
      id?: string;
      start_at?: string;
      status?: string;
      appointment_segments?: Array<{
        duration_minutes?: number;
        team_member_id?: string;
      }>;
    }> = json?.bookings ?? [];

    const out: BusySlot[] = [];
    for (const b of bookings) {
      if (!b.start_at) continue;
      // Skip cancelled/declined; everything else (ACCEPTED, PENDING, NO_SHOW, etc.) blocks the slot.
      if (b.status === "CANCELLED_BY_CUSTOMER" || b.status === "CANCELLED_BY_SELLER" || b.status === "DECLINED") continue;
      // Make sure it actually falls on the requested local date (Square may return edge-of-window items).
      if (isoToLocalDate(b.start_at) !== date) continue;

      const baseStart = toMinutes(isoToLocalTime(b.start_at));
      const segments = b.appointment_segments ?? [];
      let offset = 0;
      let emitted = false;
      for (const seg of segments) {
        const duration = seg.duration_minutes ?? 0;
        if (duration <= 0) continue;
        out.push({
          start: minutesToTime(baseStart + offset),
          duration_minutes: duration,
          staff_id: seg.team_member_id ?? null,
          source: "square",
          square_booking_id: b.id ?? null,
        });
        emitted = true;
        offset += duration;
      }
      if (!emitted) {
        out.push({
          start: isoToLocalTime(b.start_at),
          duration_minutes: 60,
          staff_id: null,
          source: "square",
          square_booking_id: b.id ?? null,
        });
      }
    }
    return out;
  } catch (err) {
    console.error("Square bookings fetch error:", err);
    return [];
  }
}

export const Route = createFileRoute("/api/public/busy-slots")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const date = url.searchParams.get("date");
          const staffId = url.searchParams.get("staff_id");

          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return Response.json({ error: "Invalid date" }, { status: 400 });
          }

          // Authoritative Square team_member_id → internal staff.id map.
          const { squareToInternal: sqToInternal } = await loadStaffSquareMap(supabaseAdmin);

          // 1. Website bookings
          const query = supabaseAdmin
            .from("bookings")
            .select("appointment_time, duration_minutes, staff_id, square_team_member_id, square_booking_id")
            .eq("appointment_date", date)
            .in("status", ["confirmed", "pending", "checked_in", "completed", "new"]);

          const { data, error } = await query;
          if (error) console.error("busy-slots query error:", error);

          // Collect Square booking IDs already tracked in our DB so we can dedup
          // against the live Square feed (every website booking also appears there).
          const knownSquareBookingIds = new Set<string>(
            (data ?? [])
              .map((b) => b.square_booking_id)
              .filter((id): id is string => !!id),
          );

          const websiteBusy: BusySlot[] = (data ?? [])
            .map((b) => ({
              start: b.appointment_time,
              duration_minutes: b.duration_minutes ?? 60,
              staff_id: b.staff_id ?? (b.square_team_member_id ? sqToInternal.get(b.square_team_member_id) ?? null : null),
              source: "website" as const,
            }))
            .filter((b) => !staffId || staffId === "any" || b.staff_id === staffId);

          // 2. Live Square bookings (catches walk-ins, phone bookings, Square's own booking site)
          const squareBusyAll = await fetchSquareBookings(date);
          if (sqToInternal.size === 0) {
            const { data: mapRows } = await supabaseAdmin
              .from("bookings")
              .select("staff_id, square_team_member_id")
              .not("staff_id", "is", null)
              .not("square_team_member_id", "is", null)
              .order("created_at", { ascending: false })
              .limit(500);
            for (const r of mapRows ?? []) {
              if (r.square_team_member_id && r.staff_id && !sqToInternal.has(r.square_team_member_id)) {
                sqToInternal.set(r.square_team_member_id, r.staff_id);
              }
            }
          }

          let staffSquareTeamId: string | null = null;
          if (staffId && staffId !== "any") {
            for (const [sq, internal] of sqToInternal) {
              if (internal === staffId) { staffSquareTeamId = sq; break; }
            }
          }

          // Translate Square team IDs to internal staff IDs and dedup against
          // website bookings (every booking we create also appears in Square's feed).
          const squareBusy = squareBusyAll
            .filter((s) => {
              // Drop Square bookings we already have in our DB — avoids double-counting.
              if (s.square_booking_id && knownSquareBookingIds.has(s.square_booking_id)) return false;
              return true;
            })
            .map((s) => {
              const squareTeamId = s.staff_id;
              const internal = squareTeamId ? sqToInternal.get(squareTeamId) ?? null : null;
              return { ...s, staff_id: internal, squareTeamId };
            })
            .filter((s) => {
              if (!staffId || staffId === "any") return true;
              return s.staff_id === staffId || s.squareTeamId === staffSquareTeamId;
            });

          // 3. Staff working hours for this weekday + any time-off blocks for this date.
          // Also enforce staff.work_days as a hard guard — if the tech doesn't work
          // this weekday, return an all-day busy block so the UI greys everything out.
          const dow = new Date(date + "T12:00:00Z").getUTCDay(); // safe: date is YYYY-MM-DD
          let scheduleQuery = supabaseAdmin
            .from("staff_schedule")
            .select("staff_id, start_time, end_time")
            .eq("day_of_week", dow);
          let staffQuery = supabaseAdmin
            .from("staff")
            .select("id, work_days")
            .eq("active", true);
          if (staffId && staffId !== "any") {
            scheduleQuery = scheduleQuery.eq("staff_id", staffId);
            staffQuery = staffQuery.eq("id", staffId);
          }
          const [{ data: schedRows }, { data: staffRows }] = await Promise.all([
            scheduleQuery,
            staffQuery,
          ]);

          // Build all-day "off" blocks for any tech whose work_days excludes this dow.
          const offDayBlocks = (staffRows ?? [])
            .filter((s: any) => {
              const wd = Array.isArray(s.work_days) ? s.work_days : [];
              return wd.length > 0 && !wd.includes(dow);
            })
            .map((s: any) => ({
              start: "00:00:00",
              duration_minutes: 24 * 60,
              staff_id: s.id as string,
              source: "website" as const,
            }));

          return Response.json({
            busy: [...websiteBusy, ...squareBusy, ...offDayBlocks],
            schedule: schedRows ?? [],
            time_off: [],
          });
        } catch (err) {
          console.error("busy-slots fatal:", err);
          return Response.json({ busy: [], schedule: [], time_off: [] });
        }
      },
    },
  },
});
