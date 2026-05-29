import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMembershipsUsage, listStaffToday, verifyStaffPin, updateAdminBooking, deleteAdminBooking, type UsageItem, type TodayBooking } from "@/lib/membership-staff";
import { getActiveStaff, setActiveStaff, clearActiveStaff, touchActiveStaff, IDLE_MS, type ActiveStaff } from "@/lib/active-staff";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Loader2, LogOut, ShieldAlert, RefreshCw, Search, ExternalLink, CreditCard, QrCode, Lock, X, Delete, UserCog, Calendar, Pencil, Trash2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

type AuthState = "loading" | "unauthenticated" | "not-staff" | "ok";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Check-in — Crème de la Crème Nails ®" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [active, setActive] = useState<ActiveStaff | null>(null);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAuthState("unauthenticated"); navigate({ to: "/auth" }); return; }
    setUserEmail(session.user.email ?? "");
    setUserId(session.user.id);
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "staff"]).maybeSingle();
    setAuthState(role ? "ok" : "not-staff");
  }, [navigate]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Hydrate active staff once authed
  useEffect(() => {
    if (authState !== "ok") return;
    setActive(getActiveStaff());
  }, [authState]);

  // Idle auto-lock: poll every 10s, lock if expired
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => {
      const cur = getActiveStaff();
      if (!cur) setActive(null);
    }, 10_000);
    return () => clearInterval(i);
  }, [active]);

  const handleLogout = async () => {
    clearActiveStaff();
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handlePinSuccess = (s: { id: string; name: string }) => {
    setActiveStaff(s);
    setActive({ ...s, touchedAt: Date.now() });
  };

  const handleLock = () => { clearActiveStaff(); setActive(null); };

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }

  if (authState === "not-staff") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-gold mx-auto mb-6" />
          <h1 className="font-serif text-3xl mb-3">Staff access required</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Signed in as <span className="text-gold">{userEmail}</span>, but no staff role on this account yet.
          </p>
          <p className="text-xs text-muted-foreground mb-8 break-all">User ID: <code className="text-gold/80">{userId}</code></p>
          <button onClick={handleLogout} className="text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-gold inline-flex items-center gap-2">
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!active) {
    return <PinGate onSuccess={handlePinSuccess} onSignOut={handleLogout} email={userEmail} />;
  }

  if (pathname.startsWith("/staff/member/")) {
    return <Outlet />;
  }

  return <CheckInDashboard active={active} email={userEmail} onLock={handleLock} onSignOut={handleLogout} />;
}

// ─── PIN gate ──────────────────────────────────────────────────────────

function PinGate({
  onSuccess, onSignOut, email,
}: { onSuccess: (s: { id: string; name: string }) => void; onSignOut: () => void; email: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (value: string) => {
    setBusy(true);
    setError(null);
    const res = await verifyStaffPin(value);
    if (res.ok) {
      onSuccess(res.staff);
    } else {
      setError(res.error || "Incorrect PIN");
      setPin("");
      // Light haptic if available
      try { (navigator as Navigator & { vibrate?: (p: number) => void }).vibrate?.(120); } catch { /* ignore */ }
    }
    setBusy(false);
  }, [onSuccess]);

  useEffect(() => {
    if (pin.length === 4 && !busy) submit(pin);
  }, [pin, busy, submit]);

  const tap = (d: string) => {
    setError(null);
    setPin((p) => (p.length >= 4 ? p : p + d));
  };
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logo} alt="Logo" className="w-12 h-12 mx-auto mb-4 object-contain" />
          <p className="tracking-luxe text-[0.6rem] text-gold">CRÈME DE LA CRÈME</p>
          <h1 className="font-serif text-2xl mt-1">Staff Check-in</h1>
          <p className="text-xs text-muted-foreground mt-3">
            <Lock className="w-3 h-3 inline mr-1" /> Enter your 4-digit PIN to continue
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-6" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border ${
                pin.length > i ? "bg-gold border-gold" : "border-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-destructive text-center mb-3">{error}</p>}
        {busy && <p className="text-xs text-muted-foreground text-center mb-3"><Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Checking…</p>}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <button
              key={d}
              onClick={() => tap(d)}
              disabled={busy}
              className="aspect-square rounded-full bg-card border border-border text-2xl font-serif hover:bg-muted active:scale-95 transition disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => tap("0")}
            disabled={busy}
            className="aspect-square rounded-full bg-card border border-border text-2xl font-serif hover:bg-muted active:scale-95 transition disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={back}
            disabled={busy || pin.length === 0}
            aria-label="Delete"
            className="aspect-square rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-[0.65rem] text-muted-foreground">Signed in as {email}</p>
          <button onClick={onSignOut} className="text-[0.65rem] tracking-[0.22em] uppercase text-muted-foreground hover:text-gold inline-flex items-center gap-1.5">
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main check-in dashboard ───────────────────────────────────────────

