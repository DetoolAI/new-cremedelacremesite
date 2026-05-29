import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Clock, Sparkles } from "lucide-react";
import { BookingProvider, useBooking } from "@/components/BookingProvider";
import { supabase } from "@/integrations/supabase/client";
import { parsePriceCents } from "@/lib/booking";

const searchSchema = z.object({
 category: fallback(z.string(), "").default(""),
 open: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/book-now")({
 validateSearch: zodValidator(searchSchema),
 head: () => ({
 meta: [
 { title: "Book Your Appointment — Crème de la Crème Nails ®" },
 {
 name: "description",
 content:
 "Book your luxury nail appointment online. Browse our full menu by category and reserve your visit in seconds.",
 },
 { property: "og:title", content: "Book Your Appointment — Crème de la Crème Nails ®" },
 {
 property: "og:description",
 content: "Reserve your visit at Crème de la Crème Nails ® in seconds.",
 },
 ],
 }),
 component: BookNowPageWrapper,
});

type Service = { name: string; description?: string | null; duration?: string; price?: string };

type Category = {
 slug: string;
 emoji: string;
 name: string;
 services: Service[];
};

function sortComboServices(services: Service[]): Service[] {
 return [...services].sort((a, b) => {
  const priceDiff = (parsePriceCents(a.price) ?? Number.POSITIVE_INFINITY) - (parsePriceCents(b.price) ?? Number.POSITIVE_INFINITY);
  if (priceDiff !== 0) return priceDiff;
  const durationDiff = parseInt(a.duration ?? "0", 10) - parseInt(b.duration ?? "0", 10);
  if (durationDiff !== 0) return durationDiff;
  return a.name.localeCompare(b.name);
 });
}

const CATEGORIES: Category[] = [
 {
 slug: "manicures",
 emoji: "",
 name: "MANICURES",
 services: [],
 },
 {
 slug: "pedicures",
 emoji: "",
 name: "PEDICURES",
 services: [],
 },
 {
 slug: "mani-pedi-combos",
 emoji: "",
 name: "MANICURES & PEDICURES COMBOS",
 services: [],
 },
 {
 slug: "overlays-extensions",
 emoji: "",
 name: "OVERLAYS & EXTENSIONS (Builder, Poly, Hard, Soft Tips + Acrylics)",
 services: [],
 },
 {
 slug: "spa-manis-pedis",
 emoji: "",
 name: "SPA MANIS & PEDIS!",
 services: [],
 },
 {
 slug: "kids",
 emoji: "",
 name: "FOR KIDS / PARA NIÑOS — Under 10yrs",
 services: [],
 },
 {
 slug: "wax",
 emoji: "",
 name: "WAX",
 services: [],
 },
 {
 slug: "color-repairs",
 emoji: "",
 name: "COLOR ONLY / REPAIRS",
 services: [],
 },
 {
 slug: "other",
 emoji: "",
 name: "OTHER",
 services: [],
 },
];

const CATEGORY_EMOJI_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c.emoji]));

function getCategoryEmoji(slug: string, name: string) {
 const label = `${slug} ${name}`.toLowerCase();
 if (CATEGORY_EMOJI_BY_SLUG.has(slug)) return CATEGORY_EMOJI_BY_SLUG.get(slug)!;
 if (label.includes("pedi")) return "";
 if (label.includes("kid")) return "";
 if (label.includes("wax")) return "";
 if (label.includes("art")) return "✦";
 if (label.includes("add")) return "+";
 if (label.includes("polish")) return "◐";
 if (label.includes("russian")) return "‼️";
 return "";
}

function BookNowPageWrapper() {
 return (
 <BookingProvider>
 <BookNowPage />
 </BookingProvider>
 );
}

