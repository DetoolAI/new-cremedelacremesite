import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Mail, Phone, Trash2, X } from "lucide-react";
import { CustomerDetail } from "./CustomerDetail";
import { getAdminBookingDetail, type AdminBookingDetail } from "@/lib/membership-staff";

/** Loads the set of active-member emails so we can flag matching rows. */
function useMemberEmails() {
  const [emails, setEmails] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("memberships")
        .select("customer_email,status")
        .eq("status", "active");
      if (cancelled) return;
      setEmails(new Set((data ?? []).map((r) => (r.customer_email ?? "").toLowerCase()).filter(Boolean)));
    })();
    return () => { cancelled = true; };
  }, []);
  return emails;
}

function MemberBadge() {
  return (
    <span className="ml-2 inline-block text-[0.55rem] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 align-middle">
      Member
    </span>
  );
}

type Tab = "customers" | "appointments" | "payments" | "newsletter" | "memberships";
const PAGE_SIZE = 50;

type Customer = {
  id: string; name: string | null; email: string | null; phone: string | null;
  address: string | null; whatsapp: string | null; cellphone: string | null;
  city: string | null; state: string | null; zipcode: string | null;
};
type Appointment = {
  id: string; appointment_date: string | null; appointment_time: string | null;
  service: string | null; cost: number | null; team_member: string | null;
  customer_name: string | null; phone: string | null; email: string | null;
  status: string | null; booking_id: string | null; comments: string | null;
};
type Payment = {
  id: string; payment_at: string | null; customer: string | null;
  team_member: string | null; service: string | null; amount: number | null;
  type: string | null; mode: string | null; status: string | null;
  booking_id: string | null; transaction_id: string | null; gateway: string | null;
};

type Lead = {
  id: string; name: string; email: string; phone: string | null;
  signup_type: string; status: string; notes: string | null; created_at: string;
};

type Membership = {
  id: string; created_at: string; enrolled_at: string;
  customer_first_name: string; customer_last_name: string;
  customer_email: string; customer_phone: string;
  tier_name: string; monthly_price_cents: number; status: string;
  square_subscription_id: string | null;
};

