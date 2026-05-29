/**
 * Shared, server-side slot availability check.
 *
 * Combines:
 *  - Website bookings (Supabase)
 *  - Live Square Appointments calendar (catches walk-ins / phone-ins booked in Square POS)
 *  - Staff schedule (working hours per weekday)
 *
 * Used by both /api/public/book and /api/public/book-with-deposit so a slot
 * cannot be double-booked even if two people try at the exact same moment, or
 * if a walk-in just got entered in Square.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { dayRangeIso } from "@/lib/booking";
import { loadStaffSquareMap } from "@/lib/staff-square-map";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";
const TZ = "America/New_York";

type Args = {
  supabase: SupabaseClient;
  squareToken: string | undefined;
  squareLocationId: string | undefined;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM[:SS] */
  time: string;
  durationMinutes: number;
  /** null/undefined = "Any Available Technician" */
  staffId: string | null | undefined;
};

type Result = { ok: true; freeStaffIds?: string[] } | { ok: false; reason: string };

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isoToLocalTimeMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let h = get("hour");
  if (h === "24") h = "00";
  return Number(h) * 60 + Number(get("minute"));
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function isoToLocalDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type Conflict = {
  startMin: number;
  endMin: number;
  staffId: string | null; // internal id when known
  squareTeamMemberId: string | null;
  squareBookingId: string | null;
};

async function fetchSquareConflicts(
  token: string,
  locationId: string,
  date: string,
): Promise<Conflict[]> {
  const { start, end } = dayRangeIso(date);
  try {
    const res = await fetch(
      `${SQUARE_API}/bookings?location_id=${encodeURIComponent(locationId)}&start_at_min=${encodeURIComponent(start)}&start_at_max=${encodeURIComponent(end)}&limit=200`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Square-Version": SQUARE_VERSION,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const bookings: Array<{
      id?: string;
      start_at?: string;
      status?: string;
      appointment_segments?: Array<{ duration_minutes?: number; team_member_id?: string }>;
    }> = json?.bookings ?? [];

    const out: Conflict[] = [];
    for (const b of bookings) {
      if (!b.start_at) continue;
      if (
        b.status === "CANCELLED_BY_CUSTOMER" ||
        b.status === "CANCELLED_BY_SELLER" ||
        b.status === "DECLINED"
      )
        continue;
      if (isoToLocalDate(b.start_at) !== date) continue;
      const baseStart = isoToLocalTimeMinutes(b.start_at);
      const segments = b.appointment_segments ?? [];
      let offset = 0;
      let emitted = false;
      for (const seg of segments) {
        const dur = seg.duration_minutes ?? 0;
        if (dur <= 0) continue;
        out.push({
          startMin: toMinutes(minutesToTime(baseStart + offset)),
          endMin: baseStart + offset + dur,
          staffId: null,
          squareTeamMemberId: seg.team_member_id ?? null,
          squareBookingId: b.id ?? null,
        });
        emitted = true;
        offset += dur;
      }
      if (!emitted) {
        out.push({
          startMin: baseStart,
          endMin: baseStart + 60,
          staffId: null,
          squareTeamMemberId: null,
          squareBookingId: b.id ?? null,
        });
      }
    }
    return out;
  } catch (err) {
    console.error("Square conflicts fetch failed:", err);
    return [];
  }
}

/**
 * Returns { ok: true } if the requested slot is free, or
 * { ok: false, reason } if it conflicts with an existing booking, the staff is
 * off, or no eligible tech is available (for "Any Available Technician").
 */
