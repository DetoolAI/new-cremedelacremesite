import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDateLong,
  formatTime12h,
  generateTimeSlots,
  parsePriceCents,
  formatMoney,
} from "@/lib/booking";
import { toast } from "sonner";
import { Loader2, Check, X, Plus } from "lucide-react";
import { SquareCardForm } from "@/components/SquareCardForm";
import { staffCanPerform } from "@/lib/staff-skills";

interface Category {
  id: string;
  name: string;
  slug: string;
}
interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  category_id: string;
  price_text: string | null;
  min_lead_minutes?: number;
}
interface Staff {
  id: string;
  name: string;
  bio: string | null;
  work_days: number[];
}

interface CartItem {
  id: string | null;
  name: string;
  duration_minutes: number;
  price_text: string | null;
  min_lead_minutes: number;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: { serviceName?: string; categorySlug?: string };
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const COMBO_KEYWORDS = ["combo", "combinada"];
const normalizeServiceName = (name: string | null | undefined): string =>
  (name ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const isComboSlug = (slug: string | null | undefined): boolean => {
  const s = (slug ?? "").toLowerCase();
  return COMBO_KEYWORDS.some((k) => s.includes(k));
};
const isComboName = (name: string | null | undefined): boolean => {
  const s = (name ?? "").toLowerCase();
  return COMBO_KEYWORDS.some((k) => s.includes(k));
};

const priceSortValue = (price: string | null | undefined): number => {
  const cents = parsePriceCents(price);
  return cents ?? Number.POSITIVE_INFINITY;
};

export function BookingModal({ open, onClose, prefill }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceStaff, setServiceStaff] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("Any Available Technician");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [customerType, setCustomerType] = useState<"new" | "returning">("new");
  const [isMember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    balance: number;
    lifetimePoints: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setCategoryId(null);
        setCart([]);
        setStaffId(null);
        setStaffName("Any Available Technician");
        setDate(undefined);
        setTime(null);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setNotes("");
        setCustomerType("new");
        setLoyaltyInfo(null);
      }, 200);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catsRes, svcRes, staffRes, ssRes] = await Promise.all([
        supabase
          .from("service_categories")
          .select("id,name,slug")
          .eq("active", true)
          .order("display_order"),
        supabase
          .from("services")
          .select("id,name,description,duration_minutes,category_id,price_text,min_lead_minutes")
          .eq("active", true)
          .order("display_order"),
        supabase
          .from("staff")
          .select("id,name,bio,work_days")
          .eq("active", true)
          .order("display_order"),
        supabase.from("service_staff").select("service_id,staff_id"),
      ]);
      if (cancelled) return;
      setCategories(catsRes.data ?? []);
      setServices(svcRes.data ?? []);
      setStaff(staffRes.data ?? []);
      const map: Record<string, Set<string>> = {};
      for (const row of (ssRes.data ?? []) as Array<{ service_id: string; staff_id: string }>) {
        if (!map[row.service_id]) map[row.service_id] = new Set();
        map[row.service_id].add(row.staff_id);
      }
      setServiceStaff(map);
      setLoading(false);

      const cats = catsRes.data ?? [];
      const svcs = svcRes.data ?? [];
      const matchedCat = prefill?.categorySlug
        ? (cats.find((x) => x.slug === prefill.categorySlug) ?? null)
        : null;
      if (matchedCat) setCategoryId(matchedCat.id);

      if (prefill?.serviceName) {
        const target = normalizeServiceName(prefill.serviceName);
        const targetIsCombo = isComboSlug(matchedCat?.slug) || isComboName(prefill.serviceName);
        const scopedSvcs = matchedCat ? svcs.filter((x) => x.category_id === matchedCat.id) : svcs;
        const matchedSvc =
          scopedSvcs.find((x) => normalizeServiceName(x.name) === target) ??
          scopedSvcs.find((x) => {
            const n = normalizeServiceName(x.name);
            const candidateIsCombo =
              isComboName(x.name) || isComboSlug(cats.find((c) => c.id === x.category_id)?.slug);
            if (targetIsCombo !== candidateIsCombo) return false;
            return n.includes(target) || target.includes(n);
          }) ??
          null;
        if (matchedSvc) {
          const cat = cats.find((c) => c.id === matchedSvc.category_id) ?? null;
          setCategoryId(matchedSvc.category_id);
          setCart([
            {
              id: matchedSvc.id,
              name: matchedSvc.name,
              duration_minutes: matchedSvc.duration_minutes,
              price_text: matchedSvc.price_text,
              min_lead_minutes: matchedSvc.min_lead_minutes ?? 0,
              category_id: matchedSvc.category_id,
              category_name: cat?.name ?? null,
              category_slug: cat?.slug ?? null,
            },
          ]);
          setStep(3);
        } else {
          setCart([
            {
              id: null,
              name: prefill.serviceName,
              duration_minutes: 60,
              price_text: null,
              min_lead_minutes: 60,
              category_id: matchedCat?.id ?? null,
              category_name: matchedCat?.name ?? null,
              category_slug: matchedCat?.slug ?? null,
            },
          ]);
          setStep(3);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, prefill]);

  const filteredServices = useMemo(() => {
    const selected = categories.find((c) => c.id === categoryId) ?? null;
    const list = services.filter((s) => s.category_id === categoryId);
    if (!isComboSlug(selected?.slug)) return list;
    return [...list].sort((a, b) => {
      const priceDiff = priceSortValue(a.price_text) - priceSortValue(b.price_text);
      if (priceDiff !== 0) return priceDiff;
      const durationDiff = (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0);
      if (durationDiff !== 0) return durationDiff;
      return a.name.localeCompare(b.name);
    });
  }, [services, categoryId, categories]);

  const cartHasCombo = useMemo(
    () => cart.some((i) => isComboSlug(i.category_slug) || isComboName(i.name)),
    [cart],
  );
  const maxItems = cartHasCombo ? 1 : 3;
  const totalDuration = useMemo(
    () => cart.reduce((sum, i) => sum + (i.duration_minutes || 0), 0),
    [cart],
  );
  const totalPriceCents = useMemo(() => {
    let sum = 0;
    let allParsed = true;
    for (const i of cart) {
      const c = parsePriceCents(i.price_text);
      if (c == null) {
        allParsed = false;
        break;
      }
      sum += c;
    }
    return allParsed && cart.length > 0 ? sum : null;
  }, [cart]);
  const combinedServiceName = useMemo(() => cart.map((i) => i.name).join(" + "), [cart]);
  const combinedPriceText = useMemo(() => {
    if (cart.length === 0) return null;
    if (cart.length === 1) return cart[0].price_text;
    if (totalPriceCents != null) return formatMoney(totalPriceCents);
    return cart.map((i) => i.price_text ?? "—").join(" + ");
  }, [cart, totalPriceCents]);
  const combinedMinLead = useMemo(
    () => cart.reduce((max, i) => Math.max(max, i.min_lead_minutes || 0), 0),
    [cart],
  );

  const tryAddService = (s: Service) => {
    if (cart.find((i) => i.id === s.id)) {
      toast.error("Already in your reservation");
      return;
    }
    const cat = categories.find((c) => c.id === s.category_id) ?? null;
    const wouldBeCombo = isComboSlug(cat?.slug) || isComboName(s.name);
    if (cart.length > 0 && (wouldBeCombo || cartHasCombo)) {
      toast.error("Combos must be booked alone", {
        description:
          "A combo counts as a full reservation. Please remove other services first, or book the combo separately.",
      });
      return;
    }
    if (cart.length >= 3) {
      toast.error("Maximum 3 services per reservation", {
        description: "Need more? Please book a separate appointment.",
      });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        id: s.id,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price_text: s.price_text,
        min_lead_minutes: s.min_lead_minutes ?? 0,
        category_id: s.category_id,
        category_name: cat?.name ?? null,
        category_slug: cat?.slug ?? null,
      },
    ]);
    toast.success(`Added: ${s.name}`);
  };
  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const timeSlots = useMemo(() => (date ? generateTimeSlots(date) : []), [date]);

  const eligibleStaff = useMemo(() => {
    if (cart.length === 0) return staff;
    return staff.filter((t) => {
      for (const item of cart) {
        if (!staffCanPerform(t.name, item.name, item.category_name)) return false;
      }
      for (const item of cart) {
        if (!item.id) continue;
        const allowed = serviceStaff[item.id];
        if (allowed && allowed.size > 0 && !allowed.has(t.id)) return false;
      }
      return true;
    });
  }, [cart, staff, serviceStaff]);

  useEffect(() => {
    if (!staffId) return;
    if (!eligibleStaff.find((t) => t.id === staffId)) {
      setStaffId(null);
      setStaffName("Any Available Technician");
    }
  }, [eligibleStaff, staffId]);

  const [busy, setBusy] = useState<
    Array<{ start: string; duration_minutes: number; staff_id: string | null }>
  >([]);
  const [schedule, setSchedule] = useState<
    Array<{ staff_id: string; start_time: string; end_time: string }>
  >([]);
  const [availableSquareSlots, setAvailableSquareSlots] = useState<string[] | null>(null);

  useEffect(() => {
    if (!date) {
      setBusy([]);
      setSchedule([]);
      return;
    }
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const params = new URLSearchParams({
      date: dateStr,
      staff_id: staffId ?? "any",
      duration_minutes: String(totalDuration || 60),
      ...(cart[0]?.id ? { service_id: cart[0].id } : {}),
    });

    let cancelled = false;

    const load = async () => {
      try {
        const r = await fetch(`/api/public/available-slots?${params.toString()}`);
        const j = await r.json();
        if (!cancelled && !j.fallback && j.available_slots?.length > 0) {
          setAvailableSquareSlots(j.available_slots);
          setBusy([]);
          setSchedule([]);
          return;
        }
      } catch {}

      if (!cancelled) {
        fetch(`/api/public/busy-slots?${new URLSearchParams({ date: dateStr, staff_id: staffId ?? "any" })}`)
          .then((r) => r.json())
          .then((j) => {
            if (cancelled) return;
            setAvailableSquareSlots(null);
            setBusy(Array.isArray(j?.busy) ? j.busy : []);
            setSchedule(Array.isArray(j?.schedule) ? j.schedule : []);
          })
          .catch(() => {
            if (!cancelled) {
              setAvailableSquareSlots(null);
              setBusy([]);
              setSchedule([]);
            }
          });
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [date, staffId, cart]);

  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  useEffect(() => {
    if (!open) return;
    fetch("/api/public/booking-settings")
      .then((r) => r.json())
      .then((j) => {
        if (typeof j?.max_advance_days === "number") setMaxAdvanceDays(j.max_advance_days);
      })
      .catch(() => {});
  }, [open]);

  const goNext = () => setStep((s) => Math.min(6, s + 1) as Step);
  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  const walletPaying = useRef(false);
  const paymentInProgress = useRef(false);
  const payAndSubmitRef = useRef<(sourceId: string, idempotencyKey: string) => Promise<void>>(async () => {});

  const payAndSubmit = async (
    sourceId: string,
    idempotencyKey: string,
  ) => {
    if (cart.length === 0 || !date || !time) return;
    walletPaying.current = true;
    paymentInProgress.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/book-with-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: idempotencyKey,
          booking: {
            customer_first_name: firstName.trim(),
            customer_last_name: lastName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            customer_type: customerType,
            is_member: isMember,
            service_id: cart[0].id ?? null,
            service_name: combinedServiceName,
            service_category: selectedCategory?.name ?? cart[0].category_name ?? null,
            staff_id: staffId,
            staff_name: staffName,
            appointment_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
            appointment_time: time,
            duration_minutes: totalDuration,
            service_price_text: combinedPriceText,
            notes: notes.trim() || null,
            services: cart.map((i) => ({
              id: i.id,
              name: i.name,
              duration_minutes: i.duration_minutes,
              price_text: i.price_text,
              category_name: i.category_name,
            })),
          },
        }),
      });
      const json = await res.json();
      if (res.status === 409) {
        toast.error("That time was just booked by someone else", {
          description:
            "Please pick a different time — we've refreshed the available slots for you.",
          duration: 6000,
        });
        setTime(null);
        setStep(4);
        if (date) setDate(new Date(date));
        return;
      }
      if (!res.ok) throw new Error(json?.error ?? "Booking failed");

      toast.success(`Payment confirmed — $22.00 charged`, {
        description: `A receipt is on its way to ${email.trim()}.`,
        duration: 8000,
      });

      try {
        const lookupRes = await fetch("/api/public/loyalty-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() }),
        });
        const lookup = await lookupRes.json();
        if (lookupRes.ok && lookup?.found) {
          setLoyaltyInfo({
            balance: lookup.balance ?? 0,
            lifetimePoints: lookup.lifetimePoints ?? 0,
          });
        }
      } catch {
        /* non-blocking */
      }

      setStep(7);
    } catch (e: any) {
      const msg = e?.message ?? "Could not complete booking";
      toast.error("Booking could not be completed", { description: msg, duration: 8000 });
    } finally {
      setSubmitting(false);
      walletPaying.current = false;
      paymentInProgress.current = false;
    }
  };

  payAndSubmitRef.current = payAndSubmit;
  const stableOnPaid = useRef(async (sourceId: string, idempotencyKey: string) => {
    return payAndSubmitRef.current(sourceId, idempotencyKey);
  }).current;

  const canNext = (() => {
    switch (step) {
      case 1:
        return !!categoryId;
      case 2:
        return cart.length > 0;
      case 3:
        return true;
      case 4:
        return !!date && !!time;
      case 5:
        return (
          firstName.trim() &&
          lastName.trim() &&
          /\S+@\S+\.\S+/.test(email) &&
          phone.trim().length >= 5
        );
      default:
        return false;
    }
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !walletPaying.current && !paymentInProgress.current) onClose();
      }}
    >
      <DialogContent className="max-w-2xl" hideClose={step === 6 || submitting}>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl sm:text-2xl">
            {step === 7
              ? "Appointment Confirmed"
              : step === 6
                ? "Secure Deposit"
                : "Book Your Appointment"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 7
              ? "Your deposit is paid and your spot is held."
              : step === 6
                ? "Pay your $20 deposit + $2 processing fee to lock in this time."
                : `Step ${step} of 6 · One reservation per client`}
          </DialogDescription>
        </DialogHeader>

        {!loading && step >= 2 && step <= 5 && cart.length > 0 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Your reservation ({cart.length}/{maxItems}) · {totalDuration} min total
            </div>
            <ul className="space-y-1">
              {cart.map((i, idx) => (
                <li
                  key={`${i.id ?? "adhoc"}-${idx}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    <span className="font-medium">{i.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {i.duration_minutes} min{i.price_text ? ` · ${i.price_text}` : ""}
                    </span>
                  </span>
                  {step <= 2 && (
                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={`Remove ${i.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {combinedPriceText && cart.length > 1 && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-primary/20">
                Subtotal: <span className="font-semibold text-foreground">{combinedPriceText}</span>{" "}
                (paid in salon, less your $20 deposit)
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
            {categories.map((c) => {
              const disabled = cart.length > 0 && cartHasCombo;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setCategoryId(c.id);
                    goNext();
                  }}
                  className={`text-left p-4 rounded-md border transition ${
                    disabled ? "opacity-40 cursor-not-allowed" : "hover:border-primary"
                  } ${categoryId === c.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="font-medium">{c.name}</div>
                  {isComboSlug(c.slug) && (
                    <div className="text-xs text-muted-foreground mt-0.5">Combo · books alone</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!loading && step === 2 && (
          <div className="space-y-3 py-4">
            <p className="text-xs text-muted-foreground">
              Pick up to {maxItems}{" "}
              {cartHasCombo ? "combo" : "service" + (maxItems === 1 ? "" : "s")} for this
              reservation. Same technician, one time slot.
              {cartHasCombo && " (Combos book alone.)"}
            </p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {filteredServices.map((s) => {
                const inCart = !!cart.find((i) => i.id === s.id);
                const cat = categories.find((c) => c.id === s.category_id);
                const wouldBeCombo = isComboSlug(cat?.slug) || isComboName(s.name);
                const blocked = !inCart && cart.length >= maxItems;
                const blockedByCombo = !inCart && cart.length > 0 && (wouldBeCombo || cartHasCombo);
                const disabled = blocked || blockedByCombo;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled || inCart}
                    onClick={() => tryAddService(s)}
                    className={`w-full text-left p-4 rounded-md border transition ${
                      inCart
                        ? "border-primary bg-primary/10"
                        : disabled
                          ? "opacity-50 cursor-not-allowed border-border"
                          : "border-border hover:border-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {s.name}
                          {inCart && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        {s.description && (
                          <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.duration_minutes} min{s.price_text ? ` · ${s.price_text}` : ""}
                        </div>
                      </div>
                      {!inCart && !disabled && (
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredServices.length === 0 && (
                <p className="text-sm text-muted-foreground">No services in this category.</p>
              )}
            </div>
            {cart.length > 0 && cart.length < maxItems && !cartHasCombo && (
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add another service from a different category
              </Button>
            )}
          </div>
        )}

        {!loading && step === 3 && (
          <div className="space-y-2 py-4">
            <p className="text-xs text-muted-foreground mb-2">
              Showing technicians who perform{" "}
              <span className="font-medium">all selected services</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setStaffId(null);
                setStaffName("Any Available Technician");
                goNext();
              }}
              className="w-full text-left p-4 rounded-md border hover:border-primary"
            >
              <div className="font-medium">Any Available Technician</div>
            </button>
            {eligibleStaff.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setStaffId(t.id);
                  setStaffName(t.name);
                  goNext();
                }}
                className={`w-full text-left p-4 rounded-md border transition hover:border-primary ${staffId === t.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="font-medium">{t.name}</div>
              </button>
            ))}
            {eligibleStaff.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                No technicians can perform every selected service together. Try removing one or
                contact the salon.
              </p>
            )}
          </div>
        )}

        {!loading &&
          step === 4 &&
          (() => {
            const selectedStaff = staffId ? staff.find((t) => t.id === staffId) : null;
            const allowedDays = new Set<number>(
              selectedStaff
                ? (selectedStaff.work_days ?? [])
                : eligibleStaff.flatMap((t) => t.work_days ?? []),
            );
            return (
              <div className="grid md:grid-cols-2 gap-6 py-4">
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
                      const t = new Date();
                      t.setHours(0, 0, 0, 0);
                      if (d < t) return true;
                      const max = new Date(t);
                      max.setDate(max.getDate() + maxAdvanceDays);
                      if (d > max) return true;
                      return !allowedDays.has(d.getDay());
                    }}
                    className="rounded-md border"
                  />
                  {selectedStaff && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing {selectedStaff.name}'s available days. Greyed-out dates are days off.
                    </p>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block">
                    Time
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({totalDuration} min total)
                    </span>
                  </Label>
                  {!date && <p className="text-sm text-muted-foreground">Select a date first.</p>}
                  {date &&
                    (() => {
                      const toMin = (s: string) => {
                        const [h, m] = s.split(":").map(Number);
                        return (h ?? 0) * 60 + (m ?? 0);
                      };
                      const dur = totalDuration || 60;
                      const closing = (date.getDay() === 0 ? 18 * 60 : 19 * 60) - 15;
                      const techIds = eligibleStaff.map((t) => t.id);
                      const TZ = "America/New_York";
                      const nowParts = new Intl.DateTimeFormat("en-CA", {
                        timeZone: TZ,
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).formatToParts(new Date());
                      const getP = (t: string) => nowParts.find((p) => p.type === t)?.value ?? "00";
                      const todayStr = `${getP("year")}-${getP("month")}-${getP("day")}`;
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      let nowMin =
                        Number(getP("hour") === "24" ? "00" : getP("hour")) * 60 +
                        Number(getP("minute"));
                      const leadMinutes = Math.max(15, combinedMinLead);
                      nowMin += leadMinutes;

                      const staffWindows = new Map<string, Array<{ s: number; e: number }>>();
                      for (const sch of schedule) {
                        if (!staffWindows.has(sch.staff_id)) staffWindows.set(sch.staff_id, []);
                        staffWindows
                          .get(sch.staff_id)!
                          .push({ s: toMin(sch.start_time), e: toMin(sch.end_time) });
                      }
                      const staffCanWork = (sid: string, start: number, end: number): boolean => {
                        const windows = staffWindows.get(sid);
                        if (windows && windows.length > 0) {
                          const inside = windows.some((w) => start >= w.s && end <= w.e);
                          if (!inside) return false;
                        }
                        return true;
                      };

                      const isUnavailable = (slot: string): boolean => {
                        const start = toMin(slot);
                        const end = start + dur;
                        const bufferStart = start - 15;
                        const bufferEnd = end + 15;
                        if (end > closing) return true;
                        if (isToday && start < nowMin) return true;
                        if (!staffId) {
                          if (techIds.length === 0) return false;
                          const blocked = new Set<string>();
                          for (const b of busy) {
                            const bs = toMin(b.start);
                            const be = bs + (b.duration_minutes || 60);
                            if (bufferStart < be && bufferEnd > bs) {
                              if (b.staff_id && techIds.includes(b.staff_id)) {
                                blocked.add(b.staff_id);
                              } else if (!b.staff_id) {
                                const free = techIds.find((id) => !blocked.has(id));
                                if (free) blocked.add(free);
                              }
                            }
                          }
                          for (const id of techIds) {
                            if (!staffCanWork(id, start, end)) blocked.add(id);
                          }
                          return techIds.every((id) => blocked.has(id));
                        }
                        if (!staffCanWork(staffId, start, end)) return true;
                        for (const b of busy) {
                          const bs = toMin(b.start);
                          const be = bs + (b.duration_minutes || 60);
                          if (bufferStart < be && bufferEnd > bs) return true;
                        }
                        return false;
                      };
                      return (
                        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                          {(availableSquareSlots ?? timeSlots).map((t) => {
                            const unavailable = availableSquareSlots
                              ? false
                              : isUnavailable(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                disabled={unavailable}
                                onClick={() => !unavailable && setTime(t)}
                                title={
                                  unavailable
                                    ? "Unavailable — already past, overlaps an existing booking, or runs past closing"
                                    : undefined
                                }
                                className={`text-sm py-2 rounded border transition ${
                                  unavailable
                                    ? "border-border/40 bg-muted/30 text-muted-foreground/50 line-through cursor-not-allowed"
                                    : time === t
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary"
                                }`}
                              >
                                {formatTime12h(t)}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>
              </div>
            );
          })()}

        {!loading && step === 5 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fn">First name</Label>
                <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ln">Last name</Label>
                <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nt">Notes (optional)</Label>
              <Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">Are you a new or returning customer?</Label>
              <RadioGroup
                value={customerType}
                onValueChange={(v) => setCustomerType(v as "new" | "returning")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="font-normal">
                    New
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="returning" id="ret" />
                  <Label htmlFor="ret" className="font-normal">
                    Returning
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="py-4 space-y-3">
            <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
              {cart.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.name}</span>
                  <span>{i.price_text ?? "—"}</span>
                </div>
              ))}
              {cart.length > 1 && combinedPriceText && (
                <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                  <span>Service subtotal</span>
                  <span>{combinedPriceText}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Deposit (credited toward total)</span>
                <span>−$20.00</span>
              </div>
              <div className="flex justify-between">
                <span>Processing fee</span>
                <span>$2.00</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span>Charged today</span>
                <span>$22.00</span>
              </div>
              {totalPriceCents != null && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Balance due in salon</span>
                  <span>{formatMoney(Math.max(0, totalPriceCents - 2000))}</span>
                </div>
              )}
            </div>

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <p className="font-semibold tracking-wide uppercase text-[0.65rem]">
                Our Booking Policy
              </p>
              <p>
                A <strong>$20 deposit</strong> per person is required and is deducted from your
                balance — <strong>unless your appointment is missed or you arrive late</strong>, in
                which case the deposit is forfeited. Deposit is non-refundable. For any changes,
                please call or text us at <strong>(347) 880-8282</strong>.
              </p>
              <p className="text-amber-800/80 italic">
                Citas requieren un depósito de $20 p/p, deducido del balance, o se pierde si falta o
                llega tarde. No reembolsable. Para cambios, llámenos o envíe mensaje al (347)
                880-8282. ¡Gracias!
              </p>
            </div>

            <SquareCardForm
              amountLabel="$22.00"
              amountCents={2200}
              submitting={submitting}
              buyer={{
                firstName,
                lastName,
                email,
                phone,
                countryCode: "US",
              }}
              onPaymentStart={() => {
                paymentInProgress.current = true;
                walletPaying.current = true;
              }}
              onPaymentEnd={() => {
                walletPaying.current = false;
                paymentInProgress.current = false;
              }}
              onPaid={stableOnPaid}
            />
          </div>
        )}

        {step === 7 && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center ring-4 ring-green-50">
              <Check className="w-9 h-9 text-green-600" strokeWidth={3} />
            </div>
            <div className="rounded-md border-2 border-green-500 bg-green-50 px-4 py-3 text-green-900">
              <p className="font-semibold text-base">✓ Payment confirmed — $22.00 charged</p>
              <p className="text-xs mt-1">
                Reference:{" "}
                <span className="font-mono">
                  {firstName.toLowerCase()}-{Date.now().toString().slice(-6)}
                </span>
              </p>
            </div>
            <h3 className="font-serif text-2xl">Thank you, {firstName}!</h3>
            <p className="text-muted-foreground">
              A confirmation receipt has been sent to{" "}
              <strong className="text-foreground">{email}</strong>.
            </p>
            <div className="text-left bg-muted/40 rounded-md p-4 text-sm space-y-1">
              <div>
                <strong>Services:</strong>
              </div>
              <ul className="ml-4 list-disc">
                {cart.map((i, idx) => (
                  <li key={idx}>
                    {i.name}
                    {i.price_text ? ` — ${i.price_text}` : ""}
                  </li>
                ))}
              </ul>
              <div>
                <strong>Technician:</strong> {staffName}
              </div>
              <div>
                <strong>Date:</strong> {date && formatDateLong(date)}
              </div>
              <div>
                <strong>Time:</strong> {time && formatTime12h(time)} ({totalDuration} min)
              </div>
              <div>
                <strong>Charged today:</strong> $22.00 ($20 deposit + $2 fee)
              </div>
              {totalPriceCents != null && (
                <div className="text-muted-foreground">
                  Balance in salon: {formatMoney(Math.max(0, totalPriceCents - 2000))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic px-2">
              Reminder: deposit is forfeited for no-shows or late arrivals. For any changes, please
              call or text us at (347) 880-8282.
            </p>
            {loyaltyInfo && (
              <div className="text-left bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-md p-4 text-sm">
                <p className="font-serif text-base mb-1">You earned a loyalty point!</p>
                <p className="text-muted-foreground">
                  You now have{" "}
                  <span className="font-semibold text-foreground">
                    {loyaltyInfo.balance} {loyaltyInfo.balance === 1 ? "point" : "points"}
                  </span>
                  {loyaltyInfo.lifetimePoints > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-semibold text-foreground">
                        {loyaltyInfo.lifetimePoints}
                      </span>{" "}
                      lifetime earned
                    </>
                  )}
                  .
                </p>
                <a
                  href="/rewards"
                  className="inline-block mt-2 text-xs tracking-[0.18em] uppercase text-amber-700 hover:text-amber-900 underline"
                >
                  View Rewards →
                </a>
              </div>
            )}
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}

        {step !== 6 && step !== 7 && !loading && (
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={step === 1 ? onClose : goBack}>
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step === 5 ? (
              <Button onClick={() => setStep(6)} disabled={!canNext || submitting}>
                Continue to Payment
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canNext}>
                Next
              </Button>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="flex justify-start pt-4 border-t">
            <Button variant="outline" onClick={goBack} disabled={submitting}>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}