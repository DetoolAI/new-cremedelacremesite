import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Link as LinkIcon, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { BookingProvider, useBooking } from "@/components/BookingProvider";
import { usePageContent } from "@/hooks/usePageContent";

const contactFallback = {
 hero: {
 eyebrow: "RESERVE",
 heading_part1: "Request your",
 heading_part2: "appointment.",
 description: "Choose your service, technician, and time. We'll lock it in with a $20 deposit and confirm by phone or text.",
 },
 cta: {
 icon_heading: "Book in under a minute",
 icon_subtext: "Pick a category, choose your service, select your technician, and reserve your time slot — all in one flow.",
 button_label: "Start Booking",
 },
};

type ContactSearch = { service?: string };

export const Route = createFileRoute("/contact")({
 validateSearch: (search: Record<string, unknown>): ContactSearch => {
 const service = typeof search.service === "string" ? search.service : undefined;
 return service ? { service } : {};
 },
 head: () => ({
 meta: [
 { title: "Request Appointment & Contact — Crème de la Crème Nails ®" },
 { name: "description", content: "Request your luxury nail appointment. Pick your service, technician, and time. Contact, hours, and location for Crème de la Crème Nails ®." },
 { property: "og:title", content: "Request Your Appointment — Crème de la Crème Nails ®" },
 { property: "og:description", content: "Reserve your luxury nail experience today." },
 ],
 }),
 component: ContactPageWrapper,
});

const QUICK_SERVICES = [
 "Gel Manicure",
 " Protein/Hardener Gel Manicure",
 "Russian Gel Manicure",
 " Builder Gel Overlay Russian Manicure",
 "Gel-X Extension Fullset ",
 " Spa Deluxe Premium Gel Pedicure",
 "Gel Pedi + G Soak ",
 "Russian Gel Pedi",
 "Gel Mani + Gel Pedi ",
 " Spa Premium Gel Pedi + Gel Mani",
];

function ContactPageWrapper() {
 return (
 <BookingProvider>
 <ContactPage />
 </BookingProvider>
 );
}

