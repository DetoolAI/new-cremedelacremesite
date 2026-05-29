import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save, Check } from "lucide-react";
import { toast } from "sonner";

type Staff = {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  display_order: number;
  active: boolean;
  work_days: number[];
  square_team_member_id: string | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StaffEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("staff").select("*").order("display_order");
    setStaff((data as Staff[]) ?? []);
    setDirty(new Set());
    setDeleted([]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDirty = (id: string) => setDirty((d) => new Set(d).add(id));

  const update = (id: string, patch: Partial<Staff>) => {
    setStaff((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    markDirty(id);
  };

  const add = () => {
    const id = `new-${crypto.randomUUID()}`;
    setStaff([
      ...staff,
      {
        id,
        name: "New Technician",
        bio: "",
        image_url: null,
        display_order: staff.length + 1,
        active: true,
        work_days: [0, 1, 2, 3, 4, 5, 6],
        square_team_member_id: null,
      },
    ]);
    markDirty(id);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this technician?")) return;
    setStaff((s) => s.filter((x) => x.id !== id));
    if (!id.startsWith("new-")) setDeleted((d) => [...d, id]);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (deleted.length > 0) {
        await supabase.from("staff").delete().in("id", deleted);
      }
      const toInsert = staff.filter((s) => s.id.startsWith("new-")).map(({ id: _id, ...s }) => s);
      const toUpdate = staff.filter((s) => !s.id.startsWith("new-") && dirty.has(s.id));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("staff").insert(toInsert);
        if (error) throw error;
      }
      for (const s of toUpdate) {
        const { id: _id, ...patch } = s;
        const { error } = await supabase.from("staff").update(patch).eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Staff saved");
      setSavedAt(Date.now());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;

  const unsaved = dirty.size + deleted.length;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-gold/20 -mx-6 px-6 py-3 flex items-center justify-between">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
          {unsaved > 0 ? `${unsaved} unsaved change${unsaved === 1 ? "" : "s"}` : "All changes saved"}
        </div>
        <div className="flex gap-2">
          <button onClick={add} className="inline-flex items-center gap-2 px-3 py-2 border border-gold text-gold text-xs tracking-[0.18em] uppercase hover:bg-gold/10">
            <Plus className="w-3 h-3" /> Add technician
          </button>
          <button
            onClick={saveAll}
            disabled={saving || unsaved === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : Date.now() - savedAt < 1500 ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saving ? "Saving" : "Save all"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {staff.sort((a, b) => a.display_order - b.display_order).map((s) => (
          <div key={s.id} className={`bg-cream border border-gold/20 p-4 ${!s.active ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name" value={s.name} onChange={(v) => update(s.id, { name: v })} className="col-span-2" />
              <Input label="Bio" value={s.bio ?? ""} onChange={(v) => update(s.id, { bio: v })} className="col-span-2" textarea />
              <Input label="Photo URL" value={s.image_url ?? ""} onChange={(v) => update(s.id, { image_url: v || null })} className="col-span-2" placeholder="https://…" />
              <Input
                label="Square team member ID"
                value={s.square_team_member_id ?? ""}
                onChange={(v) => update(s.id, { square_team_member_id: v.trim() || null })}
                className="col-span-2"
                placeholder="TM..."
              />
              <Input label="Display order" type="number" value={String(s.display_order)} onChange={(v) => update(s.id, { display_order: Number(v) || 0 })} />
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={s.active} onChange={(e) => update(s.id, { active: e.target.checked })} className="accent-gold" />
                  <span className="text-xs tracking-[0.18em] uppercase text-muted-foreground">Visible</span>
                </label>
              </div>

              <div className="col-span-2">
                <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">Working days</span>
                <div className="flex flex-wrap gap-1">
                  {DAY_LABELS.map((label, idx) => {
                    const on = s.work_days.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = on ? s.work_days.filter((d) => d !== idx) : [...s.work_days, idx];
                          update(s.id, { work_days: next.sort() });
                        }}
                        className={`px-2 py-1 text-xs border tracking-wider ${
                          on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gold"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2 flex justify-end pt-2 border-t border-gold/10">
                <button onClick={() => remove(s.id)} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-xs tracking-wider uppercase">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  textarea,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
        />
      )}
    </label>
  );
}
