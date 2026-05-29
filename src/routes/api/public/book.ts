import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { pushBookingToSquare } from "@/lib/square-bookings";
import { awardPointsForBooking } from "@/lib/square-loyalty";
import { checkSlotAvailability } from "@/lib/slot-availability";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

const Schema = z.object({
  customer_first_name: z.string().trim().min(1).max(100),
  customer_last_name: z.string().trim().min(1).max(100),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(5).max(50),
  customer_type: z.enum(["new", "returning"]).default("new"),
  is_member: z.boolean().default(false),
  service_id: z.string().uuid().nullable().optional(),
  service_name: z.string().trim().min(1).max(200),
  service_category: z.string().trim().max(100).nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  staff_name: z.string().trim().min(1).max(100).default("Any Available Technician"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(10).max(480).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}
function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr); const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export const Route = createFileRoute("/api/public/book")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
        }
        const data = parsed.data;

        // Reject past dates
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [y, m, d] = data.appointment_date.split("-").map(Number);
        if (new Date(y, m - 1, d) < today) {
          return Response.json({ error: "Appointment date cannot be in the past" }, { status: 400 });
        }
        const supabase = createClient(supabaseUrl, serviceKey);

        // Re-validate slot against DB + LIVE Square calendar + staff schedule.
        // Catches walk-ins/phone bookings that were entered directly in Square POS.
        let preferredTeamMemberIds: string[] = [];
        try {
          const result = await checkSlotAvailability({
            supabase,
            squareToken: process.env.SQUARE_ACCESS_TOKEN,
            squareLocationId: process.env.SQUARE_LOCATION_ID,
            date: data.appointment_date,
            time: data.appointment_time,
            durationMinutes: data.duration_minutes ?? 60,
            staffId: data.staff_id ?? null,
          });
          if (!result.ok) {
            return Response.json({ error: result.reason }, { status: 409 });
          }
          if (result.freeStaffIds && result.freeStaffIds.length) {
            const { data: mapRows } = await supabase
              .from("bookings")
              .select("staff_id, square_team_member_id")
              .in("staff_id", result.freeStaffIds)
              .not("square_team_member_id", "is", null)
              .order("created_at", { ascending: false })
              .limit(200);
            const seen = new Set<string>();
            for (const r of (mapRows ?? []) as any[]) {
              if (r.square_team_member_id && !seen.has(r.square_team_member_id)) {
                seen.add(r.square_team_member_id);
                preferredTeamMemberIds.push(r.square_team_member_id);
              }
            }
          }
        } catch (e) {
          console.error("Slot revalidation failed (non-fatal):", e);
        }

        // Match returning customer by email or phone (last 7 digits) before insert
        let matchedCustomerId: string | null = null;
        try {
          const emailLower = data.customer_email.toLowerCase();
          const phoneDigits = data.customer_phone.replace(/\D/g, "");
          const phoneTail = phoneDigits.slice(-7);

          // Try email match first
          const { data: byEmail } = await supabase
            .from("customers")
            .select("id")
            .ilike("email", emailLower)
            .limit(1)
            .maybeSingle();
          if (byEmail?.id) {
            matchedCustomerId = byEmail.id;
          } else if (phoneTail.length >= 7) {
            // Fallback: phone tail match
            const { data: byPhone } = await supabase
              .from("customers")
              .select("id, phone, cellphone")
              .or(`phone.ilike.%${phoneTail},cellphone.ilike.%${phoneTail}`)
              .limit(1)
              .maybeSingle();
            if (byPhone?.id) matchedCustomerId = byPhone.id;
          }
        } catch (e) {
          console.error("Customer match failed (non-fatal)", e);
        }

        const { data: inserted, error } = await supabase
          .from("bookings")
          .insert({ ...data, customer_id: matchedCustomerId })
          .select()
          .single();

        if (error || !inserted) {
          console.error("Booking insert failed", error);
          return Response.json({ error: "Could not save booking" }, { status: 500 });
        }

        // Push to Square Appointments calendar (non-fatal on failure)
        const squareToken = process.env.SQUARE_ACCESS_TOKEN;
        const squareLocation = process.env.SQUARE_LOCATION_ID;
        if (squareToken && squareLocation) {
          let squareBookingId: string | null = null;
          let squareTeamMemberId: string | null = null;
          let squareSyncError: string | null = null;
          try {
            const result = await pushBookingToSquare(
              { token: squareToken, locationId: squareLocation },
              {
                serviceName: data.service_name,
                staffName: data.staff_name,
                appointmentDate: data.appointment_date,
                appointmentTime: data.appointment_time,
                durationMinutes: data.duration_minutes ?? 60,
                customer: {
                  firstName: data.customer_first_name,
                  lastName: data.customer_last_name,
                  email: data.customer_email,
                  phone: data.customer_phone,
                },
                notes: data.notes,
                preferredTeamMemberIds,
                idempotencyKey: inserted.id,
              },
            );
            squareBookingId = result.bookingId;
            squareTeamMemberId = result.teamMemberId;
          } catch (e: any) {
            squareSyncError = e?.message ?? "Unknown Square sync error";
            console.error("Square Appointments sync failed (non-fatal)", squareSyncError);
          }
          if (squareBookingId || squareSyncError) {
            await supabase
              .from("bookings")
              .update({
                square_booking_id: squareBookingId,
                square_team_member_id: squareTeamMemberId,
                square_sync_error: squareSyncError,
              })
              .eq("id", inserted.id);
          }
        }

        // Fire-and-forget emails: customer + admin
        const sendEmail = async (recipient: string, isAdmin: boolean) => {
          try {
            const url = new URL(request.url);
            const origin = `${url.protocol}//${url.host}`;
            // Direct insert into pgmq queue via service-role Supabase, bypassing JWT-protected send route
            const payload = {
              template_name: "booking-confirmation",
              recipient_email: recipient,
              idempotency_key: `booking-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
              message_id: crypto.randomUUID(),
              template_data: {
                customerName: `${data.customer_first_name} ${data.customer_last_name}`,
                serviceName: data.service_name,
                serviceCategory: data.service_category ?? undefined,
                staffName: data.staff_name,
                appointmentDate: formatDate(data.appointment_date),
                appointmentTime: formatTime(data.appointment_time),
                phone: data.customer_phone,
                notes: data.notes ?? undefined,
                isAdmin,
              },
            };
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: payload as never,
            });
            void origin;
          } catch (e) {
            console.error("Failed to enqueue booking email", e);
          }
        };

        await Promise.all([
          sendEmail(data.customer_email, false),
          sendEmail(ADMIN_EMAIL, true),
        ]);

        // Award 1 Square Loyalty point (non-fatal)
        if (squareToken && squareLocation) {
          await awardPointsForBooking({
            token: squareToken,
            locationId: squareLocation,
            phone: data.customer_phone,
            points: 1,
            idempotencyKey: `booking-${inserted.id}`,
          });
        }

        return Response.json({ success: true, id: inserted.id });
      },
    },
  },
});