function ContactPage() {
 const c = usePageContent("contact", contactFallback);
 const { service: prefilledService } = Route.useSearch();
 const { open } = useBooking();
 const [selected, setSelected] = useState<string>(prefilledService ?? "");

 const startBooking = (serviceName?: string) => {
 open(serviceName ? { serviceName } : undefined);
 };

 return (
 <div className="min-h-screen bg-background">
 <Nav />

 <section className="pt-40 pb-12 px-6 text-center">
 <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.hero.eyebrow}</p>
 <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6">
 {c.hero.heading_part1} <span className="italic text-gold">{c.hero.heading_part2}</span>
 </h1>
 <p className="text-muted-foreground max-w-xl mx-auto">
 {c.hero.description}
 </p>
 </section>

 <section className="px-6 lg:px-10 pb-24">
 <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
 {/* Booking card */}
 <div className="lg:col-span-2 bg-cream border border-gold/20 p-8 md:p-12 space-y-8">
 {prefilledService && (
 <div className="bg-gold/10 border border-gold/30 px-4 py-3 text-sm">
 Inquiring about <span className="font-medium text-gold">{prefilledService}</span>
 </div>
 )}

 {/* Primary CTA */}
 <div className="text-center space-y-5 py-4">
 <Sparkles className="w-10 h-10 text-gold mx-auto" />
 <h2 className="font-serif text-3xl md:text-4xl">
 {c.cta.icon_heading}
 </h2>
 <p className="text-muted-foreground text-sm max-w-md mx-auto">
 {c.cta.icon_subtext}
 </p>
 <button
 type="button"
 onClick={() => startBooking(prefilledService)}
 className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition"
 >
 {c.cta.button_label}
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>

 <div className="relative">
 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gold/20" /></div>
 <div className="relative flex justify-center text-xs uppercase tracking-[0.22em] text-muted-foreground">
 <span className="bg-cream px-4">Or jump to a service</span>
 </div>
 </div>

 {/* Quick service shortcut */}
 <div className="space-y-4">
 <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground">
 Popular services
 </label>
 <select
 value={selected}
 onChange={(e) => setSelected(e.target.value)}
 className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
 >
 <option value="">— Choose a service —</option>
 {QUICK_SERVICES.map((s) => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>

 <button
 type="button"
 disabled={!selected}
 onClick={() => startBooking(selected)}
 className="w-full py-4 bg-foreground text-background tracking-[0.22em] text-xs uppercase hover:bg-primary hover:text-primary-foreground transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
 >
 Book This Service
 <ArrowRight className="w-4 h-4" />
 </button>

 <p className="text-xs text-muted-foreground text-center pt-2">
 Need something else?{" "}
 <a href="/book-now" className="underline hover:text-gold">
 Browse the full menu →
 </a>
 </p>
 </div>
 </div>

 {/* Sidebar */}
 <aside className="space-y-8">
 <Info
 icon={MapPin}
 title="Visit"
 lines={[{ text: "4413 Broadway 189ST, New York, NY 10040", href: "https://maps.google.com/?q=4413+Broadway+189ST,+New+York,+NY+10040" }]}
 />
 <Info
 icon={Phone}
 title="Call"
 lines={[{ text: "(347) 880-8282", href: "tel:+13478808282" }]}
 />
 <Info
 icon={Mail}
 title="Write"
 lines={[{ text: "angie@cremedelacremenails.com", href: "mailto:angie@cremedelacremenails.com" }]}
 />
 <Info
 icon={LinkIcon}
 title="Linktree"
 lines={[{ text: "linktr.ee/Cremedelacremenails", href: "https://linktr.ee/Cremedelacremenails" }]}
 />
 <Info icon={Clock} title="Hours" lines={["Monday · 10am – 7pm", "Tuesday · 10am – 7pm", "Wednesday · 10am – 7pm", "Thursday · 10am – 7pm", "Friday · 10am – 7pm", "Saturday · 10am – 7pm", "Sunday · 10am – 6pm"]} />
 <div className="flex gap-3 pt-2">
 <a href="https://www.instagram.com/cremedelacremenails" target="_blank" rel="noopener noreferrer" className="w-11 h-11 inline-flex items-center justify-center border border-gold/40 text-gold hover:bg-gold hover:text-primary transition" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
 <a href="https://www.facebook.com/Cremenailsbyangie/" target="_blank" rel="noopener noreferrer" className="w-11 h-11 inline-flex items-center justify-center border border-gold/40 text-gold hover:bg-gold hover:text-primary transition" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
 </div>
 </aside>
 </div>
 </section>

 <section className="px-6 lg:px-10 pb-24">
 <div className="max-w-6xl mx-auto aspect-[16/8] overflow-hidden border border-border">
 <iframe
 title="Map — 4413 Broadway 189ST, New York, NY 10040"
 src="https://www.google.com/maps?q=4413+Broadway+189ST,+New+York,+NY+10040&output=embed"
 className="w-full h-full"
 loading="lazy"
 />
 </div>
 </section>

 <Footer />
 <StickyBook />
 </div>
 );
}

type InfoLine = string | { text: string; href: string };

function Info({ icon: Icon, title, lines }: { icon: React.ElementType; title: string; lines: InfoLine[] }) {
 return (
 <div className="border-t border-gold/30 pt-5">
 <div className="flex items-center gap-2 mb-2">
 <Icon className="w-4 h-4 text-gold" />
 <p className="text-xs tracking-[0.22em] uppercase">{title}</p>
 </div>
 {lines.map((l) => {
 if (typeof l === "string") {
 return <p key={l} className="text-sm text-muted-foreground">{l}</p>;
 }
 const external = l.href.startsWith("http");
 return (
 <p key={l.text} className="text-sm">
 <a
 href={l.href}
 {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
 className="text-muted-foreground hover:text-gold transition-colors break-all"
 >
 {l.text}
 </a>
 </p>
 );
 })}
 </div>
 );
}
