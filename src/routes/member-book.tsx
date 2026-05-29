import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Clock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { generateTimeSlots, formatTime12h } from "@/lib/booking";
import { BENEFIT_VARIANTS } from "@/lib/membership-tiers";

export const Route = createFileRoute("/member-book")({
  head: () => ({
    meta: [
      { title: "Members — Book Your Visit · Crème de la Crème Nails ®" },
      {
        name: "description",
        content:
          "Members: book your monthly appointment using your membership benefits. No payment required.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MemberBookPage,
});

type Benefit = {
  label: string;
  quantity: number;
  used: number;
  pending: number;
  remaining: number;
};
type Membership = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tier: string;
  monthlyPrice?: string;
  periodEnd: string;
};
type Staff = { id: string; name: string; work_days: number[] };
type ServiceRow = { name: string; duration_minutes: number };
type HistoryBooking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  staff_name: string;
  status: string;
  is_member: boolean;
  duration_minutes: number | null;
};

const RETRYABLE_BOOKING_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function freshAccessToken(forceRefresh = false): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const expiresSoon = session?.expires_at
    ? session.expires_at * 1000 - Date.now() < 5 * 60 * 1000
    : true;
  if (forceRefresh || expiresSoon) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  return session?.access_token ?? null;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await freshAccessToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function MemberBookPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [benefit, setBenefit] = useState<Benefit | null>(null);
  const [variantName, setVariantName] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("Any Available Technician");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<
    Array<{ start: string; duration_minutes: number; staff_id: string | null }>
  >([]);
  const [schedule, setSchedule] = useState<
    Array<{ staff_id: string; start_time: string; end_time: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"upcoming" | "past">("upcoming");
  const [history, setHistory] = useState<{
    upcoming: HistoryBooking[];
    past: HistoryBooking[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Check auth + load membership
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSignedIn(false);
        setChecking(false);
        return;
      }
      setSignedIn(true);
      try {
        const r = await fetch("/api/public/member-book", { headers: await authHeaders() });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          setErrorMsg(j?.error ?? "Could not load membership");
        } else {
          setMembership(j.membership);
          setBenefits(j.benefits);
          const first = (j.benefits as Benefit[]).find((b) => b.remaining > 0);
          if (first) setBenefit(first);
        }
      } catch {
        setErrorMsg("Could not load membership");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // Load active staff + services list (services for duration lookup)
  useEffect(() => {
    if (!membership) return;
    supabase
      .from("staff")
      .select("id,name,work_days")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => setStaffList((data ?? []) as Staff[]));
    supabase
      .from("services")
      .select("name,duration_minutes")
      .eq("active", true)
      .then(({ data }) => setServices((data ?? []) as ServiceRow[]));
  }, [membership]);

  // Reset variant when benefit changes
  useEffect(() => {
    if (!benefit) {
      setVariantName(null);
      return;
    }
    const variants = BENEFIT_VARIANTS[benefit.label];
    setVariantName(variants && variants.length > 0 ? variants[0] : null);
  }, [benefit]);

  // Resolve duration from services table by service name lookup
  const duration = useMemo(() => {
    if (!benefit) return 60;
    const candidates: string[] = [];
    const variants = BENEFIT_VARIANTS[benefit.label];
    if (variantName) candidates.push(variantName);
    if (variants && variants.length > 0) candidates.push(variants[0]);
    candidates.push(benefit.label);
    for (const cand of candidates) {
      const match = services.find((s) => s.name.toLowerCase() === cand.toLowerCase());
      if (match?.duration_minutes) return match.duration_minutes;
    }
    return 60;
  }, [benefit, variantName, services]);

  // Load busy slots
  useEffect(() => {
    if (!date) {
      setBusy([]);
      setSchedule([]);
      return;
    }
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const params = new URLSearchParams({ date: dateStr, staff_id: staffId ?? "any" });
    let cancelled = false;
    fetch(`/api/public/busy-slots?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setBusy(Array.isArray(j?.busy) ? j.busy : []);
        setSchedule(Array.isArray(j?.schedule) ? j.schedule : []);
      })
      .catch(() => {
        if (!cancelled) {
          setBusy([]);
          setSchedule([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [date, staffId]);

  // Lazy-load history when section is opened
  useEffect(() => {
    if (!historyOpen || history || historyLoading) return;
    setHistoryLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/public/member-history", { headers: await authHeaders() });
        const j = await r.json();
        if (r.ok && j.ok) setHistory({ upcoming: j.upcoming ?? [], past: j.past ?? [] });
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [historyOpen, history, historyLoading]);

  const allowedDays = useMemo(() => {
    const selected = staffId ? staffList.find((t) => t.id === staffId) : null;
    return new Set<number>(
      selected ? (selected.work_days ?? []) : staffList.flatMap((t) => t.work_days ?? []),
    );
  }, [staffId, staffList]);

  const timeSlots = useMemo(() => (date ? generateTimeSlots(date) : []), [date]);

  const isSlotAvailable = (slotHHMM: string): boolean => {
    if (!date) return false;
    const toMin = (s: string) => {
      const [h, m] = s.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };
    const start = toMin(slotHHMM);
    const end = start + duration;
    const closing = date.getDay() === 0 ? 18 * 60 : 19 * 60;
    if (end > closing) return false;

    const TZ = "America/New_York";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const todayStr = `${get("year")}-${get("month")}-${get("day")}`;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (dateStr === todayStr) {
      const nowMin = Number(get("hour") === "24" ? "00" : get("hour")) * 60 + Number(get("minute"));
      if (start <= nowMin + 60) return false;
    }

    const relevant = staffId ? schedule.filter((s) => s.staff_id === staffId) : schedule;
    if (
      relevant.length &&
      !relevant.some((s) => start >= toMin(s.start_time) && end <= toMin(s.end_time))
    ) {
      return false;
    }

    const relevantBusy = staffId
      ? busy.filter((b) => b.staff_id === staffId || b.staff_id === null)
      : busy;
    for (const b of relevantBusy) {
      const bStart = toMin(b.start.slice(0, 5));
      const bEnd = bStart + b.duration_minutes;
      if (start < bEnd && end > bStart) {
        if (!staffId) {
          const techsBusyAtSlot = new Set(
            busy
              .filter((x) => {
                const xs = toMin(x.start.slice(0, 5));
                const xe = xs + x.duration_minutes;
                return start < xe && end > xs && x.staff_id;
              })
              .map((x) => x.staff_id),
          );
          if (techsBusyAtSlot.size >= staffList.length) return false;
        } else {
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return; // guard against double-clicks
    if (!benefit || !date || !time) {
      toast.error("Please choose a benefit, date and time first");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        benefit_label: benefit.label,
        variant_name: variantName,
        staff_id: staffId,
        staff_name: staffName,
        appointment_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        appointment_time: time,
        duration_minutes: duration,
        notes: notes.trim() || null,
      };

      let lastMessage = "Could not create booking — please try again";
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const token = await freshAccessToken(attempt > 0);
        if (!token) {
          toast.error("Your session expired — please sign in again");
          navigate({ to: "/member-login", search: { redirect: "/member-book" } as never });
          return;
        }

        try {
          const res = await fetch("/api/public/member-book", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify(payload),
          });
          let j: {
            ok?: boolean;
            bookingId?: string;
            alreadyExists?: boolean;
            error?: string;
          } | null = null;
          try {
            j = await res.json();
          } catch {
            /* non-JSON */
          }

          if (res.ok && j?.ok && j.bookingId) {
            toast.success(j.alreadyExists ? "Appointment already confirmed" : "Booking confirmed");
            navigate({ to: "/member-booking/$id", params: { id: j.bookingId } });
            return;
          }

          lastMessage = j?.error ?? `Could not create booking (${res.status})`;
          if ((res.status === 401 || RETRYABLE_BOOKING_STATUSES.has(res.status)) && attempt < 2) {
            await wait(350 * (attempt + 1));
            continue;
          }
          toast.error(lastMessage);
          return;
        } catch (e: unknown) {
          lastMessage = e instanceof Error ? e.message : "Network error — please try again";
          if (attempt < 2) {
            await wait(350 * (attempt + 1));
            continue;
          }
        }
      }
      toast.error(lastMessage);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  if (!signedIn) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
            <h1 className="font-serif text-3xl mb-3">Members Only</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to your member account to book your free monthly visit.
            </p>
            <Link
              to="/member-login"
              search={{ redirect: "/member-book" } as never}
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full text-xs uppercase tracking-[0.18em] hover:bg-foreground transition"
            >
              Sign in
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (errorMsg || !membership) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <h1 className="font-serif text-3xl mb-3">No active membership</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {errorMsg ?? "We couldn't find a membership tied to your account."}
            </p>
            <Link to="/membership" className="text-sm underline">
              Browse memberships
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const canSubmit = !!benefit && benefit.remaining > 0 && !!date && !!time && !submitting;
  const benefitVariants = benefit ? BENEFIT_VARIANTS[benefit.label] : undefined;
  const periodEndStr = new Date(membership.periodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-primary text-center mb-3">
            Crème Society · Members Only
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-center mb-2">Book your visit</h1>
          <p className="text-sm text-muted-foreground text-center mb-3">
            Hi {membership.firstName} — pick a benefit, choose a time, get an instant QR. No payment
            needed.
          </p>
          <div className="text-center mb-6">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/member-login" });
              }}
              className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Sign out
            </button>
          </div>

          {/* Membership info panel */}
          <section className="mb-8 rounded-md border border-border bg-muted/30 p-4">
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="uppercase tracking-[0.18em] text-muted-foreground mb-1">Tier</p>
                <p className="text-sm font-medium">{membership.tier}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-muted-foreground mb-1">Monthly</p>
                <p className="text-sm font-medium">{membership.monthlyPrice ?? "—"}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Period resets
                </p>
                <p className="text-sm font-medium">{periodEndStr}</p>
              </div>
            </div>
            <p className="text-[0.7rem] text-muted-foreground mt-3 leading-relaxed">
              <span className="uppercase tracking-[0.18em] mr-1">How to cancel:</span>
              To cancel your membership, email{" "}
              <a href="mailto:angie@cremedelacremenails.com" className="underline">
                angie@cremedelacremenails.com
              </a>{" "}
              or call{" "}
              <a href="tel:+13478808282" className="underline">
                (347) 880-8282
              </a>{" "}
              with 7 days notice before your next billing date.
            </p>
          </section>

          {/* Step 1: benefit */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
              1. Choose a benefit
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {benefits.map((b) => {
                const disabled = b.remaining <= 0;
                const selected = benefit?.label === b.label;
                return (
                  <button
                    key={b.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => setBenefit(b)}
                    className={`text-left p-4 rounded-md border transition ${
                      disabled
                        ? "opacity-50 cursor-not-allowed border-border"
                        : selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{b.label}</p>
                      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.remaining} of {b.quantity} left this month
                      {b.pending > 0 && ` · ${b.pending} scheduled`}
                    </p>
                  </button>
                );
              })}
              {benefits.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">
                  No benefits configured for your tier.
                </p>
              )}
            </div>
            {benefit && benefit.remaining <= 0 && (
              <p className="text-xs text-destructive mt-2">
                You've used all your {benefit.label} this month. Resets on the 1st.
              </p>
            )}

            {/* Variant selection */}
            {benefit && benefitVariants && benefitVariants.length > 0 && (
              <div className="mt-4 rounded-md border border-border p-4 bg-card">
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                  Choose your service option
                </p>
                <div className="space-y-2">
                  {benefitVariants.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="variant"
                        value={v}
                        checked={variantName === v}
                        onChange={() => setVariantName(v)}
                        className="accent-primary"
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Step 2: staff */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
              2. Choose a technician
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setStaffId(null);
                  setStaffName("Any Available Technician");
                }}
                className={`text-left p-4 rounded-md border transition ${
                  staffId === null
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
                }`}
              >
                <div className="font-medium text-sm">Any Available Technician</div>
              </button>
              {staffList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setStaffId(t.id);
                    setStaffName(t.name);
                  }}
                  className={`text-left p-4 rounded-md border transition ${
                    staffId === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <div className="font-medium text-sm">{t.name}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: date + time */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
              3. Pick a date & time
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">Date</Label>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  disabled={(d) => {
                    // Compute today + current month in America/New_York.
                    const nyParts = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "America/New_York",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).formatToParts(new Date());
                    const g = (t: string) =>
                      Number(nyParts.find((p) => p.type === t)?.value ?? "0");
                    const nyY = g("year"),
                      nyM = g("month"),
                      nyD = g("day");
                    const dY = d.getFullYear(),
                      dM = d.getMonth() + 1,
                      dD = d.getDate();
                    const dNum = dY * 10000 + dM * 100 + dD;
                    const tNum = nyY * 10000 + nyM * 100 + nyD;
                    if (dNum < tNum) return true;
                    // Free benefits reset on the 1st — only allow current month (NY time).
                    if (dY > nyY || (dY === nyY && dM > nyM)) return true;
                    return allowedDays.size > 0 && !allowedDays.has(d.getDay());
                  }}
                  className="rounded-md border"
                />
              </div>
              <div>
                <Label className="mb-2 block">
                  Time
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({duration} min)
                  </span>
                </Label>
                {!date && <p className="text-sm text-muted-foreground">Select a date first.</p>}
                {date && (
                  <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                    {timeSlots.map((t) => {
                      const available = isSlotAvailable(t);
                      const selected = time === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={!available}
                          onClick={() => setTime(t)}
                          className={`text-xs px-2 py-2 rounded border transition ${
                            !available
                              ? "opacity-30 cursor-not-allowed border-border"
                              : selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:border-primary"
                          }`}
                        >
                          {formatTime12h(t)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Step 4: notes */}
          <section className="mb-8">
            <Label
              htmlFor="notes"
              className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
            >
              Notes for the technician (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Color preference, allergies, anything you'd like us to know"
              className="mt-2"
              rows={3}
            />
          </section>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Period resets {periodEndStr}
            </p>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="w-full sm:w-auto"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm appointment
            </Button>
          </div>

          {/* My visits section */}
          <section className="mt-12 rounded-md border border-border">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                My visits
              </span>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {historyOpen && (
              <div className="px-4 pb-4">
                <div className="flex gap-1 mb-3">
                  {(["upcoming", "past"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHistoryTab(t)}
                      className={`px-3 py-1.5 rounded-md text-xs uppercase tracking-wider ${
                        historyTab === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {historyLoading || !history ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <HistoryList
                    items={historyTab === "upcoming" ? history.upcoming : history.past}
                    variant={historyTab}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function HistoryList({
  items,
  variant,
}: {
  items: HistoryBooking[];
  variant: "upcoming" | "past";
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {variant === "upcoming" ? "No upcoming appointments." : "No past appointments."}
      </p>
    );
  }
  return (
    <div className="divide-y divide-border">
      {items.map((b) => {
        const dateStr = new Date(`${b.appointment_date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const isCancelled = b.status === "cancelled";
        const badge = variant === "upcoming" ? b.status : isCancelled ? "Cancelled" : "Redeemed";
        const badgeClass = isCancelled
          ? "bg-red-500/15 text-red-700 dark:text-red-300"
          : variant === "past"
            ? "bg-green-500/15 text-green-700 dark:text-green-300"
            : "bg-primary/10 text-primary";
        return (
          <div key={b.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{b.service_name}</p>
              <p className="text-xs text-muted-foreground">
                {dateStr}
                {variant === "upcoming" && b.appointment_time
                  ? ` · ${formatTime12h(b.appointment_time.slice(0, 5))}`
                  : ""}
                {b.staff_name ? ` · ${b.staff_name}` : ""}
              </p>
            </div>
            <span
              className={`text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded shrink-0 ${badgeClass}`}
            >
              {badge}
            </span>
          </div>
        );
      })}
    </div>
  );
}
