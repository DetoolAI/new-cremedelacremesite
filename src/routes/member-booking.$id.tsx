import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Calendar as CalIcon, Clock, User, Sparkles } from "lucide-react";

export const Route = createFileRoute("/member-booking/$id")({
  head: () => ({
    meta: [
      { title: "Your Appointment — Crème de la Crème Nails ®" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MemberBookingConfirmation,
});

type Booking = {
  id: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number | null;
  status: string;
  notes: string | null;
  firstName: string;
};
type Membership = { id: string; tier: string };

function MemberBookingConfirmation() {
  const { id } = useParams({ from: "/member-booking/$id" });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to view this appointment.");
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/public/member-booking?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          setError(j?.error ?? "Could not load appointment");
        } else {
          setBooking(j.booking);
          setMembership(j.membership);
          if (j.membership?.id) {
            const target = `${window.location.origin}/staff/member/${j.membership.id}`;
            try {
              const dataUrl = await QRCode.toDataURL(target, {
                width: 320, margin: 1, color: { dark: "#1a0f0a", light: "#ffffff" },
              });
              setQrUrl(dataUrl);
            } catch {}
          }
        }
      } catch {
        setError("Could not load appointment");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const dateLong = booking
    ? new Date(`${booking.appointmentDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";
  const timePretty = booking
    ? (() => {
        const [hStr, mStr] = booking.appointmentTime.split(":");
        const h = Number(hStr); const m = Number(mStr);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${String(m).padStart(2, "0")} ${period}`;
      })()
    : "";

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          {loading && (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
          )}
          {!loading && error && (
            <div className="text-center">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Link to="/member-book" className="text-sm underline">Back to member booking</Link>
            </div>
          )}
          {!loading && booking && (
            <>
              <div className="text-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-primary mb-2">Crème Society</p>
                <h1 className="font-serif text-3xl mb-2">You're booked, {booking.firstName}.</h1>
                <p className="text-sm text-muted-foreground">
                  Show this QR at the front desk to redeem your benefit.
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#1a0f0a] to-[#3a1f15] text-white p-6 shadow-2xl mb-6">
                <div className="text-center mb-5">
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] opacity-70">Appointment</p>
                  <p className="font-serif text-xl mt-1">{booking.serviceName}</p>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center justify-center mb-5">
                  {qrUrl ? (
                    <img src={qrUrl} alt="Check-in QR code" className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-foreground">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="opacity-60 flex items-center gap-1.5"><CalIcon className="w-3.5 h-3.5" /> Date</span>
                    <span className="text-right">{dateLong}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="opacity-60 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                    <span>{timePretty}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="opacity-60 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Technician</span>
                    <span className="text-right">{booking.staffName}</span>
                  </div>
                  {membership && (
                    <div className="flex justify-between border-t border-white/10 pt-2">
                      <span className="opacity-60 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Tier</span>
                      <span className="text-right">{membership.tier}</span>
                    </div>
                  )}
                </div>
                <p className="text-[0.6rem] uppercase tracking-[0.25em] opacity-50 text-center mt-5">
                  Free with your membership · No payment due
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
                <p><strong className="text-foreground">At the salon:</strong> a staff member scans this QR. They'll redeem the corresponding benefit from your monthly allowance.</p>
                <p>Need to change something? Reply to your confirmation email or call (347) 880-8282.</p>
              </div>

              <div className="flex gap-3 mt-6">
                <Link
                  to="/member-book"
                  className="flex-1 text-center px-4 py-3 rounded-full border border-border text-xs uppercase tracking-[0.18em] hover:border-primary transition"
                >
                  Book another
                </Link>
                {membership && (
                  <Link
                    to="/membership-card"
                    search={{ id: membership.id } as never}
                    className="flex-1 text-center px-4 py-3 rounded-full bg-primary text-primary-foreground text-xs uppercase tracking-[0.18em] hover:bg-foreground transition"
                  >
                    Membership card
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
