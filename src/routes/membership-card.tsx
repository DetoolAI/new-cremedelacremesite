import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Loader2, AlertCircle, ShieldCheck, Undo2, Camera, UserCircle2, Clock, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getStaffMembership, redeemMembershipBenefit, undoMembershipRedemption, setMembershipPhoto,
  editMembershipRedemption,
  type StaffResponse, type StaffBenefit, type StaffHistoryItem,
} from "@/lib/membership-staff";
import { toast } from "sonner";

type Search = { id?: string; staff?: boolean };

// Quick-pick add-ons that staff can toggle on a redemption. Toggling appends
// or removes "Add-ons: A, B" from the front of the notes field, leaving any
// free-text notes the staff also typed intact.
const ADD_ONS = [
  "Gel removal",
  "Polish change",
  "French tip",
  "Paraffin",
  "Nail repair",
  "Long nails",
] as const;

const ADDON_RE = /^Add-ons: ([^\n]*)(\n|$)/;

function parseAddOnsFromNote(note: string): { list: string[]; rest: string } {
  const m = note.match(ADDON_RE);
  if (!m) return { list: [], rest: note };
  const list = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  const rest = note.slice(m[0].length);
  return { list, rest };
}

function buildNote(list: string[], rest: string): string {
  const trimmedRest = rest.replace(/^\n+/, "");
  if (list.length === 0) return trimmedRest;
  const prefix = `Add-ons: ${list.join(", ")}`;
  return trimmedRest ? `${prefix}\n${trimmedRest}` : prefix;
}

function noteHasAddOn(note: string, addon: string): boolean {
  return parseAddOnsFromNote(note).list.includes(addon);
}

function toggleAddOn(note: string, addon: string): string {
  const { list, rest } = parseAddOnsFromNote(note);
  const next = list.includes(addon) ? list.filter((a) => a !== addon) : [...list, addon];
  return buildNote(next, rest);
}

