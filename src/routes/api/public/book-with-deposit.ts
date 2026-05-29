import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { pushBookingToSquare } from "@/lib/square-bookings";
import { awardPointsForBooking } from "@/lib/square-loyalty";
import { checkSlotAvailability } from "@/lib/slot-availability";
import { parsePriceCents, formatMoney } from "@/lib/booking";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";
const DEPOSIT_CENTS = 2000; // $20 deposit
const FEE_CENTS = 200; // $2 processing fee
const CHARGE_CENTS = DEPOSIT_CENTS + FEE_CENTS; // $22 charged today

const ServiceLineSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  duration_minutes: z.number().int().min(5).max(480),
  price_text: z.string().trim().max(100).nullable().optional(),
  category_name: z.string().trim().max(100).nullable().optional(),
});

const BookingSchema = z.object({
  customer_first_name: z.string().trim().min(1).max(100),
  customer_last_name: z.string().trim().min(1).max(100),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(5).max(50),
  customer_type: z.enum(["new", "returning"]).default("new"),
  is_member: z.boolean().default(false),
  service_id: z.string().uuid().nullable().optional(),
  service_name: z.string().trim().min(1).max(500),
  service_category: z.string().trim().max(100).nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  staff_name: z.string().trim().min(1).max(100).default("Any Available Technician"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(10).max(480).nullable().optional(),
  service_price_text: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  // NEW: per-service breakdown for combos / multi-service reservations.
  services: z.array(ServiceLineSchema).min(1).max(3).optional(),
});

const Schema = z.object({
  source_id: z.string().min(1).max(500),
  idempotency_key: z.string().min(8).max(128),
  
  booking: BookingSchema,
});

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
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
// Extract first dollar amount from a price string like "$40", "$40+", "$40-$60", "From $40"

export const Route = createFileRoute("/api/public/book-with-deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const squareToken = process.env.SQUARE_ACCESS_TOKEN;
        const squareLocation = process.env.SQUARE_LOCATION_ID;
        if (!supabaseUrl || !serviceKey || !squareToken || !squareLocation) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const { source_id, idempotency_key, booking: data } = parsed.data;

        // Reject past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [y, m, d] = data.appointment_date.split("-").map(Number);
        if (new Date(y, m - 1, d) < today) {
          return Response.json(
            { error: "Appointment date cannot be in the past" },
            { status: 400 },
          );
        }

        // Re-validate slot against DB + LIVE Square calendar + staff schedule
        // BEFORE charging the deposit. Prevents double-booking from races AND
        // walk-ins/phone bookings entered directly in Square POS.
        const supabaseRevalidate = createClient(supabaseUrl, serviceKey);
        let preferredTeamMemberIds: string[] = [];
        try {
          const result = await checkSlotAvailability({
            supabase: supabaseRevalidate,
            squareToken,
            squareLocationId: squareLocation,
            date: data.appointment_date,
            time: data.appointment_time,
            durationMinutes: data.duration_minutes ?? 60,
            staffId: data.staff_id ?? null,
          });
          if (!result.ok) {
            return Response.json({ error: result.reason }, { status: 409 });
          }
          if (result.freeStaffIds && result.freeStaffIds.length) {
            const { data: mapRows } = await supabaseRevalidate
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
          console.error("Slot revalidation failed (continuing — will trust client):", e);
        }

        // 1. Create a Square Order with the FULL service price, then charge
        //    the $20 deposit + $2 fee against it. This way Angie's Square POS
        //    sees an order with $22 already paid and the correct balance due.
        const SQ_HEADERS = {
          Authorization: `Bearer ${squareToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-10-17",
        };
        // Build line items: one per service in the cart (or fallback to single).
        const cartLines =
          data.services && data.services.length > 0
            ? data.services
            : [
                {
                  id: data.service_id ?? null,
                  name: data.service_name,
                  duration_minutes: data.duration_minutes ?? 60,
                  price_text: data.service_price_text ?? null,
                  category_name: data.service_category ?? null,
                },
              ];
        const lineItems = cartLines.map((line) => {
          const cents = parsePriceCents(line.price_text);
          return {
            quantity: "1",
            name: line.name,
            note:
              cartLines.length > 1
                ? `Part of multi-service reservation — ${data.customer_first_name} ${data.customer_last_name}`
                : `Booked via website — ${data.customer_first_name} ${data.customer_last_name}`,
            base_price_money: { amount: cents ?? 0, currency: "USD" },
          };
        });
        // Sum the parseable prices to know if we should create a Square order at all.
        const servicePriceCentsForOrder = cartLines.reduce<number | null>((acc, l) => {
          const c = parsePriceCents(l.price_text);
          if (acc === null || c === null) return null;
          return acc + c;
        }, 0);
        let squareOrderId: string | null = null;
        if (servicePriceCentsForOrder && servicePriceCentsForOrder > 0) {
          try {
            const orderRes = await fetch("https://connect.squareup.com/v2/orders", {
              method: "POST",
              headers: SQ_HEADERS,
              body: JSON.stringify({
                idempotency_key: `order-${idempotency_key}`,
                order: {
                  location_id: squareLocation,
                  state: "OPEN",
                  reference_id: `web-${idempotency_key}`.slice(0, 40),
                  line_items: [
                    ...lineItems,
                    {
                      quantity: "1",
                      name: "Online booking processing fee",
                      base_price_money: { amount: FEE_CENTS, currency: "USD" },
                    },
                  ],
                  // Show $20 deposit credit natively on the Square order/receipt.
                  discounts: [
                    {
                      name: "Website deposit credit ($20 prepaid)",
                      amount_money: { amount: DEPOSIT_CENTS, currency: "USD" },
                      type: "FIXED_AMOUNT",
                      scope: "ORDER",
                    },
                  ],
                },
              }),
            });
            const orderJson = (await orderRes.json()) as {
              order?: { id: string };
              errors?: Array<{ detail?: string }>;
            };
            if (orderRes.ok && orderJson.order?.id) {
              squareOrderId = orderJson.order.id;
            } else {
              console.error("Square order create failed (non-fatal)", orderJson);
            }
          } catch (e) {
            console.error("Square order create error (non-fatal)", e);
          }
        }

        // 2. Charge deposit + fee via Square Payments API, linked to the order
        let squarePaymentId: string;
        try {
          const sqRes = await fetch("https://connect.squareup.com/v2/payments", {
            method: "POST",
            headers: SQ_HEADERS,
            body: JSON.stringify({
              source_id,
              idempotency_key,
              amount_money: { amount: CHARGE_CENTS, currency: "USD" },
              location_id: squareLocation,
              autocomplete: true,
              // NOTE: We intentionally do NOT link this payment to squareOrderId.
              // The order is created with the full service price as line items so
              // Angie can see it in the POS, but Square's Payments API rejects a
              // payment whose amount doesn't equal the linked order's total
              // (ORDER_TOTAL_MISMATCH). Linking partial payments requires the
              // Orders/Tenders flow which we don't use here. Keep payment standalone
              // and reference the order in the note instead.
              note: `Deposit ($20) + fee ($2): ${data.service_name} — ${data.customer_first_name} ${data.customer_last_name}${squareOrderId ? ` [Order ${squareOrderId}]` : ""}`,
              buyer_email_address: data.customer_email,
            }),
          });
          const sqJson = (await sqRes.json()) as {
            payment?: { id: string };
            errors?: Array<{ detail?: string; code?: string; category?: string; field?: string }>;
          };
          if (!sqRes.ok || !sqJson.payment?.id) {
            const err = sqJson.errors?.[0];
            const detail = err?.detail ?? "Card was declined";
            const code = err?.code ? ` (${err.code})` : "";
            console.error("Square charge failed", { status: sqRes.status, errors: sqJson.errors });
            return Response.json(
              { error: `${detail}${code}`, square_code: err?.code, square_category: err?.category },
              { status: 402 },
            );
          }
          squarePaymentId = sqJson.payment.id;
        } catch (e) {
          console.error("Square API error", e);
          return Response.json(
            { error: "Payment service unavailable. Please try again or contact us." },
            { status: 502 },
          );
        }

        // 2. Create the booking with deposit info
        const supabase = createClient(supabaseUrl, serviceKey);

        let matchedCustomerId: string | null = null;
        try {
          const emailLower = data.customer_email.toLowerCase();
          const phoneDigits = data.customer_phone.replace(/\D/g, "");
          const phoneTail = phoneDigits.slice(-7);
          const { data: byEmail } = await supabase
            .from("customers")
            .select("id")
            .ilike("email", emailLower)
            .limit(1)
            .maybeSingle();
          if (byEmail?.id) matchedCustomerId = byEmail.id;
          else if (phoneTail.length >= 7) {
            const { data: byPhone } = await supabase
              .from("customers")
              .select("id")
              .or(`phone.ilike.%${phoneTail},cellphone.ilike.%${phoneTail}`)
              .limit(1)
              .maybeSingle();
            if (byPhone?.id) matchedCustomerId = byPhone.id;
          }
        } catch (e) {
          console.error("Customer match failed (non-fatal)", e);
        }

        // Strip fields that aren't columns on the bookings table
        const { service_price_text: _spt, services: _svcs, ...bookingData } = data;

        const { data: inserted, error } = await supabase
          .from("bookings")
          .insert({
            ...bookingData,
            customer_id: matchedCustomerId,
            deposit_amount_cents: DEPOSIT_CENTS,
            deposit_paid: true,
            square_payment_id: squarePaymentId,
            status: "confirmed",
          })
          .select()
          .single();

        if (error || !inserted) {
          // Booking row could not be written. The deposit was already
          // captured against Square, so auto-refund (best-effort) so the
          // customer is never charged for a booking we don't actually have.
          let refundOk = false;
          let refundId: string | null = null;
          try {
            const refundRes = await fetch("https://connect.squareup.com/v2/refunds", {
              method: "POST",
              headers: SQ_HEADERS,
              body: JSON.stringify({
                idempotency_key: `refund-${idempotency_key}`.slice(0, 45),
                payment_id: squarePaymentId,
                amount_money: { amount: CHARGE_CENTS, currency: "USD" },
                reason: "Booking could not be saved — automatic refund",
              }),
            });
            const refundJson = (await refundRes.json()) as {
              refund?: { id: string };
              errors?: Array<{ detail?: string }>;
            };
            if (refundRes.ok && refundJson.refund?.id) {
              refundOk = true;
              refundId = refundJson.refund.id;
            } else {
              console.error("Auto-refund failed", refundJson);
            }
          } catch (e) {
            console.error("Auto-refund error", e);
          }

          // DB-level partial unique index caught a race the app check missed.
          if ((error as { code?: string } | null)?.code === "23505") {
            return Response.json(
              {
                error: refundOk
                  ? "That time was just booked — your deposit has been refunded. Please pick another slot."
                  : "That time was just booked. We couldn't auto-refund — please contact us with reference " +
                    squarePaymentId,
                clearTime: true,
                refunded: refundOk,
                refund_id: refundId,
              },
              { status: 409 },
            );
          }
          console.error("CRITICAL: deposit charged but booking insert failed", {
            squarePaymentId,
            refundOk,
            refundId,
            error,
            data,
          });
          return Response.json(
            {
              error: refundOk
                ? "We couldn't save your booking — your deposit has been refunded. Please try again or contact us."
                : "Payment was charged but we couldn't save your booking. Please contact us with this reference: " +
                  squarePaymentId,
              refunded: refundOk,
              refund_id: refundId,
            },
            { status: 500 },
          );
        }

        // 3. Push to Square Appointments — non-fatal on failure.
        // For multi-service reservations we list each service in the appointment notes
        // (Square Appointments accepts a single service_variation per booking).
        let squareBookingId: string | null = null;
        let squareSyncError: string | null = null;
        let squareTeamMemberId: string | null = null;
        try {
          const balancePreview = servicePriceCentsForOrder
            ? formatMoney(Math.max(0, servicePriceCentsForOrder - DEPOSIT_CENTS))
            : "see service price";
          const breakdown =
            cartLines.length > 1
              ? `Services (${cartLines.length}):\n${cartLines.map((l) => `  • ${l.name}${l.price_text ? ` — ${l.price_text}` : ""} (${l.duration_minutes} min)`).join("\n")}`
              : null;
          const depositNote = `✅ DEPOSIT $20 + FEE $2 PAID via website (Payment ${squarePaymentId}${squareOrderId ? `, Order ${squareOrderId}` : ""}). Balance owed at checkout: ${balancePreview}.`;
          const customerNote = [breakdown, data.notes, depositNote].filter(Boolean).join("\n\n");
          const squareServiceName = cartLines.length === 1 ? cartLines[0].name : data.service_name;
          const result = await pushBookingToSquare(
            { token: squareToken, locationId: squareLocation },
            {
              serviceName: squareServiceName,
              staffName: data.staff_name,
              appointmentDate: data.appointment_date,
              appointmentTime: data.appointment_time,
              durationMinutes:
                cartLines.reduce((s, l) => s + l.duration_minutes, 0) ||
                data.duration_minutes ||
                60,
              customer: {
                firstName: data.customer_first_name,
                lastName: data.customer_last_name,
                email: data.customer_email,
                phone: data.customer_phone,
              },
              notes: customerNote,
              preferredTeamMemberIds,
              idempotencyKey: inserted.id,
              services:
                cartLines.length > 1
                  ? cartLines.map((l) => ({
                      name: l.name,
                      durationMinutes: l.duration_minutes,
                    }))
                  : undefined,
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

        // 4. Send confirmation emails
        const servicePriceCents =
          servicePriceCentsForOrder ?? parsePriceCents(data.service_price_text);
        const balanceCents =
          servicePriceCents != null ? Math.max(0, servicePriceCents - DEPOSIT_CENTS) : null;

        const sendEmail = async (recipient: string, isAdmin: boolean): Promise<boolean> => {
          try {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: "booking-confirmation",
                recipient_email: recipient,
                idempotency_key: `booking-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
                message_id: crypto.randomUUID(),
                template_data: {
                  customerName: `${data.customer_first_name} ${data.customer_last_name}`,
                  customerEmail: data.customer_email,
                  serviceName: data.service_name,
                  serviceCategory: data.service_category ?? undefined,
                  servicePrice: data.service_price_text ?? undefined,
                  staffName: data.staff_name,
                  appointmentDate: formatDate(data.appointment_date),
                  appointmentTime: formatTime(data.appointment_time),
                  phone: data.customer_phone,
                  notes: data.notes ?? undefined,
                  servicesBreakdown:
                    cartLines.length > 1
                      ? cartLines
                          .map(
                            (l) =>
                              `${l.name}${l.price_text ? ` — ${l.price_text}` : ""} (${l.duration_minutes} min)`,
                          )
                          .join(" | ")
                      : undefined,
                  isAdmin,
                  depositPaid: formatMoney(DEPOSIT_CENTS),
                  feePaid: formatMoney(FEE_CENTS),
                  chargedToday: formatMoney(CHARGE_CENTS),
                  balanceDue: balanceCents != null ? formatMoney(balanceCents) : undefined,
                  squarePaymentId,
                  squareBookingId: squareBookingId ?? undefined,
                  squareSyncError: squareSyncError ?? undefined,
                },
              } as never,
            });
            return true;
          } catch (e) {
            console.error("Failed to enqueue booking email", e);
            return false;
          }
        };
        const [customerEmailOk, adminEmailOk] = await Promise.all([
          sendEmail(data.customer_email, false),
          sendEmail(ADMIN_EMAIL, true),
        ]);
        if (!customerEmailOk && !adminEmailOk) {
          // Both confirmation emails failed to enqueue. Surface a redacted,
          // grep-friendly alert in the server logs so silent template/queue
          // breakage doesn't go unnoticed. Booking still succeeds.
          const at = data.customer_email.indexOf("@");
          const redactedEmail =
            at > 0 ? `${data.customer_email[0]}***${data.customer_email.slice(at)}` : "***";
          console.error(
            `[BOOKING_EMAIL_ALERT] Both confirmation emails failed to enqueue for booking ${inserted.id} (customer: ${redactedEmail}). Check email template + queue.`,
          );
        }

        // Award 1 Square Loyalty point (non-fatal)
        await awardPointsForBooking({
          token: squareToken,
          locationId: squareLocation,
          phone: data.customer_phone,
          points: 1,
          idempotencyKey: `booking-${inserted.id}`,
        });

        return Response.json({
          success: true,
          id: inserted.id,
          payment_id: squarePaymentId,
          deposit_cents: DEPOSIT_CENTS,
          fee_cents: FEE_CENTS,
          charged_cents: CHARGE_CENTS,
        });
      },
    },
  },
});
