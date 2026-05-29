import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, Mail, Phone, Calendar, RefreshCw, ShieldAlert, Inbox, Users, BarChart3, Settings, Scissors, UserCog, FileText, Building2, Sparkles, CreditCard, QrCode, Search as SearchIcon, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { HistoryTabs } from "@/components/admin/HistoryTabs";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { SiteSettingsEditor } from "@/components/admin/SiteSettingsEditor";
import { ServicesEditor } from "@/components/admin/ServicesEditor";
import { StaffEditor } from "@/components/admin/StaffEditor";
import { PageContentEditor } from "@/components/admin/PageContentEditor";
import { LoyaltyAdmin } from "@/components/admin/LoyaltyAdmin";
import { MembershipsAdmin } from "@/components/admin/MembershipsAdmin";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { MembershipCardPage } from "@/routes/membership-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Section = "inbox" | "history" | "analytics" | "loyalty" | "memberships" | "redeem" | "settings";
type SettingsTab = "business" | "services" | "staff" | "content";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Inbox — Crème de la Crème Nails ®" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Submission = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  service: string;
  notes: string | null;
  status: string;
  created_at: string;
};

type AuthState = "loading" | "unauthenticated" | "not-admin" | "admin";

const STATUSES = ["new", "contacted", "booked", "archived"] as const;

function AdminPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [section, setSection] = useState<Section>("inbox");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("business");
  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthState("unauthenticated");
      navigate({ to: "/auth" });
      return;
    }
    setUserEmail(session.user.email ?? "");
    setUserId(session.user.id);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roles) {
      setAuthState("admin");
    } else {
      setAuthState("not-admin");
    }
  }, [navigate]);

  const loadSubmissions = useCallback(async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setSubmissions(data ?? []);
    setLoadingData(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (authState === "admin") loadSubmissions();
  }, [authState, loadSubmissions]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const updateStatus = async (id: string, status: string) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  if (authState === "not-admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-gold mx-auto mb-6" />
          <h1 className="font-serif text-3xl mb-3">Access pending</h1>
          <p className="text-muted-foreground text-sm mb-2">
            You're signed in as <span className="text-gold">{userEmail}</span>, but this account hasn't been granted admin access yet.
          </p>
          <p className="text-xs text-muted-foreground mb-8 break-all">
            User ID: <code className="text-gold/80">{userId}</code>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Ask Lovable to run this once to make you an admin (replace with your User ID above):
          </p>
          <pre className="bg-cream border border-gold/20 p-4 text-xs text-left overflow-x-auto mb-6">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${userId}', 'admin');`}
          </pre>
          <button
            onClick={handleLogout}
            className="text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-gold inline-flex items-center gap-2"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = submissions.filter((x) => x.status === s).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logo} alt="Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-base sm:text-lg leading-tight truncate">Admin Dashboard</p>
              <p className="tracking-luxe text-[0.55rem] sm:text-[0.6rem] text-gold truncate">CRÈME DE LA CRÈME</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">{userEmail}</span>
            {section === "inbox" && (
              <button
                onClick={loadSubmissions}
                aria-label="Refresh"
                className="inline-flex items-center gap-1.5 text-[0.65rem] sm:text-xs tracking-[0.16em] sm:tracking-[0.18em] uppercase text-muted-foreground hover:text-gold"
              >
                <RefreshCw className={`w-3 h-3 ${loadingData ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 text-[0.65rem] sm:text-xs tracking-[0.16em] sm:tracking-[0.18em] uppercase text-muted-foreground hover:text-gold"
            >
              <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Section nav — horizontally scrollable on mobile */}
        <div className="max-w-6xl mx-auto pb-2 -mt-1 overflow-x-auto">
          <div className="flex gap-1 px-4 sm:px-6 w-max sm:w-auto sm:flex-wrap">
            <SectionTab icon={<Inbox className="w-3 h-3" />} label="Inbox" active={section === "inbox"} onClick={() => setSection("inbox")} badge={section !== "inbox" ? submissions.filter((s) => s.status === "new").length : 0} />
            <SectionTab icon={<Users className="w-3 h-3" />} label="History" active={section === "history"} onClick={() => setSection("history")} />
            <SectionTab icon={<BarChart3 className="w-3 h-3" />} label="Analytics" active={section === "analytics"} onClick={() => setSection("analytics")} />
            <SectionTab icon={<Sparkles className="w-3 h-3" />} label="Loyalty" active={section === "loyalty"} onClick={() => setSection("loyalty")} />
            <SectionTab icon={<CreditCard className="w-3 h-3" />} label="Memberships" active={section === "memberships"} onClick={() => setSection("memberships")} />
            <SectionTab icon={<QrCode className="w-3 h-3" />} label="Redeem" active={section === "redeem"} onClick={() => setSection("redeem")} />
            <SectionTab icon={<Settings className="w-3 h-3" />} label="Site Settings" active={section === "settings"} onClick={() => setSection("settings")} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {section === "inbox" && (
          <>
            <div className="flex flex-wrap gap-2 mb-8">
              <FilterChip label={`All · ${submissions.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
              {STATUSES.map((s) => (
                <FilterChip key={s} label={`${s} · ${counts[s] ?? 0}`} active={filter === s} onClick={() => setFilter(s)} />
              ))}
            </div>

            {loadingData ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-serif text-2xl text-gold mb-2">No submissions yet</p>
                <p className="text-sm text-muted-foreground">When someone fills out the contact form, they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((s) => (
                  <SubmissionCard key={s.id} submission={s} onStatusChange={updateStatus} />
                ))}
              </div>
            )}
          </>
        )}

        {section === "history" && <HistoryTabs />}
        {section === "analytics" && <AnalyticsPanel />}
        {section === "loyalty" && <LoyaltyAdmin />}
        {section === "memberships" && <MembershipsAdmin />}
        {section === "redeem" && <RedeemSection />}
        {section === "settings" && (
          <div>
            <div className="mb-6 border-b border-gold/20 overflow-x-auto">
              <div className="flex gap-1 w-max sm:w-auto sm:flex-wrap">
                <SubTab icon={<Building2 className="w-3 h-3" />} label="Business info" active={settingsTab === "business"} onClick={() => setSettingsTab("business")} />
                <SubTab icon={<Scissors className="w-3 h-3" />} label="Services & prices" active={settingsTab === "services"} onClick={() => setSettingsTab("services")} />
                <SubTab icon={<UserCog className="w-3 h-3" />} label="Staff" active={settingsTab === "staff"} onClick={() => setSettingsTab("staff")} />
                <SubTab icon={<FileText className="w-3 h-3" />} label="Page content" active={settingsTab === "content"} onClick={() => setSettingsTab("content")} />
              </div>
            </div>
            {settingsTab === "business" && (
              <div className="space-y-6">
                <SiteSettingsEditor />
                <div className="border-t border-gold/20 pt-6">
                  <h3 className="text-sm font-medium mb-3">Square Integration</h3>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch("/api/public/sync-services-to-square", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${session?.access_token}` }
                        });
                        const data = await res.json();
                        if (data.createdCount !== undefined) {
                          toast.success(`Synced: ${data.createdCount} created, ${data.skippedCount} skipped, ${data.failedCount} failed`);
                        } else {
                          toast.error(`Sync failed: ${JSON.stringify(data)}`);
                        }
                      } catch (e: any) {
                        toast.error(`Error: ${e?.message}`);
                      }
                    }}
                  >
                    Sync Services to Square
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-2"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch("/api/public/pull-square-variation-ids", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${session?.access_token}` }
                        });
                        const data = await res.json();
                        if (typeof data.matched === "number") {
                          toast.success(`Matched ${data.matched} services. Unmatched: ${data.unmatched.length}${data.unmatched.length ? ` (${data.unmatched.join(", ")})` : ""}`);
                        } else {
                          toast.error(`Pull failed: ${JSON.stringify(data)}`);
                        }
                      } catch (e: any) {
                        toast.error(`Error: ${e?.message}`);
                      }
                    }}
                  >
                    Pull Square IDs
                  </Button>
                </div>
              </div>
            )}
            {settingsTab === "services" && <ServicesEditor />}
            {settingsTab === "staff" && <StaffEditor />}
            {settingsTab === "content" && <PageContentEditor />}
          </div>
        )}
      </main>
    </div>
  );
}

function SubTab({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.18em] uppercase border-b-2 transition ${
        active ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SectionTab({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.2em] uppercase border-b-2 transition ${
        active ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
      }`}
    >
      {icon} {label}
      {badge && badge > 0 ? (
        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[0.6rem] tracking-normal">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs tracking-[0.2em] uppercase border transition ${
        active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gold hover:text-gold"
      }`}
    >
      {label}
    </button>
  );
}

