import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/admin-fetch";
import { Loader2, Search, Plus, Minus, Gift, RefreshCw, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

type Account = {
  id: string;
  email: string;
  customer_name: string | null;
  phone: string | null;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_amount_cents: number | null;
  active: boolean;
  display_order: number;
};

const PAGE_SIZE = 50;

export function LoyaltyAdmin() {
  const [tab, setTab] = useState<"new" | "imported" | "rewards">("new");
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncSquareCustomers = async () => {
    if (!confirm("Pull all customers from Square and add any new ones to the loyalty list? (Existing accounts won't be modified.)")) return;
    setSyncing(true);
    try {
      const res = await adminFetch("/api/public/sync-square-customers", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Sync failed");
      toast.success(`Sync complete: ${json.inserted} new, ${json.already_existed} already in list`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 border-b border-gold/20 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <SubTab active={tab === "new"} onClick={() => setTab("new")} label="New members" />
          <SubTab active={tab === "imported"} onClick={() => setTab("imported")} label="Existing (imported)" />
          <SubTab active={tab === "rewards"} onClick={() => setTab("rewards")} label="Reward catalog" />
        </div>
        {tab !== "rewards" && (
          <button
            onClick={syncSquareCustomers}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 mb-1 text-xs tracking-[0.18em] uppercase border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-40"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sync Square customers
          </button>
        )}
      </div>
      {tab === "rewards" ? (
        <RewardsEditor />
      ) : (
        <AccountsTable source={tab} refreshKey={refreshKey} />
      )}
    </div>
  );
}

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs tracking-[0.18em] uppercase border-b-2 ${
        active ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold"
      }`}
    >
      {label}
    </button>
  );
}

/* ---------- Accounts ---------- */
function AccountsTable({ source, refreshKey = 0 }: { source: "new" | "imported"; refreshKey?: number }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adjusting, setAdjusting] = useState<Account | null>(null);
  // Set of account_ids that have at least one transaction tied to a real booking
  const [newMemberIds, setNewMemberIds] = useState<Set<string> | null>(null);

  // Fetch the set of "new member" account IDs once. A new member is anyone
  // who has at least one loyalty_transaction with a non-null booking_id
  // (i.e. earned via the live booking flow, not the historical import).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("loyalty_transactions")
        .select("account_id")
        .not("booking_id", "is", null);
      if (cancelled) return;
      const ids = new Set<string>();
      for (const r of (data as Array<{ account_id: string }> | null) ?? []) ids.add(r.account_id);
      setNewMemberIds(ids);
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (newMemberIds === null) return;
    setLoading(true);
    const ids = Array.from(newMemberIds);

    let query = supabase
      .from("loyalty_accounts")
      .select("*", { count: "exact" })
      .order("points_balance", { ascending: false });

    if (source === "new") {
      if (ids.length === 0) {
        setRows([]); setTotal(0); setLoading(false); return;
      }
      query = query.in("id", ids);
    } else {
      // imported: exclude any account that has a real booking transaction
      if (ids.length > 0) {
        query = query.not("id", "in", `(${ids.join(",")})`);
      }
    }

    if (q.trim()) {
      const term = `%${q.trim()}%`;
      query = query.or(`email.ilike.${term},customer_name.ilike.${term},phone.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Account[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [q, page, source, newMemberIds]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(0); }, [q, source]);

  const addVisit = async (a: Account) => {
    // Optimistic
    setRows((rs) => rs.map((r) => r.id === a.id ? { ...r, points_balance: r.points_balance + 1, lifetime_earned: r.lifetime_earned + 1 } : r));
    const { error: uErr } = await supabase.from("loyalty_accounts").update({
      points_balance: a.points_balance + 1,
      lifetime_earned: a.lifetime_earned + 1,
    }).eq("id", a.id);
    if (uErr) {
      toast.error("Could not add visit");
      load();
      return;
    }
    await supabase.from("loyalty_transactions").insert({
      account_id: a.id,
      points: 1,
      type: "earned",
      reason: "In-salon visit (manual)",
    });
    toast.success(`+1 point for ${a.customer_name || a.email}`);
  };

  const [addingWalkIn, setAddingWalkIn] = useState(false);

  const last = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);




  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-10 pr-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
          />
        </div>
        <button
          onClick={() => setAddingWalkIn(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs tracking-[0.18em] uppercase border border-gold text-gold hover:bg-gold/10"
        >
          <UserPlus className="w-3 h-3" /> Add walk-in visit
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Email</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-right p-3 hidden md:table-cell">Earned</th>
                <th className="text-right p-3 hidden md:table-cell">Redeemed</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-10 text-muted-foreground">No accounts found</td></tr>
              ) : rows.map((a) => (
                <tr key={a.id} className="border-b border-gold/10 hover:bg-background/50">
                  <td className="p-3 font-medium">{a.customer_name || "—"}</td>
                  <td className="p-3 break-all text-muted-foreground text-xs">{a.email}</td>
                  <td className="p-3 text-right font-medium text-gold">{a.points_balance}</td>
                  <td className="p-3 text-right hidden md:table-cell text-xs text-muted-foreground">{a.lifetime_earned}</td>
                  <td className="p-3 text-right hidden md:table-cell text-xs text-muted-foreground">{a.lifetime_redeemed}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => addVisit(a)}
                      className="inline-flex items-center gap-1 text-xs tracking-[0.18em] uppercase text-gold hover:underline mr-3"
                      title="Add 1 point for an in-salon visit"
                    >
                      <Check className="w-3 h-3" /> +Visit
                    </button>
                    <button
                      onClick={() => setAdjusting(a)}
                      className="text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-gold hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 text-xs tracking-[0.18em] uppercase text-muted-foreground">
        <span>{total.toLocaleString()} accounts · Page {page + 1} of {last + 1}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-border hover:border-gold hover:text-gold disabled:opacity-30">Prev</button>
          <button disabled={page >= last} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-border hover:border-gold hover:text-gold disabled:opacity-30">Next</button>
        </div>
      </div>

      {adjusting && (
        <AdjustModal account={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); load(); }} />
      )}
      {addingWalkIn && (
        <WalkInModal onClose={() => setAddingWalkIn(false)} onSaved={() => { setAddingWalkIn(false); load(); }} />
      )}
    </div>
  );
}

function WalkInModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Email is required");
      return;
    }
    setSaving(true);

    // Find or create
    const { data: existing } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    let account = existing as Account | null;
    if (!account) {
      const { data: created, error } = await supabase
        .from("loyalty_accounts")
        .insert({
          email: cleanEmail,
          customer_name: name.trim() || null,
          phone: phone.trim() || null,
          points_balance: 1,
          lifetime_earned: 1,
        })
        .select()
        .single();
      if (error) {
        toast.error("Could not create account: " + error.message);
        setSaving(false);
        return;
      }
      account = created as Account;
    } else {
      const { error } = await supabase
        .from("loyalty_accounts")
        .update({
          points_balance: account.points_balance + 1,
          lifetime_earned: account.lifetime_earned + 1,
          customer_name: account.customer_name || name.trim() || null,
          phone: account.phone || phone.trim() || null,
        })
        .eq("id", account.id);
      if (error) {
        toast.error("Could not update account");
        setSaving(false);
        return;
      }
    }

    await supabase.from("loyalty_transactions").insert({
      account_id: account.id,
      points: 1,
      type: "earned",
      reason: "In-salon walk-in visit",
    });

    toast.success(existing ? "+1 point added" : "New customer added with 1 point");
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-gold/30 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-2xl mb-1">Add walk-in visit</h3>
        <p className="text-sm text-muted-foreground mb-6">Awards 1 loyalty point. Creates a new account if the email isn't already in the system.</p>

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm mb-4"
        />

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm mb-4"
        />

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Phone (optional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm mb-6"
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 text-xs tracking-[0.18em] uppercase bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add visit (+1 pt)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"earned" | "redeemed" | "adjusted">("adjusted");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (points === 0) return;
    setSaving(true);
    const delta = type === "redeemed" ? -Math.abs(points) : Math.abs(points);
    const newBalance = account.points_balance + delta;
    const newEarned = account.lifetime_earned + (delta > 0 && type === "earned" ? delta : 0);
    const newRedeemed = account.lifetime_redeemed + (type === "redeemed" ? Math.abs(points) : 0);

    await supabase.from("loyalty_accounts").update({
      points_balance: newBalance,
      lifetime_earned: newEarned,
      lifetime_redeemed: newRedeemed,
    }).eq("id", account.id);

    await supabase.from("loyalty_transactions").insert({
      account_id: account.id,
      points: Math.abs(points),
      type,
      reason: reason.trim() || `Manual ${type}`,
    });

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-gold/30 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-2xl mb-1">Adjust points</h3>
        <p className="text-sm text-muted-foreground mb-1">{account.customer_name || account.email}</p>
        <p className="text-xs text-gold tracking-[0.18em] uppercase mb-6">Current: {account.points_balance} pts</p>

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Type</label>
        <div className="flex gap-2 mb-4">
          {(["earned", "redeemed", "adjusted"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 px-3 py-2 text-xs tracking-[0.18em] uppercase border ${
                type === t ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Points</label>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setPoints(Math.max(0, points - 1))} className="w-10 h-10 border border-border flex items-center justify-center"><Minus className="w-4 h-4" /></button>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
            className="flex-1 text-center px-3 py-2 bg-background border border-border focus:border-gold outline-none text-lg"
          />
          <button onClick={() => setPoints(points + 1)} className="w-10 h-10 border border-border flex items-center justify-center"><Plus className="w-4 h-4" /></button>
        </div>

        <label className="block text-xs tracking-[0.18em] uppercase text-muted-foreground mb-2">Reason (optional)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Birthday bonus, Redeemed $10 off"
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm mb-6"
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={save}
            disabled={saving || points === 0}
            className="px-6 py-2 text-xs tracking-[0.18em] uppercase bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Rewards catalog ---------- */
function RewardsEditor() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("loyalty_rewards").select("*").order("display_order");
    setRewards((data as Reward[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addReward = async () => {
    const { data } = await supabase.from("loyalty_rewards").insert({
      name: "New Reward",
      description: "",
      points_required: 10,
      discount_amount_cents: 1000,
      display_order: rewards.length,
    }).select().single();
    if (data) setRewards([...rewards, data as Reward]);
  };

  const updateReward = async (id: string, patch: Partial<Reward>) => {
    setRewards(rewards.map((r) => r.id === id ? { ...r, ...patch } : r));
    await supabase.from("loyalty_rewards").update(patch).eq("id", id);
  };

  const deleteReward = async (id: string) => {
    if (!confirm("Delete this reward?")) return;
    await supabase.from("loyalty_rewards").delete().eq("id", id);
    setRewards(rewards.filter((r) => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-muted-foreground tracking-wider">Customers see these rewards on the public Rewards page.</p>
        <button onClick={addReward} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase">
          <Plus className="w-3 h-3" /> Add reward
        </button>
      </div>

      <div className="space-y-3">
        {rewards.map((r) => (
          <div key={r.id} className="bg-cream border border-gold/20 p-4 grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 items-center">
            <Gift className="w-5 h-5 text-gold hidden md:block" />
            <div>
              <label className="block text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground mb-1">Name</label>
              <input
                value={r.name}
                onChange={(e) => updateReward(r.id, { name: e.target.value })}
                className="w-full px-2 py-1 bg-background border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground mb-1">Description</label>
              <input
                value={r.description ?? ""}
                onChange={(e) => updateReward(r.id, { description: e.target.value })}
                className="w-full px-2 py-1 bg-background border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground mb-1">Points</label>
              <input
                type="number"
                value={r.points_required}
                onChange={(e) => updateReward(r.id, { points_required: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 bg-background border border-border text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => updateReward(r.id, { active: e.target.checked })}
              />
              Active
            </label>
            <button onClick={() => deleteReward(r.id)} className="text-xs text-red-600 hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
