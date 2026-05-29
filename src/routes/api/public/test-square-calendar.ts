import { createFileRoute } from "@tanstack/react-router";
import { pushBookingToSquare } from "@/lib/square-bookings";
import { verifyAdmin } from "@/lib/verify-admin";

/**
 * TEMPORARY admin test: pushes a fake appointment to Square Appointments only.
 * No payment, no DB row. Used to verify the Square calendar sync end-to-end.
 *
 * Body (optional): { serviceName?, staffName?, email?, firstName?, lastName?, phone? }
 */
export const Route = createFileRoute("/api/public/test-square-calendar")({
 server: {
 handlers: {
 POST: async ({ request }) => {
 const auth = await verifyAdmin(request);
 if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
 const token = process.env.SQUARE_ACCESS_TOKEN;
 const locationId = process.env.SQUARE_LOCATION_ID;
 if (!token || !locationId) {
 return Response.json({ error: "Square not configured" }, { status: 500 });
 }

 let body: any = {};
 try { body = await request.json(); } catch { /* allow empty */ }

 // Default: tomorrow at 2:00 PM local
 const d = new Date();
 d.setDate(d.getDate() + 1);
 const yyyy = d.getFullYear();
 const mm = String(d.getMonth() + 1).padStart(2, "0");
 const dd = String(d.getDate()).padStart(2, "0");
 const appointmentDate = body.appointmentDate ?? `${yyyy}-${mm}-${dd}`;
 const appointmentTime = body.appointmentTime ?? "14:00";

 try {
 const result = await pushBookingToSquare(
 { token, locationId },
 {
 serviceName: body.serviceName ?? "Manicure",
 staffName: body.staffName ?? "Angie",
 appointmentDate,
 appointmentTime,
 durationMinutes: 60,
 customer: {
 firstName: body.firstName ?? "Test",
 lastName: body.lastName ?? "Booking",
 email: body.email ?? "test+calendar@cremedelacremenails.com",
 phone: body.phone ?? "+12125550100",
 },
 notes: " TEST booking from admin sync-check button — safe to delete.",
 },
 );
 return Response.json({
 success: true,
 squareBookingId: result.bookingId,
 squareTeamMemberId: result.teamMemberId,
 scheduledFor: `${appointmentDate} ${appointmentTime}`,
 message: "Pushed to Square. Check your Square Appointments calendar.",
 });
 } catch (e: any) {
 return Response.json({
 success: false,
 error: e?.message ?? "Unknown error pushing to Square",
 }, { status: 502 });
 }
 },
 },
 },
});
