/**
 * Authoritative mapping between internal staff rows and Square team members.
 *
 * Source of truth is `staff.square_team_member_id`, set by the admin in the
 * Staff editor. We no longer infer this from past bookings — guessing from
 * booking history caused appointments to land on the wrong technician's
 * Square calendar when names didn't line up.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffSquareMap = {
  /** internal staff_id -> Square team_member_id */
  internalToSquare: Map<string, string>;
  /** Square team_member_id -> internal staff_id */
  squareToInternal: Map<string, string>;
};

export async function loadStaffSquareMap(
  supabase: SupabaseClient,
): Promise<StaffSquareMap> {
  const internalToSquare = new Map<string, string>();
  const squareToInternal = new Map<string, string>();
  const { data } = await supabase
    .from("staff")
    .select("id, square_team_member_id")
    .eq("active", true);
  for (const r of (data ?? []) as Array<{
    id: string;
    square_team_member_id: string | null;
  }>) {
    if (r.square_team_member_id && r.id) {
      internalToSquare.set(r.id, r.square_team_member_id);
      squareToInternal.set(r.square_team_member_id, r.id);
    }
  }
  return { internalToSquare, squareToInternal };
}
