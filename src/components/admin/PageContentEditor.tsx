import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save, Check } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  page_slug: string;
  section_key: string;
  value: Record<string, unknown>;
  display_order: number;
  visible: boolean;
};

export function PageContentEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("page_content").select("*").order("page_slug").order("display_order");
    setRows(
      ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: r.id as string,
        page_slug: r.page_slug as string,
        section_key: r.section_key as string,
        value: (r.value as Record<string, unknown>) ?? {},
        display_order: r.display_order as number,
        visible: r.visible as boolean,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRowValue = (id: string, value: Record<string, unknown>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const save = async (row: Row) => {
    setSaving(row.id);
    const { error } = await supabase
      .from("page_content")
      .update({ value: row.value as never, visible: row.visible })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success(`${row.page_slug} / ${row.section_key} saved`);
      setSavedAt({ ...savedAt, [row.id]: Date.now() });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground tracking-wider">
        Edit text and lists shown on the homepage and services page. Changes go live immediately after saving.
      </p>
      {rows.map((row) => (
        <div key={row.id} className="bg-cream border border-gold/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[0.6rem] tracking-[0.3em] uppercase text-gold">{row.page_slug}</p>
              <h3 className="font-serif text-xl">{row.section_key}</h3>
            </div>
            <button
              onClick={() => save(row)}
              disabled={saving === row.id}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-50"
            >
              {saving === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : Date.now() - (savedAt[row.id] ?? 0) < 1500 ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saving === row.id ? "Saving" : "Save"}
            </button>
          </div>

          <ValueEditor value={row.value} onChange={(v) => updateRowValue(row.id, v)} />
        </div>
      ))}
    </div>
  );
}

function ValueEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(value);
  return (
    <div className="space-y-4">
      {entries.map(([key, val]) => (
        <FieldEditor
          key={key}
          fieldKey={key}
          val={val}
          onChange={(newVal) => onChange({ ...value, [key]: newVal })}
        />
      ))}
    </div>
  );
}

function FieldEditor({
  fieldKey,
  val,
  onChange,
}: {
  fieldKey: string;
  val: unknown;
  onChange: (v: unknown) => void;
}) {
  // Array of objects → editable list
  if (Array.isArray(val) && val.every((x) => typeof x === "object" && x !== null && !Array.isArray(x))) {
    const items = val as Array<Record<string, unknown>>;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs tracking-[0.22em] uppercase text-muted-foreground">{fieldKey} ({items.length})</span>
          <button
            type="button"
            onClick={() => {
              const template = items[0]
                ? Object.fromEntries(Object.keys(items[0]).map((k) => [k, ""]))
                : { name: "", description: "" };
              onChange([...items, template]);
            }}
            className="inline-flex items-center gap-1 text-xs text-gold hover:underline tracking-wider uppercase"
          >
            <Plus className="w-3 h-3" /> Add item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-background border border-gold/20 p-3 relative">
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className={isLongField(k) || isImageField(k) ? "sm:col-span-2" : ""}>
                    <span className="block text-[0.55rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">{k}</span>
                    <FieldEditor
                      fieldKey={k}
                      val={v}
                      onChange={(newV) => {
                        const next = [...items];
                        next[idx] = { ...item, [k]: newV };
                        onChange(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // String field
  if (typeof val === "string") {
    if (isImageField(fieldKey)) {
      return <ImageField fieldKey={fieldKey} val={val} onChange={(v) => onChange(v)} />;
    }
    const isLong = val.length > 60 || isLongField(fieldKey);
    return (
      <label className="block">
        <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">{fieldKey}</span>
        {isLong ? (
          <textarea
            value={val}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
          />
        ) : (
          <input
            value={val}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
          />
        )}
      </label>
    );
  }

  // Fallback: JSON textarea
  return (
    <label className="block">
      <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">{fieldKey} (JSON)</span>
      <textarea
        defaultValue={JSON.stringify(val, null, 2)}
        onBlur={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            toast.error(`${fieldKey}: invalid JSON`);
          }
        }}
        rows={4}
        className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-xs font-mono"
      />
    </label>
  );
}

function isLongField(k: string) {
  const key = k.toLowerCase();
  return key.includes("description") || key.includes("desc") || key.includes("subhead") || key.includes("text") || key.includes("quote");
}

function isImageField(k: string) {
  const key = k.toLowerCase();
  return key.includes("image") || key.endsWith("_url") || key === "url" || key.includes("photo") || key.includes("picture");
}

function ImageField({ fieldKey, val, onChange }: { fieldKey: string; val: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `page-content/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("site-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("site-media").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <span className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground">{fieldKey}</span>
      <div className="flex gap-3 items-start">
        {val ? (
          <img src={val} alt="" className="w-20 h-20 object-cover border border-gold/30 rounded" />
        ) : (
          <div className="w-20 h-20 bg-background border border-dashed border-gold/30 rounded flex items-center justify-center text-[0.6rem] text-muted-foreground">none</div>
        )}
        <div className="flex-1 space-y-2">
          <input
            value={val}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload below"
            className="w-full px-3 py-2 bg-background border border-border focus:border-gold outline-none text-sm"
          />
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-gold hover:underline">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
          {val && (
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-600 hover:underline ml-3">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
