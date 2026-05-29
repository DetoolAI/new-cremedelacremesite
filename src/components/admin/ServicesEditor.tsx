import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch, adminFetchJson } from "@/lib/admin-fetch";
import { Loader2, Plus, Trash2, GripVertical, Save, Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

type SquareDiffEntry = {
 status: "added" | "updated" | "removed" | "unchanged";
 square_name?: string;
 square_duration_minutes?: number;
 square_price_text?: string | null;
 db_id?: string;
 db_name?: string;
 db_duration_minutes?: number;
};

type Category = {
 id: string;
 name: string;
 slug: string;
 description: string | null;
 display_order: number;
 active: boolean;
};

type Service = {
 id: string;
 category_id: string;
 name: string;
 description: string | null;
 duration_minutes: number;
 price_text: string | null;
 member_price_text: string | null;
 display_order: number;
 active: boolean;
};

export function ServicesEditor() {
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [cats, setCats] = useState<Category[]>([]);
 const [services, setServices] = useState<Service[]>([]);
 const [activeCat, setActiveCat] = useState<string | null>(null);
 const [dirty, setDirty] = useState<Set<string>>(new Set());
 const [deletedSvc, setDeletedSvc] = useState<string[]>([]);
 const [deletedCat, setDeletedCat] = useState<string[]>([]);
 const [savedAt, setSavedAt] = useState(0);
 const [syncDiff, setSyncDiff] = useState<SquareDiffEntry[] | null>(null);
 const [syncing, setSyncing] = useState(false);
 const [testingCal, setTestingCal] = useState(false);

 const testSquareCalendar = async () => {
 setTestingCal(true);
 try {
 const res = await adminFetchJson("/api/public/test-square-calendar", {
 method: "POST",
 body: JSON.stringify({}),
 });
 const json = await res.json();
 if (!res.ok || !json.success) {
 throw new Error(json?.error || "Failed");
 }
 toast.success(` Pushed to Square calendar (${json.scheduledFor}). Booking ID: ${json.squareBookingId.slice(0, 8)}…`, { duration: 8000 });
 } catch (e) {
 toast.error(`Square calendar test failed: ${e instanceof Error ? e.message : "Unknown error"}`, { duration: 10000 });
 } finally {
 setTestingCal(false);
 }
 };

 const previewSync = async () => {
 setSyncing(true);
 try {
 const res = await adminFetch("/api/public/sync-square-services", { method: "POST" });
 const json = await res.json();
 if (!res.ok) throw new Error(json?.error || "Sync failed");
 setSyncDiff(json.diff as SquareDiffEntry[]);
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "Sync failed");
 } finally {
 setSyncing(false);
 }
 };

 const load = useCallback(async () => {
 setLoading(true);
 const [c, s] = await Promise.all([
 supabase.from("service_categories").select("*").order("display_order"),
 supabase.from("services").select("*").order("display_order"),
 ]);
 setCats((c.data as Category[]) ?? []);
 setServices((s.data as Service[]) ?? []);
 if ((c.data ?? []).length > 0) setActiveCat((c.data as Category[])[0].id);
 setDirty(new Set());
 setDeletedSvc([]);
 setDeletedCat([]);
 setLoading(false);
 }, []);

 useEffect(() => {
 load();
 }, [load]);

 const markDirty = (id: string) => {
 setDirty((d) => new Set(d).add(id));
 };

 const updateCat = (id: string, patch: Partial<Category>) => {
 setCats((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
 markDirty(`cat:${id}`);
 };

 const updateSvc = (id: string, patch: Partial<Service>) => {
 setServices((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
 markDirty(`svc:${id}`);
 };

 const addCategory = () => {
 const id = `new-${crypto.randomUUID()}`;
 const newCat: Category = {
 id,
 name: "New Category",
 slug: `category-${Date.now()}`,
 description: "",
 display_order: cats.length + 1,
 active: true,
 };
 setCats([...cats, newCat]);
 setActiveCat(id);
 markDirty(`cat:${id}`);
 };

 const addService = () => {
 if (!activeCat) return;
 const id = `new-${crypto.randomUUID()}`;
 const inCat = services.filter((s) => s.category_id === activeCat);
 const newSvc: Service = {
 id,
 category_id: activeCat,
 name: "New Service",
 description: "",
 duration_minutes: 60,
 price_text: "",
 member_price_text: "",
 display_order: inCat.length + 1,
 active: true,
 };
 setServices([...services, newSvc]);
 markDirty(`svc:${id}`);
 };

 const deleteCategory = (id: string) => {
 if (!confirm("Delete this category and all its services?")) return;
 setCats((cs) => cs.filter((c) => c.id !== id));
 setServices((ss) => ss.filter((s) => s.category_id !== id));
 if (!id.startsWith("new-")) setDeletedCat((d) => [...d, id]);
 if (activeCat === id) setActiveCat(cats.find((c) => c.id !== id)?.id ?? null);
 };

 const deleteService = (id: string) => {
 if (!confirm("Delete this service?")) return;
 setServices((ss) => ss.filter((s) => s.id !== id));
 if (!id.startsWith("new-")) setDeletedSvc((d) => [...d, id]);
 };

 const saveAll = async () => {
 setSaving(true);
 try {
 // Delete removed
 if (deletedSvc.length > 0) {
 await supabase.from("services").delete().in("id", deletedSvc);
 }
 if (deletedCat.length > 0) {
 await supabase.from("service_categories").delete().in("id", deletedCat);
 }

 // Upsert categories
 const catsToInsert = cats
 .filter((c) => c.id.startsWith("new-"))
 .map(({ id: _id, ...c }) => c);
 const catsToUpdate = cats.filter((c) => !c.id.startsWith("new-") && dirty.has(`cat:${c.id}`));

 const idMap = new Map<string, string>();
 if (catsToInsert.length > 0) {
 const { data, error } = await supabase
 .from("service_categories")
 .insert(catsToInsert)
 .select();
 if (error) throw error;
 // Match new IDs back by slug+name to local IDs
 const local = cats.filter((c) => c.id.startsWith("new-"));
 (data ?? []).forEach((row, idx) => {
 idMap.set(local[idx].id, row.id);
 });
 }
 for (const c of catsToUpdate) {
 const { id: _id, ...patch } = c;
 const { error } = await supabase.from("service_categories").update(patch).eq("id", c.id);
 if (error) throw error;
 }

 // Upsert services (remap any pending new-category-id references)
 const svcsToInsert = services
 .filter((s) => s.id.startsWith("new-"))
 .map(({ id: _id, ...s }) => ({
 ...s,
 category_id: idMap.get(s.category_id) ?? s.category_id,
 }));
 const svcsToUpdate = services.filter((s) => !s.id.startsWith("new-") && dirty.has(`svc:${s.id}`));

 if (svcsToInsert.length > 0) {
 const { error } = await supabase.from("services").insert(svcsToInsert);
 if (error) throw error;
 }
 for (const s of svcsToUpdate) {
 const { id: _id, ...patch } = s;
 const realPatch = { ...patch, category_id: idMap.get(patch.category_id) ?? patch.category_id };
 const { error } = await supabase.from("services").update(realPatch).eq("id", s.id);
 if (error) throw error;
 }

 toast.success("Services saved");
 setSavedAt(Date.now());
 await load();
 } catch (e) {
 const msg = e instanceof Error ? e.message : "Save failed";
 toast.error(msg);
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
 }

 const activeServices = services
 .filter((s) => s.category_id === activeCat)
 .sort((a, b) => a.display_order - b.display_order);

 return (
 <div className="space-y-4">
 {/* Save bar */}
 <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-gold/20 -mx-6 px-6 py-3 flex items-center justify-between">
 <div className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
 {dirty.size + deletedSvc.length + deletedCat.length > 0
 ? `${dirty.size + deletedSvc.length + deletedCat.length} unsaved change${dirty.size + deletedSvc.length + deletedCat.length === 1 ? "" : "s"}`
 : "All changes saved"}
 </div>
 <div className="flex gap-2">
 <button
 onClick={testSquareCalendar}
 disabled={testingCal}
 className="inline-flex items-center gap-2 px-3 py-2 border border-gold/40 text-gold hover:bg-gold/10 text-xs tracking-[0.18em] uppercase disabled:opacity-40"
 title="Push a fake test booking to your Square Appointments calendar (no payment, no DB row)"
 >
 {testingCal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
 Test Square calendar
 </button>
 <button
 onClick={saveAll}
 disabled={saving || (dirty.size === 0 && deletedSvc.length === 0 && deletedCat.length === 0)}
 className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-40"
 >
 {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : Date.now() - savedAt < 1500 ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
 {saving ? "Saving" : "Save all"}
 </button>
 </div>
 </div>

 {syncDiff && (
 <SquareSyncModal
 diff={syncDiff}
 categories={cats.filter((c) => !c.id.startsWith("new-"))}
 onClose={() => setSyncDiff(null)}
 onApplied={() => { setSyncDiff(null); load(); }}
 />
 )}

 <div className="grid md:grid-cols-[260px,1fr] gap-6">
 {/* Categories sidebar */}
 <aside>
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-xs tracking-[0.22em] uppercase text-muted-foreground">Categories</h4>
 <button onClick={addCategory} className="p-1 hover:text-gold" title="Add category">
 <Plus className="w-4 h-4" />
 </button>
 </div>
 <div className="space-y-1">
 {cats.sort((a, b) => a.display_order - b.display_order).map((c) => (
 <button
 key={c.id}
 onClick={() => setActiveCat(c.id)}
 className={`w-full text-left px-3 py-2 text-sm border-l-2 transition ${
 activeCat === c.id ? "border-gold bg-cream" : "border-transparent hover:bg-cream/50"
 } ${!c.active ? "opacity-50" : ""}`}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="truncate">{c.name}</span>
 <span className="text-xs text-muted-foreground">
 {services.filter((s) => s.category_id === c.id).length}
 </span>
 </div>
 </button>
 ))}
 </div>
 </aside>

 {/* Active category editor */}
 <div className="space-y-6">
 {activeCat && cats.find((c) => c.id === activeCat) && (
 <CategoryFields
 cat={cats.find((c) => c.id === activeCat)!}
 onUpdate={(patch) => updateCat(activeCat, patch)}
 onDelete={() => deleteCategory(activeCat)}
 />
 )}

 {/* Services */}
 {activeCat && (
 <div>
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-xs tracking-[0.22em] uppercase text-muted-foreground">
 Services ({activeServices.length})
 </h4>
 <button
 onClick={addService}
 className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-gold hover:underline"
 >
 <Plus className="w-3 h-3" /> Add service
 </button>
 </div>
 <div className="space-y-3">
 {activeServices.map((s) => (
 <ServiceCard
 key={s.id}
 svc={s}
 onUpdate={(patch) => updateSvc(s.id, patch)}
 onDelete={() => deleteService(s.id)}
 />
 ))}
 {activeServices.length === 0 && (
 <p className="text-sm text-muted-foreground py-8 text-center bg-cream border border-gold/20">
 No services in this category yet.
 </p>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

function CategoryFields({
 cat,
 onUpdate,
 onDelete,
}: {
 cat: Category;
 onUpdate: (patch: Partial<Category>) => void;
 onDelete: () => void;
}) {
 return (
 <div className="bg-cream border border-gold/20 p-4 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="font-serif text-lg">Category settings</h3>
 <button onClick={onDelete} className="text-red-600 hover:text-red-800" title="Delete category">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 <div className="grid sm:grid-cols-2 gap-3">
 <Input label="Name" value={cat.name} onChange={(v) => onUpdate({ name: v })} />
 <Input label="Slug" value={cat.slug} onChange={(v) => onUpdate({ slug: v })} />
 <Input label="Description" value={cat.description ?? ""} onChange={(v) => onUpdate({ description: v })} className="sm:col-span-2" />
 <Input label="Display order" type="number" value={String(cat.display_order)} onChange={(v) => onUpdate({ display_order: Number(v) || 0 })} />
 <Toggle label="Visible on site" value={cat.active} onChange={(v) => onUpdate({ active: v })} />
 </div>
 </div>
 );
}

function ServiceCard({
 svc,
 onUpdate,
 onDelete,
}: {
 svc: Service;
 onUpdate: (patch: Partial<Service>) => void;
 onDelete: () => void;
}) {
 return (
 <div className="bg-cream border border-gold/20 p-4">
 <div className="flex items-start gap-3">
 <GripVertical className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
 <div className="flex-1 grid sm:grid-cols-2 gap-3">
 <Input label="Name" value={svc.name} onChange={(v) => onUpdate({ name: v })} className="sm:col-span-2" />
 <Input label="Description" value={svc.description ?? ""} onChange={(v) => onUpdate({ description: v })} className="sm:col-span-2" textarea />
 <Input label="Price" value={svc.price_text ?? ""} onChange={(v) => onUpdate({ price_text: v })} placeholder="$45" />
 <Input label="Member price" value={svc.member_price_text ?? ""} onChange={(v) => onUpdate({ member_price_text: v })} placeholder="$38" />
 <Input label="Duration (min)" type="number" value={String(svc.duration_minutes)} onChange={(v) => onUpdate({ duration_minutes: Number(v) || 0 })} />
 <Input label="Display order" type="number" value={String(svc.display_order)} onChange={(v) => onUpdate({ display_order: Number(v) || 0 })} />
 <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-gold/10">
 <Toggle label="Visible" value={svc.active} onChange={(v) => onUpdate({ active: v })} />
 <button onClick={onDelete} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-xs tracking-wider uppercase">
 <Trash2 className="w-3 h-3" /> Delete
 </button>
 </div>
 </div>
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

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
 return (
 <label className="inline-flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-gold" />
 <span className="text-xs tracking-[0.18em] uppercase text-muted-foreground">{label}</span>
 </label>
 );
}

function SquareSyncModal({
 diff,
 categories,
 onClose,
 onApplied,
}: {
 diff: SquareDiffEntry[];
 categories: Category[];
 onClose: () => void;
 onApplied: () => void;
}) {
 const added = diff.filter((d) => d.status === "added");
 const updated = diff.filter((d) => d.status === "updated");
 const removed = diff.filter((d) => d.status === "removed");
 const unchanged = diff.filter((d) => d.status === "unchanged");

 // Selection state — default: select all added + updated, none of removed
 const [selectAdded, setSelectAdded] = useState<Set<number>>(() => new Set(added.map((_, i) => i)));
 const [selectUpdated, setSelectUpdated] = useState<Set<number>>(() => new Set(updated.map((_, i) => i)));
 const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
 const [applying, setApplying] = useState(false);

 const toggle = (set: Set<number>, setSet: (s: Set<number>) => void, idx: number) => {
 const next = new Set(set);
 if (next.has(idx)) next.delete(idx);
 else next.add(idx);
 setSet(next);
 };

 const apply = async () => {
 setApplying(true);
 try {
 const to_add = added
 .filter((_, i) => selectAdded.has(i))
 .map((d) => ({
 name: d.square_name!,
 duration_minutes: d.square_duration_minutes ?? 60,
 price_text: d.square_price_text ?? null,
 }));
 const to_update = updated
 .filter((_, i) => selectUpdated.has(i))
 .map((d) => ({ db_id: d.db_id!, duration_minutes: d.square_duration_minutes ?? 60 }));

 const res = await adminFetchJson("/api/public/sync-square-services-apply", {
 method: "POST",
 body: JSON.stringify({ category_id: categoryId, to_add, to_update }),
 });
 const json = await res.json();
 if (!res.ok) throw new Error(json?.error || "Apply failed");
 toast.success(`Applied: ${json.added} added, ${json.updated} updated`);
 onApplied();
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "Apply failed");
 } finally {
 setApplying(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
 <div className="bg-background border border-gold/30 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
 <div className="sticky top-0 bg-background border-b border-gold/20 p-4 flex items-center justify-between">
 <div>
 <h3 className="font-serif text-2xl">Square catalog sync</h3>
 <p className="text-xs text-muted-foreground tracking-wider mt-1">
 {added.length} new · {updated.length} duration changes · {removed.length} only-on-website · {unchanged.length} unchanged
 </p>
 </div>
 <button onClick={onClose} className="p-2 hover:text-gold"><X className="w-4 h-4" /></button>
 </div>

 <div className="p-4 space-y-6">
 {added.length > 0 && (
 <section>
 <h4 className="text-xs tracking-[0.22em] uppercase text-gold mb-2">New services to add ({added.length})</h4>
 <p className="text-xs text-muted-foreground mb-3">These exist in Square but not on your website. Uncheck any you don't want.</p>
 <label className="block text-[0.6rem] tracking-[0.22em] uppercase text-muted-foreground mb-1">Add new services to category:</label>
 <select
 value={categoryId}
 onChange={(e) => setCategoryId(e.target.value)}
 className="w-full px-3 py-2 bg-background border border-border text-sm mb-3"
 >
 {categories.map((c) => (
 <option key={c.id} value={c.id}>{c.name}</option>
 ))}
 </select>
 <div className="space-y-1 bg-cream border border-gold/20">
 {added.map((d, i) => (
 <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-background/50 cursor-pointer border-b border-gold/10 last:border-0">
 <input type="checkbox" checked={selectAdded.has(i)} onChange={() => toggle(selectAdded, setSelectAdded, i)} className="accent-gold" />
 <span className="flex-1 text-sm">{d.square_name}</span>
 <span className="text-xs text-muted-foreground">{d.square_duration_minutes} min</span>
 {d.square_price_text && <span className="text-xs text-gold w-12 text-right">{d.square_price_text}</span>}
 </label>
 ))}
 </div>
 </section>
 )}

 {updated.length > 0 && (
 <section>
 <h4 className="text-xs tracking-[0.22em] uppercase text-gold mb-2">Duration changes ({updated.length})</h4>
 <p className="text-xs text-muted-foreground mb-3">Square has a different duration than the website. Check to update.</p>
 <div className="space-y-1 bg-cream border border-gold/20">
 {updated.map((d, i) => (
 <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-background/50 cursor-pointer border-b border-gold/10 last:border-0">
 <input type="checkbox" checked={selectUpdated.has(i)} onChange={() => toggle(selectUpdated, setSelectUpdated, i)} className="accent-gold" />
 <span className="flex-1 text-sm">{d.db_name}</span>
 <span className="text-xs text-muted-foreground line-through">{d.db_duration_minutes} min</span>
 <span className="text-xs text-gold">→ {d.square_duration_minutes} min</span>
 </label>
 ))}
 </div>
 </section>
 )}

 {removed.length > 0 && (
 <section>
 <h4 className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Only on website ({removed.length})</h4>
 <p className="text-xs text-muted-foreground mb-3">These are on the website but not in Square. Not auto-deleted — remove manually below if needed.</p>
 <div className="bg-cream/50 border border-gold/10 p-3">
 <ul className="text-xs text-muted-foreground space-y-1">
 {removed.map((d, i) => <li key={i}>• {d.db_name} ({d.db_duration_minutes} min)</li>)}
 </ul>
 </div>
 </section>
 )}
 </div>

 <div className="sticky bottom-0 bg-background border-t border-gold/20 p-4 flex justify-between items-center">
 <p className="text-xs text-muted-foreground">
 Will apply: {selectAdded.size} new + {selectUpdated.size} updates
 </p>
 <div className="flex gap-2">
 <button onClick={onClose} className="px-4 py-2 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground">Cancel</button>
 <button
 onClick={apply}
 disabled={applying || (selectAdded.size === 0 && selectUpdated.size === 0)}
 className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase disabled:opacity-50"
 >
 {applying && <Loader2 className="w-3 h-3 animate-spin" />}
 Apply changes
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

