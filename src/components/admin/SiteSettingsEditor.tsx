import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Business = { name?: string; tagline?: string; short_description?: string; logo_url?: string | null };
type Contact = {
  email?: string;
  phone?: string;
  phone_link?: string;
  address_line1?: string;
  address_line2?: string;
  map_url?: string;
};
type Hours = {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  note?: string;
};
type Social = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linktree?: string;
};

const DAYS: Array<keyof Hours> = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function SiteSettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [business, setBusiness] = useState<Business>({});
  const [contact, setContact] = useState<Contact>({});
  const [hours, setHours] = useState<Hours>({});
  const [social, setSocial] = useState<Social>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map = new Map((data ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
      setBusiness((map.get("business") as Business) ?? {});
      setContact((map.get("contact") as Contact) ?? {});
      setHours((map.get("hours") as Hours) ?? {});
      setSocial((map.get("social") as Social) ?? {});
      setLoading(false);
    })();
  }, []);

  const save = async (key: string, value: object) => {
    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: value as never })
      .eq("key", key);
    setSaving(null);
    if (error) {
      toast.error(`Failed to save ${key}: ${error.message}`);
    } else {
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} saved`);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* BUSINESS */}
      <Section title="Business" onSave={() => save("business", business)} saving={saving === "business"}>
        <Field label="Name" value={business.name ?? ""} onChange={(v) => setBusiness({ ...business, name: v })} />
        <Field label="Tagline" value={business.tagline ?? ""} onChange={(v) => setBusiness({ ...business, tagline: v })} />
        <Field label="Short description" value={business.short_description ?? ""} onChange={(v) => setBusiness({ ...business, short_description: v })} textarea />
      </Section>

      {/* CONTACT */}
      <Section title="Contact" onSave={() => save("contact", contact)} saving={saving === "contact"}>
        <Field label="Email" value={contact.email ?? ""} onChange={(v) => setContact({ ...contact, email: v })} />
        <Field label="Phone (display)" value={contact.phone ?? ""} onChange={(v) => setContact({ ...contact, phone: v })} />
        <Field label="Phone (tel: link)" value={contact.phone_link ?? ""} onChange={(v) => setContact({ ...contact, phone_link: v })} />
        <Field label="Address line 1" value={contact.address_line1 ?? ""} onChange={(v) => setContact({ ...contact, address_line1: v })} />
        <Field label="Address line 2" value={contact.address_line2 ?? ""} onChange={(v) => setContact({ ...contact, address_line2: v })} />
        <Field label="Google Maps URL" value={contact.map_url ?? ""} onChange={(v) => setContact({ ...contact, map_url: v })} />
      </Section>

      {/* HOURS */}
      <Section title="Business hours" onSave={() => save("hours", hours)} saving={saving === "hours"}>
        {DAYS.map((day) => (
          <Field
            key={day}
            label={day.charAt(0).toUpperCase() + day.slice(1)}
            value={hours[day] ?? ""}
            onChange={(v) => setHours({ ...hours, [day]: v })}
          />
        ))}
        <Field label="Banner note" value={hours.note ?? ""} onChange={(v) => setHours({ ...hours, note: v })} />
      </Section>

      {/* SOCIAL */}
      <Section title="Social links" onSave={() => save("social", social)} saving={saving === "social"}>
        <Field label="Instagram" value={social.instagram ?? ""} onChange={(v) => setSocial({ ...social, instagram: v })} />
        <Field label="Facebook" value={social.facebook ?? ""} onChange={(v) => setSocial({ ...social, facebook: v })} />
        <Field label="YouTube" value={social.youtube ?? ""} onChange={(v) => setSocial({ ...social, youtube: v })} />
        <Field label="Linktree" value={social.linktree ?? ""} onChange={(v) => setSocial({ ...social, linktree: v })} />
      </Section>

      {/* SQUARE SYNC */}
      <SyncSquareSection />
    </div>
  );
}

function Section({
  title,
  children,
  onSave,
  saving,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  const [justSaved, setJustSaved] = useState(false);
  const handleSave = async () => {
    await onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };
  return (
    <div className="bg-cream border border-gold/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl">{title}</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : justSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
          {saving ? "Saving" : justSaved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function SyncSquareSection() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/public/sync-services-to-square", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Sync failed");
      }
      toast.success(`Synced ${json.createdCount} services to Square (${json.skippedCount} skipped, ${json.failedCount} failed)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-cream border border-gold/20 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl">Square Integration</h3>
          <p className="text-xs text-muted-foreground mt-1">Push active services to your Square catalog.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {syncing ? "Syncing..." : "Sync Services to Square"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block sm:col-span-2 last:sm:col-span-2">
      <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
        />
      )}
    </label>
  );
}
