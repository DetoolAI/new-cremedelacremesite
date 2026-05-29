// Client helpers for the membership staff API. Attaches the current
// Supabase session's access token as a Bearer header so the server can
// verify the user and check the admin role.
import { supabase } from "@/integrations/supabase/client";

async function authHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export type StaffBenefit = {
  label: string;
  quantity: number;
  carryOver?: number;
  totalAllowed?: number;
  used: number;
  remaining: number;
  variants?: string[];
};
export type StaffMembership = {
  id: string; name: string; email: string; phone: string;
  tier: string; monthlyPrice: string; status: string;
  enrolledAt: string; periodStart: string; periodEnd: string; lastVisit: string | null;
  photoUrl?: string | null;
};
export type StaffHistoryItem = {
  id: string; benefit_label: string; variant_name?: string | null;
  redeemed_at: string; redeemed_by_name: string | null; notes: string | null;
};
export type StaffResponse =
  | { ok: true; membership: StaffMembership; benefits: StaffBenefit[]; history: StaffHistoryItem[] }
  | { ok: false; error: string };

export async function getStaffMembership(id: string): Promise<StaffResponse> {
  const r = await fetch(`/api/public/membership-staff?id=${encodeURIComponent(id)}`, {
    headers: await authHeader(),
  });
  return r.json();
}

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function redeemMembershipBenefit(
  membershipId: string,
  benefitLabel: string,
  opts?: { variantName?: string; notes?: string; force?: boolean; actorName?: string; redeemedAt?: string },
): Promise<RedeemResult> {
  const r = await fetch("/api/public/membership-redeem", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({
      membershipId,
      benefitLabel,
      variantName: opts?.variantName,
      notes: opts?.notes,
      force: opts?.force,
      actorName: opts?.actorName,
      redeemedAt: opts?.redeemedAt,
    }),
  });
  return r.json();
}

export async function editMembershipRedemption(
  redemptionId: string,
  patch: { redeemedAt?: string; redeemedByName?: string; notes?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch("/api/public/membership-edit-redemption", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({
      redemptionId,
      redeemedAt: patch.redeemedAt,
      redeemedByName: patch.redeemedByName,
      notes: patch.notes,
    }),
  });
  return r.json();
}

export async function verifyStaffPin(pin: string): Promise<
  { ok: true; staff: { id: string; name: string } } | { ok: false; error: string }
> {
  const r = await fetch("/api/public/staff-pin", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ pin }),
  });
  return r.json();
}

export async function undoMembershipRedemption(
  redemptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch("/api/public/membership-undo", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ redemptionId }),
  });
  return r.json();
}

export async function setMembershipPhoto(
  membershipId: string,
  photoUrl: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch("/api/public/membership-photo", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ membershipId, photoUrl }),
  });
  return r.json();
}

export type UsageItem = {
  id: string; name: string; email: string; phone: string;
  tier: string; monthlyPrice: string; status: string;
  enrolledAt: string; periodEnd: string;
  totalAllowed: number; totalUsed: number; totalRemaining: number;
  lastRedeemed: string | null;
  benefits: StaffBenefit[];
};

export async function listMembershipsUsage(): Promise<{ ok: true; items: UsageItem[] } | { ok: false; error: string }> {
  const r = await fetch("/api/public/memberships-usage", {
    headers: await authHeader(),
  });
  return r.json();
}

export type TodayBooking = {
  id: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  appointment_time: string | null;
  appointment_date: string | null;
  service_name: string | null;
  staff_name: string | null;
  status: string | null;
  is_member: boolean | null;
  deposit_paid: boolean | null;
  duration_minutes: number | null;
  membership_id: string | null;
};

export async function listStaffToday(): Promise<
  { ok: true; date: string; bookings: TodayBooking[] } | { ok: false; error: string }
> {
  const r = await fetch("/api/public/staff-today", { headers: await authHeader() });
  return r.json();
}

export async function setMembershipStatus(
  membershipId: string,
  action: "cancel" | "pause",
): Promise<{ ok: true; status: string; squareWarning?: string | null } | { ok: false; error: string }> {
  const r = await fetch("/api/public/membership-cancel", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ membershipId, action }),
  });
  return r.json();
}

export type AdminBookingDetail = Record<string, unknown> & { id: string };

export async function getAdminBookingDetail(
  id: string,
): Promise<{ ok: true; booking: AdminBookingDetail } | { ok: false; error: string }> {
  const r = await fetch(`/api/public/admin-booking-detail?id=${encodeURIComponent(id)}`, {
    headers: await authHeader(),
  });
  return r.json();
}

export async function updateAdminBooking(
  id: string,
  patch: { appointment_date?: string; appointment_time?: string; status?: string; notes?: string; duration_minutes?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch("/api/public/admin-booking-update", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ id, ...patch }),
  });
  return r.json();
}

export async function deleteAdminBooking(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch("/api/public/admin-booking-delete", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ id }),
  });
  return r.json();
}
