import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { pushBookingToSquare } from "@/lib/square-bookings";
import { checkSlotAvailability } from "@/lib/slot-availability";
import { getTierBenefits, currentPeriodStart, nextPeriodStart } from "@/lib/membership-tiers";
import { BENEFIT_VARIANTS } from "@/lib/membership-tiers";

// Does a stored booking service_name belong to this benefit label?
// Accepts: exact label, "label: variant" (legacy), or any of the variants.
function matchesBenefit(serviceName: string, label: string): boolean {
  if (serviceName === label) return true;
  if (serviceName.startsWith(`${label}: `)) return true;
  const variants = BENEFIT_VARIANTS[label] ?? [];
  return variants.includes(serviceName);
}

// Verify the caller via their Supabase access token and return the user.
async function getCallerUser(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return { ok: false as const, status: 401, error: "Sign in to book" };
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false as const, status: 401, error: "Empty token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email)
    return { ok: false as const, status: 401, error: "Invalid session" };
  return { ok: true as const, email: data.user.email.toLowerCase() };
}

const BookSchema = z.object({
  benefit_label: z.string().trim().min(1).max(200),
  variant_name: z.string().trim().min(1).max(200).nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  staff_name: z.string().trim().min(1).max(100).default("Any Available Technician"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(10).max(480).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const ADMIN_EMAIL = "angie@cremedelacremenails.com";
const ALREADY_CREATED_WINDOW_MINUTES = 5;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const mn = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mn).padStart(2, "0")} ${period}`;
}

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export const Route = createFileRoute("/api/public/member-book")({
  server: {
    handlers: {
      // GET: returns the caller's membership + benefits with remaining counts
      GET: async ({ request }) => {
        const auth = await getCallerUser(request);
        if (!auth.ok)
          return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        const { data: m } = await supabaseAdmin
          .from("memberships")
          .select("*")
          .ilike("customer_email", auth.email)
          .in("status", ["active", "pending"])
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!m)
          return Response.json(
            { ok: false, error: "No active membership found for your account" },
            { status: 404 },
          );

        const periodStart = currentPeriodStart(m.enrolled_at);
        const periodEnd = nextPeriodStart(m.enrolled_at);
        const { data: redemptions } = await supabaseAdmin
          .from("membership_redemptions")
          .select("benefit_label, redeemed_at")
          .eq("membership_id", m.id);
        const inPeriod = (redemptions ?? []).filter((r) => new Date(r.redeemed_at) >= periodStart);

        // Already-scheduled future member bookings count toward "pending" usage
        // so members can't double-book the same benefit before redemption.
        const today = new Date().toISOString().slice(0, 10);
        const { data: pendingBookings } = await supabaseAdmin
          .from("bookings")
          .select("service_name, appointment_date, status")
          .eq("customer_email", m.customer_email)
          .eq("is_member", true)
          .gte("appointment_date", today)
          .neq("status", "cancelled");

        const tierBenefits = getTierBenefits(m.tier_name);
        const benefits = tierBenefits.map((b) => {
          const used = inPeriod.filter((r) => r.benefit_label === b.label).length;
          const pending = (pendingBookings ?? []).filter((pb) =>
            matchesBenefit(pb.service_name, b.label),
          ).length;
          return {
            label: b.label,
            quantity: b.quantity,
            used,
            pending,
            remaining: Math.max(0, b.quantity - used - pending),
          };
        });

        return Response.json({
          ok: true,
          membership: {
            id: m.id,
            firstName: m.customer_first_name,
            lastName: m.customer_last_name,
            email: m.customer_email,
            phone: m.customer_phone,
            tier: m.tier_name,
            monthlyPrice: `$${(m.monthly_price_cents / 100).toFixed(2)}`,
            periodEnd: periodEnd.toISOString(),
          },
          benefits,
        });
      },

      POST: async ({ request }) => {
        const auth = await getCallerUser(request);
        if (!auth.ok)
          return Response.json({ ok: false, error: auth.error }, { status: auth.status });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = BookSchema.safeParse(body);
        if (!parsed.success)
          return Response.json({ ok: false, error: parsed.error.message }, { status: 400 });
        const data = parsed.data;

        // Compute "today" in America/New_York so end-of-month is correct regardless of server TZ.
        const nyParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const nyGet = (t: string) => Number(nyParts.find((p) => p.type === t)?.value ?? "0");
        const nyYear = nyGet("year");
        const nyMonth = nyGet("month");
        const nyDay = nyGet("day");
        const [y, mo, d] = data.appointment_date.split("-").map(Number);
        // Compare as YYYYMMDD numbers to avoid TZ pitfalls
        const apptNum = y * 10000 + mo * 100 + d;
        const todayNum = nyYear * 10000 + nyMonth * 100 + nyDay;
        if (apptNum < todayNum) {
          return Response.json(
            { ok: false, error: "Appointment date cannot be in the past" },
            { status: 400 },
          );
        }
        // Free member benefits reset on the 1st — disallow booking into a future month (NY time).
        if (y > nyYear || (y === nyYear && mo > nyMonth)) {
          return Response.json(
            {
              ok: false,
              error:
                "Membership benefits can only be booked within the current month. They reset on the 1st.",
            },
            { status: 400 },
          );
        }

        // Find the caller's membership
        const { data: m } = await supabaseAdmin
          .from("memberships")
          .select("*")
          .ilike("customer_email", auth.email)
          .in("status", ["active", "pending"])
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!m)
          return Response.json(
            { ok: false, error: "No active membership found for your account" },
            { status: 404 },
          );

        // Validate benefit belongs to tier
        const tierBenefits = getTierBenefits(m.tier_name);
        const benefit = tierBenefits.find((b) => b.label === data.benefit_label);
        if (!benefit)
          return Response.json(
            { ok: false, error: "Benefit not part of your tier" },
            { status: 400 },
          );

        // Compute remaining
        const periodStart = currentPeriodStart(m.enrolled_at);
        const { data: redemptions } = await supabaseAdmin
          .from("membership_redemptions")
          .select("benefit_label, redeemed_at")
          .eq("membership_id", m.id);
        const inPeriod = (redemptions ?? []).filter((r) => new Date(r.redeemed_at) >= periodStart);
        const usedCount = inPeriod.filter((r) => r.benefit_label === benefit.label).length;

        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: pendingBookings } = await supabaseAdmin
          .from("bookings")
          .select("service_name, appointment_date, status")
          .eq("customer_email", m.customer_email)
          .eq("is_member", true)
          .gte("appointment_date", todayStr)
          .neq("status", "cancelled");
        const pendingCount = (pendingBookings ?? []).filter((pb) =>
          matchesBenefit(pb.service_name, benefit.label),
        ).length;

        const remaining = benefit.quantity - usedCount - pendingCount;
        if (remaining <= 0) {
          return Response.json(
            {
              ok: false,
              error: `You've used all ${benefit.quantity} of your ${benefit.label} this month. Benefits reset on the 1st.`,
            },
            { status: 409 },
          );
        }

        // Slot availability (DB + live Square calendar)
        const preferredTeamMemberIds: string[] = [];
        try {
          const slot = await checkSlotAvailability({
            supabase: supabaseAdmin,
            squareToken: process.env.SQUARE_ACCESS_TOKEN,
            squareLocationId: process.env.SQUARE_LOCATION_ID,
            date: data.appointment_date,
            time: data.appointment_time,
            durationMinutes: data.duration_minutes ?? 60,
            staffId: data.staff_id ?? null,
          });
          if (!slot.ok) return Response.json({ ok: false, error: slot.reason }, { status: 409 });
          if (slot.freeStaffIds && slot.freeStaffIds.length) {
            const { data: mapRows } = await supabaseAdmin
              .from("bookings")
              .select("staff_id, square_team_member_id")
              .in("staff_id", slot.freeStaffIds)
              .not("square_team_member_id", "is", null)
              .order("created_at", { ascending: false })
              .limit(200);
            const seen = new Set<string>();
            for (const r of (mapRows ?? []) as Array<{ square_team_member_id?: string | null }>) {
              if (r.square_team_member_id && !seen.has(r.square_team_member_id)) {
                seen.add(r.square_team_member_id);
                preferredTeamMemberIds.push(r.square_team_member_id);
              }
            }
          }
        } catch (e) {
          console.error("member-book slot revalidation failed (non-fatal):", e);
        }

        // When a variant is chosen, it already names the specific service
        // (e.g. "Gel Manicure + Soak-Off") — don't prefix the benefit
        // label or it shows up as "Gel Manicure + Gel Soak: Gel Manicure
        // + Soak-Off" in confirmation emails.
        const serviceName =
          data.variant_name && data.variant_name !== data.benefit_label
            ? data.variant_name
            : data.benefit_label;

        const recentlyCreatedSince = new Date(
          Date.now() - ALREADY_CREATED_WINDOW_MINUTES * 60_000,
        ).toISOString();
        const { data: existingRecent } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("customer_email", m.customer_email)
          .eq("is_member", true)
          .eq("service_name", serviceName)
          .eq("appointment_date", data.appointment_date)
          .eq("appointment_time", normalizeTime(data.appointment_time))
          .neq("status", "cancelled")
          .gte("created_at", recentlyCreatedSince)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingRecent?.id) {
          return Response.json({
            ok: true,
            bookingId: existingRecent.id,
            membershipId: m.id,
            alreadyExists: true,
          });
        }

        // Insert booking — free for members, deposit_paid=true, is_member=true
        const memberNote = `[Membership ${m.tier_name}] ${data.notes ?? ""}`.trim();
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("bookings")
          .insert({
            customer_first_name: m.customer_first_name,
            customer_last_name: m.customer_last_name,
            customer_email: m.customer_email,
            customer_phone: m.customer_phone,
            customer_type: "returning",
            is_member: true,
            service_name: serviceName,
            service_category: "Membership",
            staff_id: data.staff_id ?? null,
            staff_name: data.staff_name,
            appointment_date: data.appointment_date,
            appointment_time: data.appointment_time,
            duration_minutes: data.duration_minutes ?? 60,
            deposit_paid: true,
            status: "new",
            notes: memberNote,
          })
          .select()
          .single();
        if (insertError || !inserted) {
          if ((insertError as { code?: string } | null)?.code === "23505") {
            return Response.json(
              { ok: false, error: "That time was just taken — please pick another slot." },
              { status: 409 },
            );
          }
          console.error("Member booking insert failed", insertError);
          return Response.json({ ok: false, error: "Could not save booking" }, { status: 500 });
        }

        // Push to Square calendar (non-fatal, timeout-bounded so the
        // member never sees an endless spinner if Square is slow).
        const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
          Promise.race([
            p,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
            ),
          ]);

        const squareToken = process.env.SQUARE_ACCESS_TOKEN;
        const squareLocation = process.env.SQUARE_LOCATION_ID;
        if (squareToken && squareLocation) {
          let squareBookingId: string | null = null;
          let squareTeamMemberId: string | null = null;
          let squareSyncError: string | null = null;
          try {
            const result = await withTimeout(
              pushBookingToSquare(
                { token: squareToken, locationId: squareLocation },
                {
                  serviceName,
                  staffName: data.staff_name,
                  appointmentDate: data.appointment_date,
                  appointmentTime: data.appointment_time,
                  durationMinutes: data.duration_minutes ?? 60,
                  customer: {
                    firstName: m.customer_first_name,
                    lastName: m.customer_last_name,
                    email: m.customer_email,
                    phone: m.customer_phone,
                  },
                  notes: `✅ PREPAID — ${m.tier_name} MEMBERSHIP BENEFIT. Do NOT invoice or charge at checkout. Service is fully covered by the member's monthly subscription.`,
                  preferredTeamMemberIds,
                  idempotencyKey: inserted.id,
                },
              ),
              9000,
              "Square sync",
            );
            squareBookingId = result.bookingId;
            squareTeamMemberId = result.teamMemberId;
          } catch (e: unknown) {
            squareSyncError = e instanceof Error ? e.message : "Square sync error";
            console.error("Member Square sync failed (non-fatal)", squareSyncError);
          }
          if (squareBookingId || squareSyncError) {
            try {
              await withTimeout(
                Promise.resolve(
                  supabaseAdmin
                    .from("bookings")
                    .update({
                      square_booking_id: squareBookingId,
                      square_team_member_id: squareTeamMemberId,
                      square_sync_error: squareSyncError,
                    })
                    .eq("id", inserted.id),
                ),
                3000,
                "Square sync update",
              );
            } catch (err) {
              console.error("Failed to update booking with Square result", err);
            }
          }
        }

        // Confirmation emails — bounded so a slow queue can't hang the booking.
        const sendBookingEmail = async (recipient: string, isAdmin: boolean) => {
          try {
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: "booking-confirmation",
                recipient_email: recipient,
                idempotency_key: `member-booking-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
                message_id: crypto.randomUUID(),
                template_data: {
                  customerName: `${m.customer_first_name} ${m.customer_last_name}`,
                  customerEmail: m.customer_email,
                  serviceName,
                  serviceCategory: `Membership · ${m.tier_name}`,
                  staffName: data.staff_name,
                  appointmentDate: formatDate(data.appointment_date),
                  appointmentTime: formatTime(data.appointment_time),
                  phone: m.customer_phone,
                  notes: `Free with your ${m.tier_name} membership — no payment due at the salon.`,
                  isAdmin,
                  depositPaid: "$0.00",
                  feePaid: "$0.00",
                  chargedToday: "$0.00",
                },
              } as never,
            });
          } catch (err) {
            console.error("Failed to enqueue member booking email", err);
          }
        };

        try {
          await withTimeout(
            Promise.all([
              sendBookingEmail(m.customer_email, false),
              sendBookingEmail(ADMIN_EMAIL, true),
            ]),
            4000,
            "Member booking emails",
          );
        } catch (err) {
          console.error("Email enqueue exceeded budget (non-fatal)", err);
        }

        return Response.json({
          ok: true,
          bookingId: inserted.id,
          membershipId: m.id,
        });
      },
    },
  },
});