export const Route = createFileRoute("/membership-card")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
    staff: s.staff === "1" || s.staff === 1 || s.staff === true || s.staff === "true",
  }),
  head: () => ({
    meta: [
      { title: "Membership Card — Crème de la Crème Nails ®" },
      { name: "description", content: "Your Crème Society digital membership card. Show this to the front desk for check-in." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MembershipCardRoute,
});

function MembershipCardRoute() {
  const { id, staff } = useSearch({ from: "/membership-card" });
  return <MembershipCardPage id={id} staffView={staff} />;
}

type CardBenefit = { label: string; quantity: number; variants: string[] | null };
type Card = {
  id: string;
  name: string;
  email: string;
  tier: string;
  monthlyPrice: string;
  status: string;
  enrolledAt: string;
  active: boolean;
  photoUrl?: string | null;
  benefits?: CardBenefit[];
};

export function MembershipCardPage({ id, staffView = false }: { id?: string; staffView?: boolean }) {
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isAdmin = staffView;
  const adminChecked = true;

  useEffect(() => {
    if (!id) {
      setError("No membership id provided. Use the link from your enrollment email.");
      return;
    }
    fetch(`/api/public/membership-card?id=${encodeURIComponent(id)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) { setError(j?.error ?? "Could not load membership"); return; }
        setCard(j);
        const verifyUrl = `${window.location.origin}/membership-card?id=${j.id}`;
        QRCode.toDataURL(verifyUrl, { width: 320, margin: 1, color: { dark: "#1a0f0a", light: "#ffffff" } })
          .then(setQrDataUrl)
          .catch(() => {});
      })
      .catch(() => setError("Could not load membership"));
  }, [id]);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          <p className="text-[0.65rem] uppercase tracking-luxe text-muted-foreground text-center mb-3">
            {isAdmin ? "Staff Check-in" : "Crème Society · Digital Membership"}
          </p>
          <h1 className="font-serif text-3xl text-center mb-8">
            {isAdmin ? "Member Check-in" : "Your Membership Card"}
          </h1>

          {!id || error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive" />
              <p className="text-sm">{error ?? "Loading…"}</p>
              <Link to="/membership" className="text-xs underline mt-3 inline-block">Back to memberships</Link>
            </div>
          ) : !card || !adminChecked ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : isAdmin ? (
            <StaffCheckIn membershipId={card.id} />
          ) : (
            <CustomerCard card={card} qrDataUrl={qrDataUrl} />
          )}

          {!isAdmin && (
            <p className="text-xs text-muted-foreground text-center mt-6 px-4">
              Save this page to your home screen for quick access. Front desk staff can scan the QR code with any phone to verify your membership.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function CustomerCard({ card, qrDataUrl }: { card: Card; qrDataUrl: string | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#1a0f0a] to-[#3a1f15] text-white p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3 min-w-0">
            {card.photoUrl ? (
              <img src={card.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <UserCircle2 className="w-7 h-7 opacity-60" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] opacity-70">Member</p>
              <p className="font-serif text-xl mt-1 truncate">{card.name}</p>
              <p className="text-[0.6rem] uppercase tracking-[0.2em] opacity-60 mt-1 font-mono">
                Member #{card.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 flex items-center justify-center mb-6">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Membership QR code" className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground" /></div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="opacity-60">Tier</span>
            <span className="text-right max-w-[60%]">{card.tier}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="opacity-60">Monthly</span>
            <span>{card.monthlyPrice}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="opacity-60">Member since</span>
            <span>{new Date(card.enrolledAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="opacity-60">Member #</span>
            <span className="font-mono text-xs">{card.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
        <p className="text-[0.6rem] uppercase tracking-[0.25em] opacity-50 text-center mt-6">
          Show at front desk for check-in
        </p>
      </div>

      {card.benefits && card.benefits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground mb-3">Your monthly benefits</p>
          <div className="space-y-3">
            {card.benefits.map((b) => (
              <div key={b.label}>
                <p className="text-sm font-medium">{b.quantity}× {b.label}</p>
                {b.variants && b.variants.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {b.variants.map((v) => (
                      <span key={v} className="text-[0.65rem] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            At check-in, let the front desk know which option you'd like to use today.
          </p>
        </div>
      )}

      <Link
        to="/member-book"
        className="block w-full text-center rounded-full bg-primary text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.22em] hover:bg-foreground transition shadow-lg"
      >
        Book your next visit (free)
      </Link>
      <p className="text-[0.65rem] text-muted-foreground text-center px-4 -mt-2">
        Members book without paying — choose a time, get an instant QR, redeem at the salon.
      </p>
    </div>
  );
}

function StaffCheckIn({ membershipId }: { membershipId: string }) {
  const [data, setData] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [customServiceByLabel, setCustomServiceByLabel] = useState<Record<string, string>>({});
  const [notesByLabel, setNotesByLabel] = useState<Record<string, string>>({});
  const [backdateByLabel, setBackdateByLabel] = useState<Record<string, string>>({});
  const [techByLabel, setTechByLabel] = useState<Record<string, string>>({});
  const [undoBusy, setUndoBusy] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTech, setEditTech] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editBusy, setEditBusy] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaffMembership(membershipId);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [membershipId]);

  useEffect(() => { load(); }, [load]);

  const doRedeem = useCallback(async (
    label: string,
    opts: { variantName?: string; notes?: string; force?: boolean; redeemedAt?: string; actorOverride?: string },
  ) => {
    const display = opts.variantName ?? label;
    const key = `${label}::${opts.variantName ?? "_"}`;
    setBusyKey(key);
    try {
      const { getActiveStaff, touchActiveStaff } = await import("@/lib/active-staff");
      const active = getActiveStaff();
      touchActiveStaff();
      const actorName = opts.actorOverride?.trim() || active?.name;
      const res = await redeemMembershipBenefit(membershipId, label, {
        variantName: opts.variantName,
        notes: opts.notes,
        force: opts.force,
        actorName,
        redeemedAt: opts.redeemedAt,
      });
      if (res.ok) {
        toast.success(opts.redeemedAt ? `Logged: ${display}` : `Redeemed: ${display}`);
        setExpandedLabel(null);
        setNotesByLabel((prev) => ({ ...prev, [label]: "" }));
        setCustomServiceByLabel((prev) => ({ ...prev, [label]: "" }));
        setBackdateByLabel((prev) => ({ ...prev, [label]: "" }));
        setTechByLabel((prev) => ({ ...prev, [label]: "" }));
        await load();
        return;
      }
      if (res.error === "outside_hours") {
        const msg = res.message ?? "Outside salon hours.";
        if (confirm(`${msg}\n\nOverride and redeem anyway?`)) {
          await doRedeem(label, { ...opts, force: true });
        }
        return;
      }
      toast.error(`Could not redeem: ${res.error}`);
    } finally {
      setBusyKey(null);
    }
  }, [membershipId, load]);

  // Convert a "YYYY-MM-DDTHH:mm" local datetime-local input into an ISO string.
  // Returns undefined when blank so server uses now().
  const localToIso = (local: string | undefined): string | undefined => {
    if (!local) return undefined;
    const d = new Date(local);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  const handleRedeem = async (label: string, variantName?: string) => {
    const display = variantName ?? label;
    const backdate = localToIso(backdateByLabel[label]);
    const tech = (techByLabel[label] || "").trim() || undefined;
    const when = backdate ? ` for ${new Date(backdate).toLocaleString()}` : "";
    const who = tech ? ` (tech: ${tech})` : "";
    if (!confirm(`Redeem 1 × "${display}"${when}${who}?`)) return;
    const notes = (notesByLabel[label] || "").trim() || undefined;
    await doRedeem(label, { variantName, notes, redeemedAt: backdate, actorOverride: tech });
  };

  const handleCustomRedeem = async (label: string) => {
    const custom = (customServiceByLabel[label] || "").trim();
    if (!custom) { toast.error("Type a service name first."); return; }
    const backdate = localToIso(backdateByLabel[label]);
    const tech = (techByLabel[label] || "").trim() || undefined;
    const when = backdate ? ` for ${new Date(backdate).toLocaleString()}` : "";
    const who = tech ? ` (tech: ${tech})` : "";
    if (!confirm(`Redeem 1 × "${custom}" (counts against ${label})${when}${who}?`)) return;
    const notes = (notesByLabel[label] || "").trim() || undefined;
    await doRedeem(label, { variantName: custom, notes, redeemedAt: backdate, actorOverride: tech });
  };

  const handleUndo = async (redemptionId: string, label: string) => {
    if (!confirm(`Undo this redemption of "${label}"? The visit will be removed.`)) return;
    setUndoBusy(redemptionId);
    try {
      const res = await undoMembershipRedemption(redemptionId);
      if (res.ok) {
        toast.success("Redemption undone");
        await load();
      } else {
        toast.error(`Could not undo: ${res.error}`);
      }
    } finally {
      setUndoBusy(null);
    }
  };

  // Convert ISO timestamp -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
  const isoToLocal = (iso: string): string => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startEdit = (r: StaffHistoryItem) => {
    setEditingId(r.id);
    setEditDate(isoToLocal(r.redeemed_at));
    setEditTech(r.redeemed_by_name ?? "");
    setEditNotes(r.notes ?? "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDate(""); setEditTech(""); setEditNotes("");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const iso = localToIso(editDate);
    if (!iso) { toast.error("Pick a valid date & time."); return; }
    setEditBusy(true);
    try {
      const res = await editMembershipRedemption(editingId, {
        redeemedAt: iso,
        redeemedByName: editTech.trim() || undefined,
        notes: editNotes.trim() ? editNotes.trim() : null,
      });
      if (res.ok) {
        toast.success("Redemption updated");
        cancelEdit();
        await load();
      } else {
        toast.error(`Could not update: ${res.error}`);
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `membership-photos/${membershipId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-media").upload(path, file, {
        cacheControl: "3600", upsert: true,
      });
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
      const { data: pub } = supabase.storage.from("site-media").getPublicUrl(path);
      const res = await setMembershipPhoto(membershipId, pub.publicUrl);
      if (!res.ok) { toast.error(`Could not save: ${res.error}`); return; }
      toast.success("Photo updated");
      await load();
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading || !data) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data.ok) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        Could not load: {data.error}
      </div>
    );
  }

  const m = data.membership;
  const isActive = m.status === "active" || m.status === "pending";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          <ShieldCheck className="w-3 h-3" /> Staff view
        </div>
        <div className="flex items-start gap-4 mb-3">
          <div className="relative shrink-0">
            {m.photoUrl ? (
              <img src={m.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <UserCircle2 className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow disabled:opacity-50"
              aria-label="Upload member photo"
              title="Upload member photo"
            >
              {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-serif text-2xl truncate">{m.name}</h2>
                <p className="text-sm text-muted-foreground">{m.tier}</p>
              </div>
              <span className={`text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded shrink-0 ${
                isActive ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              }`}>
                {m.status}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div><span className="opacity-60">Phone:</span> {m.phone}</div>
          <div><span className="opacity-60">Email:</span> <span className="break-all">{m.email}</span></div>
          <div><span className="opacity-60">Monthly:</span> {m.monthlyPrice}</div>
          <div><span className="opacity-60">Last visit:</span> {m.lastVisit ? new Date(m.lastVisit).toLocaleDateString() : "—"}</div>
        </div>
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mt-3 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Period resets {new Date(m.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-serif text-lg">This month's allowance</h3>
        {data.benefits.length === 0 && (
          <p className="text-sm text-muted-foreground">No benefits configured for this tier.</p>
        )}
        {data.benefits.map((b: StaffBenefit) => {
          const full = b.remaining === 0;
          const hasVariants = b.variants && b.variants.length > 0;
          const isExpanded = expandedLabel === b.label;
          const totalAllowed = b.totalAllowed ?? b.quantity;
          return (
            <div key={b.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{b.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.used} of {totalAllowed} used · <span className={full ? "text-destructive font-medium" : "text-foreground"}>{b.remaining} left</span>
                  </p>

                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasVariants && (
                    <button
                      disabled={full || busyKey === `${b.label}::_` || !isActive}
                      onClick={() => handleRedeem(b.label)}
                      className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    >
                      {busyKey === `${b.label}::_` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Redeem"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedLabel(isExpanded ? null : b.label)}
                    className="px-2 py-2 rounded-md border border-border text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:bg-muted"
                    disabled={full || !isActive}
                  >
                    {isExpanded ? "Close" : hasVariants ? "Choose" : "Options"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {hasVariants && (
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">Choose service</p>
                      <div className="flex flex-wrap gap-2">
                        {b.variants!.map((v) => {
                          const key = `${b.label}::${v}`;
                          return (
                            <button
                              key={v}
                              disabled={full || busyKey === key || !isActive}
                              onClick={() => handleRedeem(b.label, v)}
                              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 inline-flex items-center gap-1.5"
                            >
                              {busyKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Redeem · {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">
                      Other service (type to redeem)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customServiceByLabel[b.label] ?? ""}
                        onChange={(e) => setCustomServiceByLabel((p) => ({ ...p, [b.label]: e.target.value }))}
                        placeholder="e.g. Dazzle Dry Manicure"
                        className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                        maxLength={200}
                      />
                      <button
                        type="button"
                        disabled={full || busyKey === `${b.label}::${(customServiceByLabel[b.label] ?? "").trim()}` || !isActive}
                        onClick={() => handleCustomRedeem(b.label)}
                        className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                      >
                        Redeem
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">
                      Quick add-ons (optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ADD_ONS.map((addon) => {
                        const current = notesByLabel[b.label] ?? "";
                        const selected = noteHasAddOn(current, addon);
                        return (
                          <button
                            type="button"
                            key={addon}
                            onClick={() => setNotesByLabel((p) => ({ ...p, [b.label]: toggleAddOn(p[b.label] ?? "", addon) }))}
                            className={`text-[0.65rem] px-2 py-1 rounded-full border transition ${
                              selected
                                ? "bg-gold text-cream border-gold"
                                : "bg-background border-border text-muted-foreground hover:border-gold hover:text-foreground"
                            }`}
                          >
                            {selected ? "✓ " : "+ "}{addon}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={notesByLabel[b.label] ?? ""}
                      onChange={(e) => setNotesByLabel((p) => ({ ...p, [b.label]: e.target.value }))}
                      placeholder="e.g. polish change included"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">
                        Performed on (back-date)
                      </label>
                      <input
                        type="datetime-local"
                        value={backdateByLabel[b.label] ?? ""}
                        onChange={(e) => setBackdateByLabel((p) => ({ ...p, [b.label]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                      />
                      <p className="text-[0.65rem] text-muted-foreground mt-1">Leave blank to log right now.</p>
                    </div>
                    <div>
                      <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">
                        Performed by (tech)
                      </label>
                      <input
                        type="text"
                        value={techByLabel[b.label] ?? ""}
                        onChange={(e) => setTechByLabel((p) => ({ ...p, [b.label]: e.target.value }))}
                        placeholder="e.g. Johana"
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        maxLength={120}
                      />
                      <p className="text-[0.65rem] text-muted-foreground mt-1">Override the logged-in tech.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.history.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-serif text-lg">Visit history</h3>
            {data.history.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {showAllHistory ? "Show recent" : `Show all (${data.history.length})`}
              </button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {(showAllHistory ? data.history : data.history.slice(0, 8)).map((r: StaffHistoryItem) => {
              const ageMin = (Date.now() - new Date(r.redeemed_at).getTime()) / 60_000;
              const canUndo = ageMin <= 60;
              const isEditing = editingId === r.id;
              if (isEditing) {
                return (
                  <div key={r.id} className="px-4 py-3 text-xs space-y-2 bg-muted/40">
                    <div className="font-medium">{r.variant_name ?? r.benefit_label}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">Date & time</label>
                        <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs" />
                      </div>
                      <div>
                        <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">Tech</label>
                        <input type="text" value={editTech} onChange={(e) => setEditTech(e.target.value)} placeholder="e.g. Johana"
                          className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs" maxLength={120} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground block mb-1">Note</label>
                      <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs" maxLength={500} />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={cancelEdit} disabled={editBusy}
                        className="px-2.5 py-1.5 rounded-md border border-border text-[0.65rem] uppercase tracking-wider hover:bg-muted inline-flex items-center gap-1">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button type="button" onClick={saveEdit} disabled={editBusy}
                        className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[0.65rem] uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1">
                        {editBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={r.id} className="px-4 py-2.5 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium truncate">{r.variant_name ?? r.benefit_label}</span>
                      {r.variant_name && r.variant_name !== r.benefit_label && (
                        <span className="text-[0.65rem] text-muted-foreground truncate">({r.benefit_label})</span>
                      )}
                    </div>
                    <div className="text-[0.7rem] text-muted-foreground mt-0.5 truncate">
                      {r.redeemed_by_name ? `by ${r.redeemed_by_name}` : "—"}
                      {r.notes ? ` · "${r.notes}"` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(r.redeemed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                    <button type="button" onClick={() => startEdit(r)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Edit date / tech / note" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {canUndo && (
                      <button type="button" onClick={() => handleUndo(r.id, r.variant_name ?? r.benefit_label)} disabled={undoBusy === r.id}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        title="Undo this redemption" aria-label="Undo">
                        {undoBusy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[0.65rem] text-muted-foreground mt-2">
            Edit any visit's date, tech, or note anytime. Undo is available for 60 minutes after a redemption.
          </p>
        </div>
      )}
    </div>
  );
}
