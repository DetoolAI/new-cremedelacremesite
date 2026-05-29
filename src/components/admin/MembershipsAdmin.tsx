import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { listMembershipsUsage, type UsageItem } from "@/lib/membership-staff";
import { TIER_BENEFITS } from "@/lib/membership-tiers";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/admin-fetch";
import { Loader2, ExternalLink, RefreshCw, DownloadCloud, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function MembershipsAdmin() {
  const [data, setData] = useState<{ ok: true; items: UsageItem[] } | { ok: false; error: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "low" | "unused">("all");
  const [showAdd, setShowAdd] = useState(false);
  
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    customer_first_name: "",
    customer_last_name: "",
    customer_email: "",
    customer_phone: "",
    tier_name: "",
    monthly_price: "",
    notes: "Manually added by admin",
  });

  const resetForm = () => setForm({
    customer_first_name: "", customer_last_name: "", customer_email: "",
    customer_phone: "", tier_name: "", monthly_price: "", notes: "Manually added by admin",
  });

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_first_name || !form.customer_last_name || !form.customer_email || !form.customer_phone || !form.tier_name || !form.monthly_price) {
      toast.error("Please fill in all required fields");
      return;
    }
    const cents = Math.round(parseFloat(form.monthly_price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Monthly price must be a positive number");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("memberships").insert({
        customer_first_name: form.customer_first_name.trim(),
        customer_last_name: form.customer_last_name.trim(),
        customer_email: form.customer_email.trim().toLowerCase(),
        customer_phone: form.customer_phone.trim(),
        tier_name: form.tier_name,
        monthly_price_cents: cents,
        status: "active",
        notes: form.notes || "Manually added by admin",
      });
      if (error) {
        toast.error(`Could not add member: ${error.message}`);
        return;
      }
      toast.success(`${form.customer_first_name} added. They can sign in at /members → "First time? Create a password".`);
      resetForm();
      setShowAdd(false);
      await load();
    } finally {
      setAdding(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await listMembershipsUsage()); } finally { setLoading(false); }
  }, []);



  const syncSquare = useCallback(async () => {
    if (!confirm("Import all subscriptions from Square that aren't already in the system?")) return;
    setSyncing(true);
    try {
      const res = await adminFetch("/api/public/sync-square-memberships", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(`Sync failed: ${j.error ?? res.statusText}`);
        return;
      }
      toast.success(
        `Square has ${j.scanned} subscription(s) · ${j.inserted} new imported · ${j.status_updates ?? 0} status updated` +
        (j.skipped_unknown_plan ? ` · ${j.skipped_unknown_plan} unknown plan` : "") +
        (j.skipped_no_customer ? ` · ${j.skipped_no_customer} missing customer` : ""),
        { duration: 8000 }
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data.ok) return <p className="text-sm text-destructive">Could not load: {data.error}</p>;

  const items = data.items.filter((m: UsageItem) => {
    if (filter === "active") return m.status === "active";
    if (filter === "low") return m.totalRemaining <= 1 && m.totalAllowed > 0;
    if (filter === "unused") return m.totalUsed === 0 && m.status === "active";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 text-xs">
          {(["all", "active", "low", "unused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f === "low" ? "Running low" : f === "unused" ? "Haven't visited" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground"
          >
            <UserPlus className="w-3 h-3" /> {showAdd ? "Cancel" : "Add member manually"}
          </button>
          <button
            onClick={syncSquare}
            disabled={syncing}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <DownloadCloud className="w-3 h-3" />}
            Import from Square
          </button>
          <button onClick={load} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border border-border">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={submitManual} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Add member manually</p>
          <p className="text-xs text-muted-foreground">
            Use this when a member pays outside Square. They'll be able to sign in at <code>/members</code> using "First time? Create a password" with this email.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input required placeholder="First name *" value={form.customer_first_name} onChange={(e) => setForm({ ...form, customer_first_name: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <input required placeholder="Last name *" value={form.customer_last_name} onChange={(e) => setForm({ ...form, customer_last_name: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <input required type="email" placeholder="Email *" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <input required placeholder="Phone *" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <select required value={form.tier_name} onChange={(e) => setForm({ ...form, tier_name: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background">
              <option value="">Select tier *</option>
              {Object.keys(TIER_BENEFITS).sort().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input required type="number" step="0.01" min="0" placeholder="Monthly price (e.g. 120.00) *" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background sm:col-span-2" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />} Add member
            </button>
            <button type="button" onClick={() => { resetForm(); setShowAdd(false); }} className="text-xs px-3 py-1.5 rounded-md border border-border">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No memberships in this view.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {items.map((m: UsageItem) => (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.tier} · {m.monthlyPrice}/mo</p>
              </div>
              <div className="text-xs text-muted-foreground min-w-[140px]">
                <p><span className="font-medium text-foreground">{m.totalUsed}/{m.totalAllowed}</span> used this period</p>
                <p>Resets {new Date(m.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</p>
              </div>
              <div className="text-xs text-muted-foreground min-w-[120px]">
                {m.lastRedeemed ? <p>Last: {new Date(m.lastRedeemed).toLocaleDateString()}</p> : <p className="italic">No visits yet</p>}
              </div>
              <span
                title={m.status === "active"
                  ? "Subscription is active in Square — member can redeem benefits."
                  : m.status === "pending"
                    ? "Member enrolled on the site but Square hasn't confirmed the first payment yet. Click 'Import from Square' to refresh, or have the member complete checkout."
                    : `Status: ${m.status}`}
                className={`text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded cursor-help ${
                  m.status === "active" ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {m.status}
              </span>
              <Link to="/membership-card" search={{ id: m.id }} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                Open <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