export async function checkSlotAvailability(args: Args): Promise<Result> {
  const { supabase, squareToken, squareLocationId, date, time, durationMinutes, staffId } = args;

  // 15-minute buffer between appointments — protects transition / cleanup
  // time and prevents back-to-back collisions.
  const BUFFER_MIN = 15;
  const reqStart = toMinutes(time);
  const reqEnd = reqStart + durationMinutes;
  const reqStartBuf = reqStart - BUFFER_MIN;
  const reqEndBuf = reqEnd + BUFFER_MIN;

  // Authoritative Square team_member_id -> internal staff_id mapping comes
  // from the staff table (admin sets it in the Staff editor). Falls back to
  // history-derived mapping only for legacy bookings that pre-date the field.
  const { squareToInternal } = await loadStaffSquareMap(supabase);
  if (squareToInternal.size === 0) {
    const { data: mapRows } = await supabase
      .from("bookings")
      .select("staff_id, square_team_member_id")
      .not("staff_id", "is", null)
      .not("square_team_member_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    for (const r of (mapRows ?? []) as Array<{
      staff_id: string | null;
      square_team_member_id: string | null;
    }>) {
      if (r.square_team_member_id && r.staff_id && !squareToInternal.has(r.square_team_member_id)) {
        squareToInternal.set(r.square_team_member_id, r.staff_id);
      }
    }
  }

  // 1. Pull website bookings for the day
  const { data: webRows } = await supabase
    .from("bookings")
    .select("appointment_time, duration_minutes, staff_id, square_team_member_id, square_booking_id")
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending", "checked_in", "completed", "new"]);

  // Collect Square booking IDs we already own so we can dedup the live feed.
  const knownSquareBookingIds = new Set<string>(
    (webRows ?? [])
      .map((b: any) => b.square_booking_id)
      .filter((id: any): id is string => !!id),
  );

  const webConflicts: Conflict[] = (webRows ?? []).map((b: any) => {
    const startMin = toMinutes(String(b.appointment_time));
    return {
      startMin,
      endMin: startMin + (b.duration_minutes ?? 60),
      staffId: b.staff_id ?? (b.square_team_member_id ? squareToInternal.get(b.square_team_member_id) ?? null : null),
      squareTeamMemberId: b.square_team_member_id ?? null,
      squareBookingId: b.square_booking_id ?? null,
    };
  });

  // 2. Pull live Square bookings for the day (catches walk-ins / phone bookings)
  const sqConflicts =
    squareToken && squareLocationId
      ? await fetchSquareConflicts(squareToken, squareLocationId, date)
      : [];

  for (const c of sqConflicts) {
    if (!c.staffId && c.squareTeamMemberId) {
      c.staffId = squareToInternal.get(c.squareTeamMemberId) ?? null;
    }
  }

  // De-dup: every booking we create appears in BOTH our DB (webConflicts) and Square's
  // live feed (sqConflicts). Drop Square entries whose booking ID is already tracked
  // in our DB. Fall back to start-time + staff matching for legacy rows without an ID.
  const all: Conflict[] = [...webConflicts];
  for (const sq of sqConflicts) {
    if (sq.squareBookingId && knownSquareBookingIds.has(sq.squareBookingId)) continue;
    const dup = webConflicts.find(
      (w) =>
        w.startMin === sq.startMin &&
        (
          (w.squareTeamMemberId && w.squareTeamMemberId === sq.squareTeamMemberId) ||
          (w.staffId && w.staffId === sq.staffId)
        ),
    );
    if (!dup) all.push(sq);
  }

  // Use buffered window so neighbours within 15 min count as conflicts.
  const overlaps = (c: Conflict) => reqStartBuf < c.endMin && reqEndBuf > c.startMin;

  // 3. Get list of eligible techs (active staff). Used when staffId is null.
  const { data: activeStaff } = await supabase
    .from("staff")
    .select("id, work_days")
    .eq("active", true);
  const allTechIds: string[] = (activeStaff ?? []).map((s: any) => s.id);
  const workDaysById = new Map<string, number[]>();
  for (const s of (activeStaff ?? []) as any[]) {
    workDaysById.set(s.id, Array.isArray(s.work_days) ? s.work_days : []);
  }

  // 4. Helper: check schedule + time-off for a specific staff_id
  const dow = new Date(date + "T12:00:00Z").getUTCDay();
  const checkStaffWindow = async (sid: string): Promise<boolean> => {
    // Hard guard: staff.work_days. If the tech doesn't work this weekday,
    // reject regardless of whether a staff_schedule row exists.
    let workDays = workDaysById.get(sid);
    if (workDays === undefined) {
      const { data: s } = await supabase
        .from("staff")
        .select("work_days")
        .eq("id", sid)
        .maybeSingle();
      workDays = Array.isArray((s as any)?.work_days) ? (s as any).work_days : [];
      workDaysById.set(sid, workDays!);
    }
    if (workDays && workDays.length > 0 && !workDays.includes(dow)) {
      return false;
    }

    const { data: sched } = await supabase
      .from("staff_schedule")
      .select("start_time, end_time")
      .eq("staff_id", sid)
      .eq("day_of_week", dow);
    if (sched && sched.length > 0) {
      const inside = sched.some((w: any) => {
        const s = toMinutes(String(w.start_time));
        const e = toMinutes(String(w.end_time));
        return reqStart >= s && reqEnd <= e;
      });
      if (!inside) return false;
    } else {
      // No schedule rows for this weekday but work_days says they DO work.
      // Treat as unrestricted within the day (back-compat).
    }
    return true;
  };

  // 5. Specific staff path
  if (staffId) {
    const ok = await checkStaffWindow(staffId);
    if (!ok) return { ok: false, reason: "That technician isn't working at the selected time." };
    const conflict = all.find((c) => overlaps(c) && (c.staffId === staffId || c.staffId === null));
    if (conflict)
      return { ok: false, reason: "That time was just booked. Please pick another slot." };
    return { ok: true };
  }

  // 6. "Any Available" path — at least one eligible tech must be free
  if (allTechIds.length === 0) return { ok: true }; // no staff configured, allow

  const blocked = new Set<string>();
  for (const c of all.filter(overlaps)) {
    if (c.staffId && allTechIds.includes(c.staffId)) {
      blocked.add(c.staffId);
    } else if (!c.staffId && c.squareTeamMemberId) {
      // Unmapped Square booking — we know a real tech is busy but not which
      // internal staff row. Consume one eligible tech as a safe fallback.
      const fallback = allTechIds.find((id) => !blocked.has(id));
      if (fallback) blocked.add(fallback);
    }
    // If staffId is known but not in allTechIds, ignore — that tech isn't
    // in the eligible pool, so their conflict shouldn't shrink availability.
  }
  // Remove anyone outside their schedule.
  for (const id of allTechIds) {
    if (blocked.has(id)) continue;
    const ok = await checkStaffWindow(id);
    if (!ok) blocked.add(id);
  }

  if (blocked.size >= allTechIds.length) {
    return {
      ok: false,
      reason: "No technicians are available at that time. Please pick another slot.",
    };
  }
  const freeStaffIds = allTechIds.filter((id) => !blocked.has(id));
  return { ok: true, freeStaffIds };
}