export function HistoryTabs() {
  const [tab, setTab] = useState<Tab>("customers");
  const [counts, setCounts] = useState<Record<Tab, number>>({ customers: 0, appointments: 0, payments: 0, newsletter: 0, memberships: 0 });

  useEffect(() => {
    (async () => {
      const [c, a, p, n, m] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("appointments_history").select("*", { count: "exact", head: true }),
        supabase.from("payments_history").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("signup_type", "newsletter"),
        supabase.from("memberships").select("*", { count: "exact", head: true }),
      ]);
      setCounts({
        customers: c.count ?? 0,
        appointments: a.count ?? 0,
        payments: p.count ?? 0,
        newsletter: n.count ?? 0,
        memberships: m.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="mt-12">
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/20 pb-2">
        <TabBtn active={tab === "customers"} onClick={() => setTab("customers")} label={`Customers · ${counts.customers.toLocaleString()}`} />
        <TabBtn active={tab === "appointments"} onClick={() => setTab("appointments")} label={`Appointments · ${counts.appointments.toLocaleString()}`} />
        <TabBtn active={tab === "payments"} onClick={() => setTab("payments")} label={`Payments · ${counts.payments.toLocaleString()}`} />
        <TabBtn active={tab === "newsletter"} onClick={() => setTab("newsletter")} label={`Newsletter · ${counts.newsletter.toLocaleString()}`} />
        <TabBtn active={tab === "memberships"} onClick={() => setTab("memberships")} label={`Memberships · ${counts.memberships.toLocaleString()}`} />
      </div>

      {tab === "customers" && <CustomersTable />}
      {tab === "appointments" && <AppointmentsTable />}
      {tab === "payments" && <PaymentsTable />}
      {tab === "newsletter" && <NewsletterTable />}
      {tab === "memberships" && <MembershipsTable />}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
      />
    </div>
  );
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const last = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  return (
    <div className="flex items-center justify-between mt-4 text-xs tracking-[0.18em] uppercase text-muted-foreground">
      <span>{total.toLocaleString()} results · Page {page + 1} of {last + 1}</span>
      <div className="flex gap-2">
        <button disabled={page === 0} onClick={() => onPage(page - 1)} className="px-3 py-1 border border-border hover:border-gold hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
        <button disabled={page >= last} onClick={() => onPage(page + 1)} className="px-3 py-1 border border-border hover:border-gold hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
      </div>
    </div>
  );
}

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/* ---------------- CUSTOMERS ---------------- */
function CustomersTable() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const memberEmails = useMemberEmails();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("customers").select("*", { count: "exact" }).order("name", { ascending: true });
    if (dq.trim()) {
      const term = `%${dq.trim()}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Customer[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [dq, page]);

  useEffect(() => { setPage(0); }, [dq]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by name, email, or phone…" />
      <p className="text-xs text-muted-foreground mb-3 tracking-wider">Click any row to open Customer 360 — appointment & payment history.</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3 hidden md:table-cell">Address</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-10 text-muted-foreground">No customers found</td></tr>
              ) : rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="border-b border-gold/10 hover:bg-background/50 cursor-pointer"
                >
                  <td className="p-3 font-medium">{c.name || "—"}{c.email && memberEmails.has(c.email.toLowerCase()) && <MemberBadge />}</td>
                  <td className="p-3 break-all">
                    {c.email ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{c.email}</span> : "—"}
                  </td>
                  <td className="p-3">
                    {c.phone ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{c.phone}</span> : "—"}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{c.address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} onPage={setPage} />
      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------------- APPOINTMENTS ---------------- */
function AppointmentsTable() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const memberEmails = useMemberEmails();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("appointments_history").select("*", { count: "exact" }).order("appointment_date", { ascending: false, nullsFirst: false });
    if (dq.trim()) {
      const term = `%${dq.trim()}%`;
      query = query.or(`customer_name.ilike.${term},email.ilike.${term},phone.ilike.${term},service.ilike.${term},booking_id.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Appointment[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [dq, page]);

  useEffect(() => { setPage(0); }, [dq]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by customer, email, phone, service, or booking ID…" />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Service</th>
                <th className="text-left p-3 hidden md:table-cell">Tech</th>
                <th className="text-left p-3 hidden md:table-cell">Cost</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-10 text-muted-foreground">No appointments found</td></tr>
              ) : rows.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setOpenId(a.booking_id ?? a.id)}
                  className="border-b border-gold/10 hover:bg-background/50 cursor-pointer"
                >
                  <td className="p-3 whitespace-nowrap text-xs">{a.appointment_date || "—"}</td>
                  <td className="p-3 text-xs whitespace-nowrap">{a.appointment_time || "—"}</td>
                  <td className="p-3">
                    <div className="font-medium">{a.customer_name || "—"}{a.email && memberEmails.has(a.email.toLowerCase()) && <MemberBadge />}</div>
                    {a.email && <div className="text-xs text-muted-foreground break-all">{a.email}</div>}
                  </td>
                  <td className="p-3 text-xs">{a.service || "—"}</td>
                  <td className="p-3 hidden md:table-cell text-xs">{a.team_member || "—"}</td>
                  <td className="p-3 hidden md:table-cell text-xs">{a.cost != null ? `$${a.cost}` : "—"}</td>
                  <td className="p-3">
                    <span className={`text-[0.65rem] px-2 py-1 tracking-[0.18em] uppercase ${
                      a.status === "Cancelled" ? "bg-red-100 text-red-700" :
                      a.status === "Confirmed" ? "bg-green-100 text-green-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{a.status || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} onPage={setPage} />
      {openId && <BookingDetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function BookingDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<AdminBookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getAdminBookingDetail(id).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.booking);
      else setError(res.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Order entries with the most useful fields first.
  const PREFERRED = [
    "id","square_booking_id","status","appointment_date","appointment_time","duration_minutes",
    "service_name","staff_name","customer_first_name","customer_last_name","customer_email",
    "customer_phone","is_member","deposit_paid","deposit_amount_cents","total_amount_cents",
    "notes","created_at","updated_at",
  ];
  const entries = data
    ? [
        ...PREFERRED.filter((k) => k in data).map((k) => [k, (data as Record<string, unknown>)[k]] as const),
        ...Object.entries(data).filter(([k]) => !PREFERRED.includes(k)),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-background border-l border-border shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-cream border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="font-serif text-base">Booking detail</p>
          <button onClick={onClose} aria-label="Close" className="p-1 -m-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : data ? (
            <div className="text-xs space-y-2">
              {entries.map(([k, v]) => (
                <div key={k} className="border-b border-border pb-1.5">
                  <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="break-all whitespace-pre-wrap font-mono text-[0.7rem] mt-0.5">
                    {v === null || v === undefined
                      ? "—"
                      : typeof v === "object"
                        ? JSON.stringify(v, null, 2)
                        : String(v)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- PAYMENTS ---------------- */
function PaymentsTable() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("payments_history").select("*", { count: "exact" }).order("payment_at", { ascending: false, nullsFirst: false });
    if (dq.trim()) {
      const term = `%${dq.trim()}%`;
      query = query.or(`customer.ilike.${term},service.ilike.${term},booking_id.ilike.${term},transaction_id.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Payment[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [dq, page]);

  useEffect(() => { setPage(0); }, [dq]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by customer, service, booking ID, or transaction…" />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Service</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3 hidden md:table-cell">Mode</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3 hidden lg:table-cell">Gateway</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-10 text-muted-foreground">No payments found</td></tr>
              ) : rows.map((p) => (
                <tr key={p.id} className="border-b border-gold/10 hover:bg-background/50">
                  <td className="p-3 whitespace-nowrap text-xs">{p.payment_at ? new Date(p.payment_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 font-medium">{p.customer || "—"}</td>
                  <td className="p-3 text-xs">{p.service || "—"}</td>
                  <td className="p-3 font-medium">{p.amount != null ? `$${Number(p.amount).toFixed(2)}` : "—"}</td>
                  <td className="p-3 hidden md:table-cell text-xs">{p.mode || "—"}</td>
                  <td className="p-3">
                    <span className={`text-[0.65rem] px-2 py-1 tracking-[0.18em] uppercase ${
                      p.status === "Completed" ? "bg-green-100 text-green-700" :
                      p.status === "Refunded" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{p.status || "—"}</span>
                  </td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{p.gateway || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} onPage={setPage} />
    </div>
  );
}

/* ---------------- NEWSLETTER ---------------- */
function NewsletterTable() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("signup_type", "newsletter")
      .order("email", { ascending: true });
    if (dq.trim()) {
      const term = `%${dq.trim()}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Lead[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [dq, page]);

  useEffect(() => { setPage(0); }, [dq]);
  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const header = ["Date", "Email", "Phone", "Name", "Status"];
    const lines = [header.join(",")].concat(
      rows.map((r) => [
        new Date(r.created_at).toISOString(),
        r.email,
        r.phone ?? "",
        (r.name ?? "").replace(/,/g, " "),
        r.status,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nails-club-signups-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete newsletter signup for ${lead.email}? This cannot be undone.`)) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    load();
  };

  const [merging, setMerging] = useState(false);
  const handleMergeDuplicates = async () => {
    if (!confirm("Merge duplicate newsletter signups? Keeps the oldest entry per email (case-insensitive) and deletes the rest.")) return;
    setMerging(true);
    try {
      const { data: all, error } = await supabase
        .from("leads")
        .select("id, email, phone, name, notes, created_at")
        .eq("signup_type", "newsletter")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const groups = new Map<string, typeof all>();
      for (const r of all ?? []) {
        const key = (r.email ?? "").trim().toLowerCase();
        if (!key) continue;
        const arr = groups.get(key) ?? [];
        arr.push(r);
        groups.set(key, arr);
      }
      const toDelete: string[] = [];
      let dupGroups = 0;
      for (const [, arr] of groups) {
        if (arr.length < 2) continue;
        dupGroups++;
        const [keep, ...rest] = arr;
        // backfill keep with any missing fields from dupes
        const merged: Partial<Lead> = {};
        for (const r of rest) {
          if (!keep.phone && r.phone) merged.phone = r.phone;
          if (!keep.name && r.name) merged.name = r.name;
        }
        if (Object.keys(merged).length) {
          await supabase.from("leads").update(merged).eq("id", keep.id);
        }
        toDelete.push(...rest.map((r) => r.id));
      }
      if (toDelete.length) {
        const { error: delErr } = await supabase.from("leads").delete().in("id", toDelete);
        if (delErr) throw delErr;
      }
      alert(dupGroups === 0 ? "No duplicates found." : `Merged ${dupGroups} duplicate group(s); removed ${toDelete.length} entries.`);
      load();
    } catch (e: any) {
      alert(`Merge failed: ${e.message ?? e}`);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex-1 min-w-[240px]">
          <SearchBar value={q} onChange={setQ} placeholder="Search by email, name, or phone…" />
        </div>
        <button
          onClick={handleMergeDuplicates}
          disabled={merging || rows.length === 0}
          className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-border hover:border-gold hover:text-gold disabled:opacity-30"
        >
          {merging ? "Merging…" : "Merge Duplicates"}
        </button>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-border hover:border-gold hover:text-gold disabled:opacity-30"
        >
          Export CSV
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3 tracking-wider">Nails Club newsletter signups from the homepage. Sorted A–Z by email.</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3 hidden md:table-cell">Status</th>
                <th className="text-right p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-10 text-muted-foreground">No newsletter signups yet</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-gold/10 hover:bg-background/50">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 break-all">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{r.email}</span>
                  </td>
                  <td className="p-3">
                    {r.phone ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{r.phone}</span> : "—"}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-[0.65rem] px-2 py-1 tracking-[0.18em] uppercase bg-muted text-muted-foreground">{r.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-muted-foreground hover:text-red-600 transition p-1"
                      title="Delete signup"
                      aria-label="Delete signup"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} onPage={setPage} />
    </div>
  );
}

/* ---------------- MEMBERSHIPS ---------------- */
function MembershipsTable() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Membership[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("memberships")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (dq.trim()) {
      const term = `%${dq.trim()}%`;
      query = query.or(`customer_first_name.ilike.${term},customer_last_name.ilike.${term},customer_email.ilike.${term},customer_phone.ilike.${term},tier_name.ilike.${term}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data as Membership[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [dq, page]);

  useEffect(() => { setPage(0); }, [dq]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (m: Membership) => {
    const name = `${m.customer_first_name} ${m.customer_last_name}`;
    if (!confirm(`Delete membership for ${name} (${m.customer_email})?\n\nThis only removes the record from the website. If they have an active Square subscription, you must cancel it separately in Square.`)) return;
    const { error } = await supabase.from("memberships").delete().eq("id", m.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    load();
  };

  const statusColor = (s: string) => {
    const k = s.toLowerCase();
    if (k === "active") return "bg-green-100 text-green-700";
    if (k.includes("cancel")) return "bg-red-100 text-red-700";
    if (k.includes("pending")) return "bg-amber-100 text-amber-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by name, email, phone, or tier…" />
      <p className="text-xs text-muted-foreground mb-3 tracking-wider">Membership signups from the website. Active subscriptions are billed monthly through Square.</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
      ) : (
        <div className="bg-cream border border-gold/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gold/20 text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Enrolled</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3 hidden md:table-cell">Contact</th>
                <th className="text-left p-3">Tier</th>
                <th className="text-left p-3">Monthly</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-10 text-muted-foreground">No memberships yet</td></tr>
              ) : rows.map((m) => (
                <tr key={m.id} className="border-b border-gold/10 hover:bg-background/50">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(m.enrolled_at ?? m.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{m.customer_first_name} {m.customer_last_name}</td>
                  <td className="p-3 hidden md:table-cell text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{m.customer_email}</div>
                    {m.customer_phone && <div className="flex items-center gap-1 text-muted-foreground mt-1"><Phone className="w-3 h-3" />{m.customer_phone}</div>}
                  </td>
                  <td className="p-3 text-xs">{m.tier_name}</td>
                  <td className="p-3 font-medium tabular-nums">${(m.monthly_price_cents / 100).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`text-[0.65rem] px-2 py-1 tracking-[0.18em] uppercase ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(m)}
                      className="text-muted-foreground hover:text-red-600 transition p-1"
                      title="Delete membership record"
                      aria-label="Delete membership"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} onPage={setPage} />
    </div>
  );
}


