import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, Mail, Phone, MapPin, Calendar, DollarSign, TrendingUp } from "lucide-react";

type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cellphone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
};

type Appt = {
  id: string;
  appointment_date: string | null;
  appointment_time: string | null;
  service: string | null;
  team_member: string | null;
  cost: number | null;
  status: string | null;
};

type Pay = {
  id: string;
  payment_at: string | null;
  service: string | null;
  amount: number | null;
  status: string | null;
  mode: string | null;
};

interface Props {
  customer: CustomerRow;
  onClose: () => void;
}

export function CustomerDetail({ customer, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const name = (customer.name ?? "").toLowerCase();
      const email = (customer.email ?? "").toLowerCase();
      const phoneTail = (customer.phone ?? customer.cellphone ?? "")
        .replace(/\D/g, "")
        .slice(-7);

      // Appointments: by email OR by name OR by phone tail
      const apptOr: string[] = [];
      if (email) apptOr.push(`email.ilike.${email}`);
      if (name) apptOr.push(`customer_name.ilike.${name}`);
      if (phoneTail) apptOr.push(`phone.ilike.%${phoneTail}`);

      const { data: aData } = apptOr.length
        ? await supabase
            .from("appointments_history")
            .select("id, appointment_date, appointment_time, service, team_member, cost, status")
            .or(apptOr.join(","))
            .order("appointment_date", { ascending: false, nullsFirst: false })
            .limit(200)
        : { data: [] as Appt[] };

      // Payments: matched by customer name (only field shared)
      const { data: pData } = name
        ? await supabase
            .from("payments_history")
            .select("id, payment_at, service, amount, status, mode")
            .ilike("customer", name)
            .order("payment_at", { ascending: false, nullsFirst: false })
            .limit(200)
        : { data: [] as Pay[] };

      if (cancelled) return;
      setAppts((aData as Appt[]) ?? []);
      setPays((pData as Pay[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  const totalSpent = pays
    .filter((p) =>
      ["completed", "successful", "paid"].includes((p.status ?? "").toLowerCase())
    )
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const visitCount = appts.length;
  const lastVisit =
    appts.find((a) => a.appointment_date)?.appointment_date ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-background shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream border-b border-gold/20 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[0.6rem] tracking-[0.3em] uppercase text-gold mb-1">Customer 360</p>
            <h2 className="font-serif text-2xl">{customer.name || "Unnamed customer"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:text-gold" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact */}
          <section className="space-y-2 text-sm">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold" />
                <a href={`mailto:${customer.email}`} className="hover:text-gold break-all">
                  {customer.email}
                </a>
              </div>
            )}
            {(customer.phone || customer.cellphone) && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gold" />
                <a href={`tel:${customer.phone ?? customer.cellphone}`} className="hover:text-gold">
                  {customer.phone ?? customer.cellphone}
                </a>
              </div>
            )}
            {(customer.address || customer.city) && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <span>
                  {[customer.address, customer.city, customer.state, customer.zipcode]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            <StatCard icon={<DollarSign className="w-4 h-4" />} label="Lifetime spend" value={`$${totalSpent.toFixed(2)}`} />
            <StatCard icon={<Calendar className="w-4 h-4" />} label="Visits" value={visitCount.toString()} />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Last visit" value={lastVisit ?? "—"} />
          </section>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gold" />
            </div>
          ) : (
            <>
              {/* Appointments */}
              <section>
                <h3 className="font-serif text-lg mb-3">Appointment history ({appts.length})</h3>
                {appts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments found.</p>
                ) : (
                  <div className="border border-gold/20 bg-cream divide-y divide-gold/10 text-sm">
                    {appts.slice(0, 50).map((a) => (
                      <div key={a.id} className="p-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{a.service || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.appointment_date} · {a.appointment_time} · {a.team_member || "—"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {a.cost != null && <div className="text-xs">${a.cost}</div>}
                          <span
                            className={`text-[0.6rem] tracking-[0.18em] uppercase px-2 py-0.5 inline-block mt-1 ${
                              a.status === "Cancelled"
                                ? "bg-red-100 text-red-700"
                                : a.status === "Confirmed"
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {a.status || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {appts.length > 50 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        + {appts.length - 50} more
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Payments */}
              <section>
                <h3 className="font-serif text-lg mb-3">Payment history ({pays.length})</h3>
                {pays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments found.</p>
                ) : (
                  <div className="border border-gold/20 bg-cream divide-y divide-gold/10 text-sm">
                    {pays.slice(0, 50).map((p) => (
                      <div key={p.id} className="p-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{p.service || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.payment_at ? new Date(p.payment_at).toLocaleDateString() : "—"} · {p.mode || "—"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-medium">
                            {p.amount != null ? `$${Number(p.amount).toFixed(2)}` : "—"}
                          </div>
                          <span
                            className={`text-[0.6rem] tracking-[0.18em] uppercase px-2 py-0.5 inline-block mt-1 ${
                              ["completed", "paid", "successful"].includes(
                                (p.status ?? "").toLowerCase()
                              )
                                ? "bg-green-100 text-green-700"
                                : (p.status ?? "").toLowerCase().includes("refund")
                                ? "bg-amber-100 text-amber-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.status || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pays.length > 50 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        + {pays.length - 50} more
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-cream border border-gold/20 p-4">
      <div className="flex items-center gap-2 text-gold mb-2">{icon}</div>
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground">{label}</div>
      <div className="font-serif text-lg mt-1">{value}</div>
    </div>
  );
}