function SubmissionCard({ submission, onStatusChange }: { submission: Submission; onStatusChange: (id: string, status: string) => void }) {
  const date = new Date(submission.created_at);
  const formatted = date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="bg-cream border border-gold/20 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-serif text-xl">{submission.first_name} {submission.last_name}</h3>
          <p className="text-xs text-muted-foreground tracking-[0.18em] uppercase mt-1 inline-flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {formatted}
          </p>
        </div>
        <select
          value={submission.status}
          onChange={(e) => onStatusChange(submission.id, e.target.value)}
          className="px-3 py-2 bg-background border border-border focus:border-gold outline-none text-xs tracking-[0.18em] uppercase"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <a href={`mailto:${submission.email}`} className="text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-gold break-all">
          <Mail className="w-3 h-3 shrink-0" /> {submission.email}
        </a>
        <a href={`tel:${submission.phone}`} className="text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-gold">
          <Phone className="w-3 h-3 shrink-0" /> {submission.phone}
        </a>
      </div>

      <div className="border-t border-gold/20 pt-4">
        <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Service</p>
        <p className="text-sm mb-4">{submission.service}</p>
        {submission.notes && (
          <>
            <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{submission.notes}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Redeem section: scan QR or look up by phone/name ─────────────────────

type SearchResult = {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  tier_name: string;
  status: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractMembershipId(text: string): string | null {
  const trimmed = text.trim();
  if (UUID_RE.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const id = u.searchParams.get("id");
    if (id && UUID_RE.test(id)) return id;
  } catch { /* not a URL */ }
  return null;
}

function RedeemSection() {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const lastHandledRef = useRef<string | null>(null);

  const switchMode = (m: "scan" | "manual") => {
    setMode(m);
    setSelectedId(null);
    setResults(null);
    setQuery("");
    lastHandledRef.current = null;
  };

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast.error("Enter at least 2 characters");
      return;
    }
    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/public/admin-member-search?q=${encodeURIComponent(q)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Search failed");
      setResults(json.results ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const goToRedeem = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleScan = (codes: IDetectedBarcode[]) => {
    for (const c of codes) {
      const id = extractMembershipId(c.rawValue);
      if (id && lastHandledRef.current !== id) {
        lastHandledRef.current = id;
        setSelectedId(id);
        return;
      }
    }
  };

  if (selectedId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedId(null); lastHandledRef.current = null; }}
          className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-gold"
        >
          <X className="w-3 h-3" /> Back to {mode === "scan" ? "scanner" : "search"}
        </button>
        <MembershipCardPage id={selectedId} staffView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => switchMode("scan")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.2em] uppercase border transition ${
            mode === "scan" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gold hover:text-gold"
          }`}
        >
          <QrCode className="w-3 h-3" /> Scan Member
        </button>
        <button
          onClick={() => switchMode("manual")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.2em] uppercase border transition ${
            mode === "manual" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gold hover:text-gold"
          }`}
        >
          <SearchIcon className="w-3 h-3" /> Manual Lookup
        </button>
      </div>

      {mode === "scan" && (
        <div className="max-w-sm">
          <div className="aspect-square bg-black rounded-2xl overflow-hidden border border-border">
            <Scanner
              onScan={handleScan}
              onError={(err) => {
                const message = err instanceof Error ? err.message : String(err);
                toast.error(`Camera error: ${message}`);
              }}
              constraints={{ facingMode: "environment" }}
              styles={{ container: { width: "100%", height: "100%" } }}
              components={{ finder: true }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Point at the customer's card QR code
          </p>
        </div>
      )}

      {mode === "manual" && (
        <div className="max-w-xl space-y-4">
          <form
            onSubmit={(e) => { e.preventDefault(); runSearch(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Phone number or name"
              className="flex-1 px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-primary text-primary-foreground border border-primary disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <SearchIcon className="w-3 h-3" />} Search
            </button>
          </form>

          {results !== null && (
            <div className="space-y-2">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching memberships.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="w-full text-left bg-cream border border-gold/20 hover:border-gold p-4 transition"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-serif text-lg">{r.customer_first_name} {r.customer_last_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs tracking-[0.18em] uppercase text-gold">{r.tier_name}</p>
                        <p className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mt-0.5">{r.status}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

