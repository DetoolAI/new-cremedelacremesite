import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, TrendingUp, Users, Repeat } from "lucide-react";

type Row = { label: string; value: number };

export function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenue30, setRevenue30] = useState(0);
  const [revenue365, setRevenue365] = useState(0);
  const [topServices, setTopServices] = useState<Row[]>([]);
  const [topStaff, setTopStaff] = useState<Row[]>([]);
  const [repeatRate, setRepeatRate] = useState<number | null>(null);
  const [monthly, setMonthly] = useState<Row[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const SUCCESS = ["Completed", "Successful", "Paid", "completed", "successful", "paid"];

      // Supabase caps .select() at 1000 rows per request — paginate to fetch ALL completed payments.
      const PAGE = 1000;
      const all: Array<{ amount: number | null; payment_at: string | null; service: string | null; team_member: string | null; customer: string | null; status: string | null }> = [];
      let from = 0;
      // Hard safety cap (we have ~16k rows; allow up to 100k).
      while (from < 100000) {
        const { data, error } = await supabase
          .from("payments_history")
          .select("amount, payment_at, service, team_member, customer, status")
          .in("status", SUCCESS)
          .order("payment_at", { ascending: true, nullsFirst: false })
          .range(from, from + PAGE - 1);
        if (error) {
          console.error("Analytics fetch error", error);
          break;
        }
        const batch = data ?? [];
        all.push(...batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }

      const now = Date.now();
      const D30 = 30 * 24 * 60 * 60 * 1000;
      const D365 = 365 * 24 * 60 * 60 * 1000;

      let total = 0;
      let r30 = 0;
      let r365 = 0;
      const serviceMap = new Map<string, number>();
      const staffMap = new Map<string, number>();
      const monthMap = new Map<string, number>();
      const customerVisits = new Map<string, number>();

      for (const p of all) {
        const amt = Number(p.amount ?? 0);
        total += amt;
        const t = p.payment_at ? new Date(p.payment_at).getTime() : 0;
        if (t && now - t <= D30) r30 += amt;
        if (t && now - t <= D365) r365 += amt;

        if (p.service) serviceMap.set(p.service, (serviceMap.get(p.service) ?? 0) + amt);
        if (p.team_member) staffMap.set(p.team_member, (staffMap.get(p.team_member) ?? 0) + amt);
        if (p.payment_at) {
          const d = new Date(p.payment_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap.set(key, (monthMap.get(key) ?? 0) + amt);
        }
        if (p.customer) {
          const k = p.customer.toLowerCase().trim();
          customerVisits.set(k, (customerVisits.get(k) ?? 0) + 1);
        }
      }

      setRevenueTotal(total);
      setRevenue30(r30);
      setRevenue365(r365);
      setTopServices(
        Array.from(serviceMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([label, value]) => ({ label, value }))
      );
      setTopStaff(
        Array.from(staffMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([label, value]) => ({ label, value }))
      );
      setMonthly(
        Array.from(monthMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-12)
          .map(([label, value]) => ({ label, value }))
      );

      const totalCustomers = customerVisits.size;
      const repeatCustomers = Array.from(customerVisits.values()).filter((c) => c > 1).length;
      setRepeatRate(totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0);

      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      setCustomerCount(count ?? 0);

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.value));

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<DollarSign className="w-4 h-4" />} label="Lifetime revenue" value={`$${revenueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Revenue · 12mo" value={`$${revenue365.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Revenue · 30d" value={`$${revenue30.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Kpi icon={<Users className="w-4 h-4" />} label="Total customers" value={customerCount.toLocaleString()} sub={<span className="inline-flex items-center gap-1"><Repeat className="w-3 h-3" /> {repeatRate?.toFixed(0)}% repeat</span>} />
      </div>

      {/* Monthly chart */}
      <section>
        <h3 className="font-serif text-lg mb-4">Revenue · last 12 months</h3>
        <div className="bg-cream border border-gold/20 p-4">
          <div className="flex items-end gap-2 h-40">
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment data.</p>
            ) : (
              monthly.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-gold to-gold/60 rounded-sm"
                      style={{ height: `${(m.value / maxMonthly) * 100}%`, minHeight: "2px" }}
                      title={`$${m.value.toFixed(0)}`}
                    />
                  </div>
                  <span className="text-[0.6rem] text-muted-foreground tracking-wider">{m.label.slice(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <RankList title="Top services by revenue" rows={topServices} />
        <RankList title="Top technicians by revenue" rows={topStaff} />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-cream border border-gold/20 p-4">
      <div className="flex items-center gap-2 text-gold mb-2">{icon}</div>
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <h3 className="font-serif text-lg mb-3">{title}</h3>
      <div className="bg-cream border border-gold/20 divide-y divide-gold/10">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No data.</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-2">{r.label}</span>
                <span className="font-medium tabular-nums">${r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