function CheckInDashboard({
  active, email, onLock, onSignOut,
}: { active: ActiveStaff; email: string; onLock: () => void; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ items: UsageItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "low" | "unused">("all");
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState<"members" | "today">("members");
  const [today, setToday] = useState<TodayBooking[] | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMembershipsUsage();
      if (res.ok) setData({ items: res.items });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await listStaffToday();
      if (res.ok) setToday(res.bookings);
      else toast.error(`Could not load today's schedule: ${res.error}`);
    } finally { setTodayLoading(false); }
  }, []);

  useEffect(() => {
    if (view === "today" && today === null) loadToday();
  }, [view, today, loadToday]);

  // Track activity to extend the active-staff window
  useEffect(() => {
    const onAct = () => touchActiveStaff();
    window.addEventListener("pointerdown", onAct);
    window.addEventListener("keydown", onAct);
    return () => {
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const sorted = [...data.items].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return sorted.filter((m) => {
      if (filter === "active" && m.status !== "active") return false;
      if (filter === "low" && !(m.totalRemaining <= 1 && m.totalAllowed > 0)) return false;
      if (filter === "unused" && !(m.totalUsed === 0 && m.status === "active")) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.tier.toLowerCase().includes(q)
      );
    });
  }, [data, query, filter]);

  // Format "active until" countdown is overkill — just show the staff badge.
  const idleMin = Math.round(IDLE_MS / 60000);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-cream sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="Logo" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-base leading-tight truncate">Staff Check-in</p>
              <p className="tracking-luxe text-[0.55rem] text-gold truncate">CRÈME DE LA CRÈME</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/30">
              <UserCog className="w-3 h-3" /> {active.name}
            </span>
            <button onClick={onLock} aria-label="Lock" title={`Auto-locks after ${idleMin} min`} className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground hover:text-gold">
              <Lock className="w-3 h-3" /> <span className="hidden sm:inline">Lock</span>
            </button>
            <button onClick={onSignOut} aria-label="Sign out" title={email} className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground hover:text-gold">
              <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-1 text-xs border-b border-border">
          <button
            onClick={() => setView("members")}
            className={`px-4 py-2 -mb-px border-b-2 transition uppercase tracking-wider ${
              view === "members" ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
            }`}
          >
            <CreditCard className="w-3 h-3 inline mr-1.5" /> Members
          </button>
          <button
            onClick={() => setView("today")}
            className={`px-4 py-2 -mb-px border-b-2 transition uppercase tracking-wider ${
              view === "today" ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
            }`}
          >
            <Calendar className="w-3 h-3 inline mr-1.5" /> Today
          </button>
        </div>

        {view === "members" ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, phone, tier…"
                  className="w-full pl-10 pr-3 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <button
                onClick={() => setScanning(true)}
                className="px-4 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 active:scale-95 transition"
              >
                <QrCode className="w-4 h-4" /> Scan
              </button>
            </div>

            <div className="flex gap-1 text-xs overflow-x-auto">
              {(["all", "active", "low", "unused"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md uppercase tracking-wider whitespace-nowrap ${
                    filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f === "low" ? "Running low" : f === "unused" ? "Haven't visited" : f}
                </button>
              ))}
              <button onClick={load} className="ml-auto text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-muted-foreground">
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loading && !data ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" />
                {query ? "No memberships match." : "No memberships in this view."}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {filtered.map((m) => (
                  <Link
                    key={m.id}
                    to="/staff/member/$id"
                    params={{ id: m.id }}
                    className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-medium text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.tier} · {m.monthlyPrice}/mo</p>
                        <p className="text-[0.65rem] text-muted-foreground truncate">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                      </div>
                      <div className="text-xs text-muted-foreground min-w-[120px]">
                        <p><span className="font-medium text-foreground">{m.totalUsed}/{m.totalAllowed}</span> used</p>
                        {m.lastRedeemed ? <p>Last: {new Date(m.lastRedeemed).toLocaleDateString()}</p> : <p className="italic">No visits yet</p>}
                      </div>
                      <span
                        title={m.status === "cancelled" || m.status === "paused" ? "Subscription not active — verify before redeeming" : undefined}
                        className={`text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded ${
                        m.status === "active" ? "bg-green-500/20 text-green-700 dark:text-green-300"
                        : (m.status === "cancelled" || m.status === "paused") ? "bg-red-500/20 text-red-700 dark:text-red-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}>{(m.status === "cancelled" || m.status === "paused") ? `⚠ ${m.status}` : m.status}</span>
                      <span className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <p className="text-[0.65rem] text-center text-muted-foreground pt-2">
              Locks after {idleMin} min of inactivity · {active.name} signed in
            </p>
          </>
        ) : (
          <TodayList
            bookings={today}
            loading={todayLoading}
            onRefresh={loadToday}
            onOpenMember={(id) => navigate({ to: "/staff/member/$id", params: { id } })}
          />
        )}
      </main>

      {scanning && (
        <ScannerModal
          onClose={() => setScanning(false)}
          onScan={(id) => {
            setScanning(false);
            navigate({ to: "/staff/member/$id", params: { id } });
          }}
        />
      )}
    </div>
  );
}

// ─── QR scanner modal ──────────────────────────────────────────────────

function ScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (id: string) => void }) {
  const lastHandledRef = useRef<string | null>(null);

  const extractMembershipId = (text: string): string | null => {
    const trimmed = text.trim();
    // Bare UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return trimmed;
    // URL with ?id=UUID
    try {
      const u = new URL(trimmed);
      const id = u.searchParams.get("id");
      if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
    } catch { /* not a URL */ }
    return null;
  };

  const handle = (results: IDetectedBarcode[]) => {
    for (const r of results) {
      const id = extractMembershipId(r.rawValue);
      if (id && lastHandledRef.current !== id) {
        lastHandledRef.current = id;
        onScan(id);
        return;
      }
      if (!id) toast.error("That QR code isn't a membership card.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-serif text-base">Scan membership card</p>
          <button onClick={onClose} aria-label="Close" className="p-1 -m-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-square bg-black relative">
          <Scanner
            onScan={handle}
            onError={(err) => {
              const message = err instanceof Error ? err.message : String(err);
              toast.error(`Camera error: ${message}`);
            }}
            constraints={{ facingMode: "environment" }}
            styles={{ container: { width: "100%", height: "100%" } }}
            components={{ finder: true }}
          />
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Point at the customer's card QR code</p>
        </div>
      </div>
    </div>
  );
}

// ─── Today's schedule ──────────────────────────────────────────────────

function TodayList({
  bookings, loading, onRefresh, onOpenMember,
}: {
  bookings: TodayBooking[] | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenMember: (id: string) => void;
}) {
  const [editing, setEditing] = useState<TodayBooking | null>(null);
  const [deleting, setDeleting] = useState<TodayBooking | null>(null);
  const [busy, setBusy] = useState(false);

  const fmtTime = (t: string | null) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hh = parseInt(h, 10);
    if (isNaN(hh)) return t;
    const period = hh >= 12 ? "PM" : "AM";
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${m ?? "00"} ${period}`;
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteAdminBooking(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Appointment deleted");
      setDeleting(null);
      onRefresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Today's appointments {bookings ? `· ${bookings.length}` : ""}
        </p>
        <button
          onClick={onRefresh}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-muted-foreground"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && !bookings ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No appointments today.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {bookings.map((b) => {
            const name = `${b.customer_first_name ?? ""} ${b.customer_last_name ?? ""}`.trim() || "—";
            const member = !!b.is_member;
            return (
              <div key={b.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-[70px] text-sm font-medium tabular-nums">{fmtTime(b.appointment_time)}</div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm">
                    {name}
                    {member && (
                      <span className="ml-2 inline-block text-[0.55rem] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 align-middle">
                        Member
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{b.service_name ?? "—"}</p>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    {b.staff_name ?? "Any tech"}{b.duration_minutes ? ` · ${b.duration_minutes} min` : ""}
                    {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className={`text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded ${
                    b.status === "confirmed" ? "bg-green-500/20 text-green-700 dark:text-green-300"
                    : b.status === "cancelled" ? "bg-red-500/20 text-red-700 dark:text-red-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}>
                    {b.status ?? "—"}
                  </span>
                  <button
                    onClick={() => setEditing(b)}
                    className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleting(b)}
                    className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  {b.membership_id && (
                    <button
                      onClick={() => onOpenMember(b.membership_id!)}
                      className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditBookingModal
          booking={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onRefresh(); }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="font-serif text-lg">Delete this appointment?</h3>
            <p className="text-sm text-muted-foreground">
              {`${deleting.customer_first_name ?? ""} ${deleting.customer_last_name ?? ""}`.trim()} ·{" "}
              {fmtTime(deleting.appointment_time)} · {deleting.service_name ?? "—"}
            </p>
            <p className="text-xs text-destructive">This permanently removes the booking. Use "Cancel" status if you want to keep a record.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} disabled={busy} className="px-3 py-1.5 text-xs rounded-md border border-border">Keep</button>
              <button onClick={confirmDelete} disabled={busy} className="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground inline-flex items-center gap-1">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit booking modal ────────────────────────────────────────────────

function EditBookingModal({
  booking, onClose, onSaved,
}: { booking: TodayBooking; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(booking.appointment_date ?? "");
  const [time, setTime] = useState((booking.appointment_time ?? "").slice(0, 5));
  const [status, setStatus] = useState(booking.status ?? "confirmed");
  const [duration, setDuration] = useState(booking.duration_minutes ?? 60);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await updateAdminBooking(booking.id, {
      appointment_date: date || undefined,
      appointment_time: time || undefined,
      status,
      duration_minutes: Number(duration) || undefined,
    });
    setBusy(false);
    if (res.ok) { toast.success("Appointment updated"); onSaved(); }
    else toast.error(res.error);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-serif text-base">Edit appointment</p>
          <button onClick={onClose} className="p-1 -m-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            {`${booking.customer_first_name ?? ""} ${booking.customer_last_name ?? ""}`.trim()} · {booking.service_name ?? "—"}
          </div>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Duration (min)</span>
            <input type="number" min={5} max={600} step={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)} className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="checked_in">Checked in</option>
              <option value="completed">Completed</option>
              <option value="no_show">No show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-3 py-1.5 text-xs rounded-md border border-border">Cancel</button>
          <button onClick={save} disabled={busy} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1">
            {busy && <Loader2 className="w-3 h-3 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