function BookNowPage() {
 const { category, open: openParam } = Route.useSearch();
 const { open } = useBooking();
 const [openSlug, setOpenSlug] = useState<string>(category || "");
 const [catalogCategories, setCatalogCategories] = useState<Category[]>(CATEGORIES);
 const [autoOpened, setAutoOpened] = useState(false);

 useEffect(() => {
 window.scrollTo({ top: 0, behavior: "smooth" });
 }, []);

 // Auto-open booking modal when ?open=1 is present (used from emails / quick links)
 useEffect(() => {
 if (openParam && !autoOpened) {
 setAutoOpened(true);
 open();
 }
 }, [openParam, autoOpened, open]);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 const [catsRes, svcRes] = await Promise.all([
 supabase.from("service_categories").select("id,name,slug").eq("active", true).order("display_order"),
 supabase
 .from("services")
 .select("name,description,duration_minutes,price_text,category_id")
 .eq("active", true)
 .order("display_order"),
 ]);

 if (cancelled) return;

 const slugById = new Map((catsRes.data ?? []).map((c) => [c.id, c.slug]));
 const servicesBySlug = new Map<string, Service[]>();

 for (const s of svcRes.data ?? []) {
 const slug = slugById.get(s.category_id);
 if (!slug) continue;
 const list = servicesBySlug.get(slug) ?? [];
 list.push({
 name: s.name,
 description: s.description,
 duration: `${s.duration_minutes} min`,
 price: s.price_text ?? undefined,
 });
 servicesBySlug.set(slug, list);
 }

  const nextCategories = (catsRes.data ?? []).map((c) => ({
 slug: c.slug,
 emoji: getCategoryEmoji(c.slug, c.name),
 name: c.name,
  services: c.slug.includes("combo") ? sortComboServices(servicesBySlug.get(c.slug) ?? []) : servicesBySlug.get(c.slug) ?? [],
 }));

 setCatalogCategories(nextCategories);
 setOpenSlug((current) => current || nextCategories[0]?.slug || "");
 })();

 return () => {
 cancelled = true;
 };
 }, []);

 // Auto-open & scroll to category from URL
 useEffect(() => {
 if (category) {
 setOpenSlug(category);
 const t = setTimeout(() => {
 const el = document.getElementById(`cat-${category}`);
 el?.scrollIntoView({ behavior: "smooth", block: "start" });
 }, 350);
 return () => clearTimeout(t);
 }
 }, [category]);

 const selectedCategory = useMemo(
 () => catalogCategories.find((c) => c.slug === openSlug) ?? catalogCategories[0] ?? null,
 [catalogCategories, openSlug]
 );

 return (
 <div className="min-h-screen bg-background overflow-hidden">
 {/* CINEMATIC VIDEO HERO — matches home page treatment */}
 <section className="relative h-[60vh] sm:h-[72vh] min-h-[420px] sm:min-h-[560px] w-full overflow-hidden">
 <div className="absolute inset-0">
 <video
 className="w-full h-full object-cover"
 src="/video/booknow-bg.mp4"
 autoPlay
 muted
 loop
 playsInline
 preload="auto"
 aria-hidden="true"
 />
 {/* Strong left-to-right dark gradient for text legibility */}
 <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/55 to-foreground/10" />
 {/* Soft bottom fade into page */}
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
 </div>

 {/* Top nav over hero */}
 <header className="relative z-20">
 <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
 <Link to="/" className="font-serif text-base sm:text-lg tracking-wide text-background drop-shadow-lg">
 Crème de la Crème Nails ®
 </Link>
 <Link
 to="/"
 className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-background/90 hover:text-gold-soft transition drop-shadow-lg"
 >
 <ArrowLeft className="w-3.5 h-3.5" /> Site
 </Link>
 </div>
 </header>

 {/* Hero copy */}
 <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-20 pb-16 sm:pb-24 w-full">
 <div className="max-w-2xl">
 <p className="tracking-[0.22em] sm:tracking-[0.28em] text-[0.65rem] sm:text-[0.7rem] uppercase text-gold-soft mb-4 sm:mb-6 animate-fade-in drop-shadow-lg">
 ✦ Private Booking Menu ✦
 </p>
 <h1 className="font-serif uppercase text-4xl sm:text-6xl md:text-7xl text-background leading-[0.95] animate-fade-up [text-shadow:0_2px_30px_rgba(0,0,0,0.45)]">
 Choose your<br />
 <span className="font-script normal-case italic text-gold-soft font-light">service.</span>
 </h1>
 <p className="mt-4 sm:mt-6 text-sm md:text-lg text-background/95 max-w-xl font-light leading-relaxed animate-fade-up delay-300 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]">
 Curated nail care, transparent pricing, and a smoother way to reserve your visit.
 </p>
 </div>
 </div>

 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[0.6rem] tracking-[0.3em] text-background/80 animate-shimmer z-10">
 BROWSE MENU
 </div>
 </section>

 <section className="relative px-4 sm:px-8 pt-8 sm:pt-14 pb-24 sm:pb-20">
 <div className="relative max-w-7xl mx-auto">
 <div className="grid lg:grid-cols-[0.9fr_1.35fr] gap-6 lg:gap-12 items-start">
 <aside className="min-w-0 lg:sticky lg:top-8 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="max-w-xl">
 <p className="tracking-[0.22em] sm:tracking-[0.28em] text-[0.65rem] sm:text-[0.7rem] uppercase text-primary mb-2 sm:mb-3">Categories</p>
 <h2 className="font-serif text-2xl sm:text-4xl leading-[1] tracking-tight text-foreground">
 Browse the menu.
 </h2>
 <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
 Tap a category to view services. Reserve in seconds — every nail tech can complete every service.
 </p>
 </div>

 {/* Mobile: horizontal scrolling chips so people instantly see services below */}
 <nav className="lg:hidden -mx-4 px-4 overflow-x-auto" aria-label="Service categories">
 <ul className="flex gap-2 pb-2 w-max">
 {catalogCategories.map((c) => {
 const isSelected = selectedCategory?.slug === c.slug;
 return (
 <li key={c.slug}>
 <button
 type="button"
 onClick={() => setOpenSlug(c.slug)}
 className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs uppercase tracking-[0.14em] transition ${
 isSelected
 ? "border-primary bg-primary text-primary-foreground"
 : "border-border bg-card text-foreground hover:border-primary/50"
 }`}
 >
 <span aria-hidden="true">{c.emoji}</span>
 <span className="max-w-[10rem] truncate">{c.name}</span>
 </button>
 </li>
 );
 })}
 </ul>
 </nav>

 {/* Desktop / tablet: full vertical list */}
 <nav className="hidden lg:grid grid-cols-1 gap-3" aria-label="Service categories">
 {catalogCategories.map((c, index) => {
 const isSelected = selectedCategory?.slug === c.slug;
 return (
 <button
 key={c.slug}
 type="button"
 onClick={() => setOpenSlug(c.slug)}
 className={`group text-left border transition-all duration-300 px-4 py-4 rounded-sm ${
 isSelected
 ? "border-primary bg-primary text-primary-foreground shadow-luxe"
 : "border-border/50 bg-card/70 hover:border-primary/50 hover:bg-secondary/60"
 }`}
 >
 <span className="flex items-center justify-between gap-4">
 <span className="flex items-center gap-3 min-w-0">
 <span className={`text-[0.65rem] font-medium tabular-nums ${isSelected ? "text-primary-foreground/80" : "text-primary"}`}>
 {String(index + 1).padStart(2, "0")}
 </span>
 <span className="text-sm font-medium uppercase tracking-[0.13em] truncate">
 {c.name}
 </span>
 </span>
 <span className="text-lg shrink-0" aria-hidden="true">{c.emoji}</span>
 </span>
 </button>
 );
 })}
 </nav>
 </aside>

 <main className="relative min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
 {selectedCategory && (
 <section id={`cat-${selectedCategory.slug}`} className="scroll-mt-24">
 <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border/60 pb-5">
 <div>
 <p className="text-xs uppercase tracking-[0.24em] text-primary mb-2">
 {selectedCategory.services.length} selections
 </p>
 <h2 className="font-serif text-2xl sm:text-5xl text-foreground leading-tight break-words">
 {selectedCategory.name}
 </h2>
 </div>
 <Sparkles className="w-7 h-7 text-primary" aria-hidden="true" />
 </div>

 {selectedCategory.services.length > 0 ? (
 <div className="grid gap-4">
 {selectedCategory.services.map((s) => (
 <article
 key={s.name}
 className="group relative overflow-hidden border border-border/50 bg-card/80 p-5 sm:p-6 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-luxe rounded-sm"
 >
 <div className="absolute left-0 top-0 h-full w-1 bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100" />
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
 <div className="min-w-0 flex-1">
 <h3 className="text-lg sm:text-xl font-medium text-foreground leading-snug">
 {s.name}
 </h3>
 {s.description && (
 <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
 {s.description}
 </p>
 )}
 <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
 {s.duration && (
 <span className="inline-flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5" /> {s.duration}
 </span>
 )}
 {s.price && <span className="text-primary font-semibold">{s.price}</span>}
 </div>
 </div>
 <button
 type="button"
 onClick={() => open({ serviceName: s.name, categorySlug: selectedCategory.slug })}
 className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[0.68rem] tracking-[0.18em] sm:tracking-[0.22em] uppercase rounded-full hover:bg-foreground transition shrink-0"
 >
 Reserve
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </article>
 ))}
 </div>
 ) : (
 <div className="border border-border/50 bg-card/80 p-8 text-center shadow-soft rounded-sm">
 <p className="text-sm text-muted-foreground">Services are being updated for this section.</p>
 </div>
 )}
 </section>
 )}

 <p className="mt-8 text-center text-xs text-muted-foreground italic">
 Don't see what you need?{" "}
 <Link to="/contact" className="underline hover:text-foreground">
 Contact us
 </Link>{" "}
 and we'll take care of it.
 </p>
 </main>
 </div>
 </div>
 </section>
 </div>
 );
}
