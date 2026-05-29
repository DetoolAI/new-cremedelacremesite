import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { BOOKING_URL, BOOKING_HELPER } from "@/lib/booking";
import { usePageContent } from "@/hooks/usePageContent";
import heroVideo from "@/assets/videos/hero-hands.mp4";
import salonImg from "@/assets/storefront.jpg";
import pediImg from "@/assets/service-pedicure.jpg";
import polishVideo from "@/assets/videos/membership-flowers.mp4";
import insta1 from "@/assets/insta-1.jpg";
import insta2 from "@/assets/insta-2.jpg";
import insta3 from "@/assets/insta-3.jpg";
import insta4 from "@/assets/insta-4.jpg";
import logo from "@/assets/logo.png";
import { Star, Sparkles, Heart, ShieldCheck, Clock, ArrowRight, Instagram, Hand, Footprints, Palette, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/")({
 head: () => ({
 meta: [
 { title: "Crème de la Crème Nails ® — Luxury Nail Care Since 2010" },
 { name: "description", content: "The originals since 2010. Premium, gender-neutral luxury nail care by licensed & insured manicurists. Book your appointment today." },
 { property: "og:title", content: "Crème de la Crème Nails ® — Luxury Nail Care" },
 { property: "og:description", content: "Premium, gender-neutral nail care. Licensed & insured. Open 7 days." },
 ],
 }),
 component: Home,
});

const FEATURED_ICONS = [Hand, Sparkles, Footprints, Palette];
const ABOUT_ICONS = [ShieldCheck, Sparkles, Heart, Star];
const TRUST_ICONS = [ShieldCheck, Star, Heart, CalendarCheck];

const fallback = {
 hero: {
 eyebrow: "✦ THE ORIGINALS SINCE 2010 · REGISTERED ✦",
 subheading: "Luxury nail care · all gender neutral. A premium experience by licensed & insured manicurists and nail technicians.",
 primary_cta_label: "✦ Join the Nails Club ✦",
 primary_cta_link: "/membership",
 secondary_cta_label: "Book Now",
 tertiary_cta_label: "View Services",
 tertiary_cta_link: "/services",
 },
 marquee: { items: [
 { text: "Licensed & Insured" }, { text: "Est. 2010" }, { text: "Open 7 Days" },
 { text: "All Gender Neutral" }, { text: "Mobile Services" },
 ]},
 about: {
 eyebrow: "A BIT ABOUT US",
 heading_part1: "A sanctuary for the",
 heading_part2: "well-groomed.",
 description: "Established in 2010, Crème de la Crème Nails ® has redefined the nail experience.",
 stat_number: "15+",
 stat_label: "Years of Excellence",
 image_url: "",
 features: [
 { title: "Licensed & Insured", description: "Certified professionals you can trust." },
 { title: "Hospital-Grade Hygiene", description: "Sterilized tools, every guest." },
 { title: "All Gender Neutral", description: "Inclusive by design." },
 { title: "Lasting Results", description: "Premium products, expert technique." },
 ],
 },
 hours: {
 eyebrow: "OPEN 7 DAYS",
 heading: "Hours & Availability",
 days: [
 { day: "Monday", hours: "10am – 7pm" }, { day: "Tuesday", hours: "10am – 7pm" },
 { day: "Wednesday", hours: "10am – 7pm" }, { day: "Thursday", hours: "10am – 7pm" },
 { day: "Friday", hours: "10am – 7pm" }, { day: "Saturday", hours: "10am – 7pm" },
 { day: "Sunday", hours: "10am – 6pm" },
 ],
 },
 trust_strip: { items: [
 { title: "Licensed & Insured", description: "Certified nail technicians" },
 { title: "Serving Since 2010", description: "25+ years of experience" },
 { title: "All Genders Welcome", description: "Inclusive by design" },
 { title: "Walk-ins & Appointments", description: "Open 7 days a week" },
 ]},
 featured: {
 eyebrow: "MOST POPULAR",
 heading_part1: "Featured",
 heading_part2: "services.",
 subheading: "Our guests' most-loved rituals — booked again and again.",
 items: [
  { name: "Russian Manicure", description: "Our signature precision manicure." },
  { name: "Gel Manicure", description: "Long-wearing, high-shine gel." },
  { name: "Spa Pedicure", description: "A multi-step ritual." },
  { name: "Nail Art", description: "Custom designs and hand-painted detail." },
  { name: "Nail Extensions & Overlays", description: "Builder gel, soft gel & acrylic — sculpted to your hand." },
  { name: "Take Off", description: "Safe, gentle removal of gel, builder gel, or acrylic." },
 ],
 },
 membership_promo: {
 eyebrow: "MONTHLY MEMBERSHIPS",
 heading_part1: "The VIP",
 heading_part2: "ritual.",
 description: "A discounted monthly recurring manicure & pedicure subscription.",
 cta_label: "Join Membership",
 cta_link: "/membership",
 benefits: [
 { text: "Significant savings every month" }, { text: "Priority booking & scheduling" },
 { text: "Exclusive members-only offers" }, { text: "Complimentary add-ons quarterly" },
 ],
 },
 testimonials: {
 eyebrow: "KIND WORDS",
 heading_part1: "From our",
 heading_part2: "guests.",
 items: [] as Array<{ name: string; role: string; text: string }>,
 },
 ritual_banner: {
 eyebrow: "RITUAL",
 quote: "Self-care, refined to an art.",
 cta_label: "Treat Yourself Today",
 image_url: "",
 },
 loyalty_promo: {
 eyebrow: "EXCLUSIVE PERKS",
 heading_part1: "Earn rewards",
 heading_part2: "every visit.",
 description: "Every booking earns 1 point.",
 cta_label: "Check Your Points",
 cta_link: "/rewards",
 tiers: [
 { points: "10 pts", reward: "$10 off" },
 { points: "25 pts", reward: "$25 off" },
 { points: "50 pts", reward: "$50 off" },
 ],
 },
 newsletter: {
  eyebrow: "STAY IN THE LOOP",
  heading_part1: "Exclusive offers,",
  heading_part2: "delivered.",
  description: "Sign up for our newsletter.",
  button_label: "Subscribe",
 },
 instagram: {
 eyebrow: "@CREMEDELACREMENAILS",
 heading: "Follow our work",
 link_label: "Follow on Instagram",
 instagram_url: "https://www.instagram.com/cremedelacremenails",
 images: [{ url: "" }, { url: "" }, { url: "" }, { url: "" }],
 },
};

function useAutoplayVideo() {
 const ref = useRef<HTMLVideoElement>(null);
 useEffect(() => {
 const v = ref.current;
 if (!v) return;
 v.muted = true;
 v.setAttribute("muted", "");
 v.setAttribute("playsinline", "");
 const tryPlay = () => {
 const p = v.play();
 if (p && typeof p.catch === "function") p.catch(() => {});
 };
 tryPlay();
 const onInteract = () => {
 tryPlay();
 window.removeEventListener("touchstart", onInteract);
 window.removeEventListener("click", onInteract);
 window.removeEventListener("scroll", onInteract);
 };
 window.addEventListener("touchstart", onInteract, { passive: true });
 window.addEventListener("click", onInteract);
 window.addEventListener("scroll", onInteract, { passive: true });
 const onVisible = () => { if (document.visibilityState === "visible") tryPlay(); };
 document.addEventListener("visibilitychange", onVisible);
 return () => {
 window.removeEventListener("touchstart", onInteract);
 window.removeEventListener("click", onInteract);
 window.removeEventListener("scroll", onInteract);
 document.removeEventListener("visibilitychange", onVisible);
 };
 }, []);
 return ref;
}

function Home() {
 const heroVideoRef = useAutoplayVideo();
 const polishVideoRef = useAutoplayVideo();
 const c = usePageContent("home", fallback);

 const aboutImg = c.about.image_url || salonImg;
 const ritualImg = c.ritual_banner.image_url || pediImg;
 const instaFallbacks = [insta1, insta2, insta3, insta4];

 return (
 <div className="min-h-screen bg-background">
 <Nav />

 {/* HERO */}
 <section className="relative min-h-screen flex items-center overflow-hidden">
 <div className="absolute inset-0">
 <video
 ref={heroVideoRef} src={heroVideo} autoPlay muted loop playsInline
 disablePictureInPicture disableRemotePlayback preload="auto" controls={false}
 {...({ "webkit-playsinline": "true", "x5-playsinline": "true" } as Record<string, string>)}
 className="w-full h-full object-cover animate-slow-zoom"
 />
 <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/55 to-foreground/10" />
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
 </div>

 <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-10 pt-28 pb-32 md:pt-32 md:pb-24 w-full">
 <div className="max-w-3xl">
 <p className="tracking-luxe text-[0.65rem] md:text-[0.7rem] text-gold-soft mb-5 animate-fade-in drop-shadow-lg">
 {c.hero.eyebrow}
 </p>
 <h1 className="animate-fade-up">
 <span className="sr-only">Crème de la Crème Nails ®</span>
 <img src={logo} alt="Crème de la Crème Nails ®"
 className="w-[9rem] sm:w-[12rem] md:w-[15rem] h-auto opacity-80 mix-blend-luminosity drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]" />
 </h1>
 <p className="mt-6 md:mt-8 text-sm md:text-lg text-background/95 max-w-xl font-light leading-relaxed animate-fade-up delay-300 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]">
 {c.hero.subheading}
 </p>

 <div className="mt-8 md:mt-10 animate-fade-up delay-500">
 <Link to={c.hero.primary_cta_link as any}
 className="font-display inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-10 py-4 md:py-5 bg-gold text-background text-xs md:text-base tracking-[0.2em] md:tracking-[0.28em] uppercase hover:bg-foreground transition-colors shadow-luxe rounded-full">
 {c.hero.primary_cta_label}
 </Link>
 </div>

 <div className="mt-5 md:mt-6 flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-up delay-700">
 <a href={BOOKING_URL}
 className="font-display inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 bg-primary text-primary-foreground tracking-[0.18em] md:tracking-[0.22em] text-[0.7rem] md:text-xs uppercase hover:bg-foreground transition-colors group shadow-luxe rounded-full">
 {c.hero.secondary_cta_label}
 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </a>
 <Link to={c.hero.tertiary_cta_link as any}
 className="font-display inline-flex items-center justify-center px-6 md:px-8 py-3.5 md:py-4 border border-background/60 text-background tracking-[0.18em] md:tracking-[0.22em] text-[0.7rem] md:text-xs uppercase hover:bg-background hover:text-foreground transition-colors backdrop-blur-sm rounded-full">
 {c.hero.tertiary_cta_label}
 </Link>
 </div>
 <p className="mt-4 text-[0.7rem] text-background/70 italic [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">{BOOKING_HELPER}</p>
 </div>
 </div>

 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[0.6rem] tracking-[0.3em] text-background/80 animate-shimmer">SCROLL</div>
 </section>

 {/* MARQUEE STRIP */}
 <section className="bg-primary text-primary-foreground py-5 overflow-hidden border-y border-gold/30">
 <div className="flex items-center justify-around gap-10 text-[0.7rem] tracking-[0.3em] uppercase whitespace-nowrap">
 {c.marquee.items.flatMap((item, i) => [
 <span key={`t-${i}`}>{item.text}</span>,
 i < c.marquee.items.length - 1 ? <span key={`s-${i}`} className="text-gold">✦</span> : null,
 ])}
 </div>
 </section>

 {/* ABOUT */}
 <section id="about" className="py-24 md:py-32 px-6 lg:px-10">
 <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
 <div className="relative">
 <img src={aboutImg} alt="Inside our luxury nail salon" loading="lazy"
 width={1280} height={1280} className="w-full aspect-[4/5] object-cover shadow-luxe" />
 <div className="absolute -bottom-8 -right-4 md:-right-8 bg-background border border-gold/40 px-8 py-6 shadow-soft">
 <p className="font-serif text-5xl text-gold leading-none">{c.about.stat_number}</p>
 <p className="tracking-[0.22em] text-[0.65rem] uppercase text-muted-foreground mt-2">{c.about.stat_label}</p>
 </div>
 </div>

 <div>
 <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.about.eyebrow}</p>
 <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-8 leading-[1.05]">
 {c.about.heading_part1} <span className="italic text-gold">{c.about.heading_part2}</span>
 </h2>
 <p className="text-muted-foreground leading-relaxed mb-6">{c.about.description}</p>

 <ul className="grid sm:grid-cols-2 gap-5 mt-10">
 {c.about.features.map((f, i) => {
 const Icon = ABOUT_ICONS[i % ABOUT_ICONS.length];
 return (
 <li key={i} className="flex gap-3">
 <Icon className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
 <div>
 <p className="font-medium text-sm">{f.title}</p>
 <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
 </div>
 </li>
 );
 })}
 </ul>
 </div>
 </div>
 </section>

 {/* HOURS */}
 <section className="px-6 lg:px-10 pb-24">
 <div className="max-w-5xl mx-auto bg-gradient-to-br from-secondary to-cream border border-gold/20 px-8 md:px-16 py-14 md:py-20 text-center">
 <Clock className="w-7 h-7 text-gold mx-auto mb-5" />
 <p className="tracking-luxe text-[0.7rem] text-gold mb-3">{c.hours.eyebrow}</p>
 <h3 className="font-serif text-3xl md:text-5xl mb-10">{c.hours.heading}</h3>
 <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
 {c.hours.days.map((d, i) => (
 <div key={i} className="border-t border-gold/30 pt-4 flex items-baseline justify-between">
 <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground">{d.day}</p>
 <p className="font-serif text-lg">{d.hours}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* TRUST STRIP */}
 <section className="px-6 lg:px-10 -mt-8 mb-8 md:mb-16">
 <div className="max-w-6xl mx-auto bg-cream border border-gold/25 rounded-2xl shadow-soft px-8 py-8 md:py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
 {c.trust_strip.items.map((f, i) => {
 const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
 return (
 <div key={i} className="flex flex-col items-center gap-2">
 <Icon className="w-6 h-6 text-gold" />
 <p className="font-medium text-sm">{f.title}</p>
 <p className="text-xs text-muted-foreground">{f.description}</p>
 </div>
 );
 })}
 </div>
 </section>

 {/* FEATURED */}
 <section id="services" className="py-20 md:py-28 bg-secondary/40 px-6 lg:px-10">
 <div className="max-w-7xl mx-auto">
 <div className="text-center mb-14">
 <p className="tracking-luxe text-[0.7rem] text-gold mb-4">{c.featured.eyebrow}</p>
 <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-5">
 {c.featured.heading_part1} <span className="italic text-gold">{c.featured.heading_part2}</span>
 </h2>
 <p className="text-muted-foreground max-w-xl mx-auto">{c.featured.subheading}</p>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {c.featured.items.map((s: any, i: number) => {
 const Icon = FEATURED_ICONS[i % FEATURED_ICONS.length];
 return (
 <div key={i} className="group bg-background border border-gold/20 rounded-2xl p-8 shadow-soft hover:shadow-luxe transition-all duration-500 flex flex-col">
 <div className="w-12 h-12 rounded-full bg-gold/15 inline-flex items-center justify-center mb-6">
 <Icon className="w-5 h-5 text-gold" />
 </div>
 <h3 className="font-serif text-xl mb-3 group-hover:text-gold transition-colors">{s.name}</h3>
 <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.description ?? s.desc}</p>
 </div>
 );
 })}
 </div>

 <div className="mt-12 text-center">
 <a href={BOOKING_URL} className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors rounded-full shadow-luxe">
 Book Now <ArrowRight className="w-4 h-4" />
 </a>
 <p className="mt-3 text-xs text-muted-foreground italic">{BOOKING_HELPER}</p>
 <Link to="/services" className="block mt-6 text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-gold transition-colors">
 View All Services →
 </Link>
 </div>
 </div>
 </section>

 {/* MEMBERSHIP */}
 <section className="py-24 md:py-32 px-6 lg:px-10">
 <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
 <div className="order-2 lg:order-1">
 <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.membership_promo.eyebrow}</p>
 <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-8 leading-[1.05]">
 {c.membership_promo.heading_part1} <span className="italic text-gold">{c.membership_promo.heading_part2}</span>
 </h2>
 <p className="text-muted-foreground leading-relaxed mb-10 max-w-lg">{c.membership_promo.description}</p>

 <ul className="space-y-5 mb-10">
 {c.membership_promo.benefits.map((b, i) => (
 <li key={i} className="flex items-start gap-4 border-b border-border pb-4">
 <span className="text-gold font-serif text-xl leading-none mt-1">✦</span>
 <span className="text-sm">{b.text}</span>
 </li>
 ))}
 </ul>

 <Link to={c.membership_promo.cta_link as any}
 className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors group">
 {c.membership_promo.cta_label}
 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </Link>
 </div>

 <div className="order-1 lg:order-2 relative">
 <video ref={polishVideoRef} src={polishVideo} autoPlay muted loop playsInline
 disablePictureInPicture disableRemotePlayback preload="auto" controls={false}
 {...({ "webkit-playsinline": "true", "x5-playsinline": "true" } as Record<string, string>)}
 className="w-full aspect-square object-cover shadow-luxe" />
 </div>
 </div>
 </section>

 {/* TESTIMONIALS */}
 <section className="py-24 md:py-32 bg-primary text-primary-foreground px-6 lg:px-10">
 <div className="max-w-6xl mx-auto">
 <p className="tracking-luxe text-[0.7rem] text-background mb-4 text-center">{c.testimonials.eyebrow}</p>
 <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-center mb-16 leading-[1.05]">
 {c.testimonials.heading_part1} <span className="italic text-background">{c.testimonials.heading_part2}</span>
 </h2>

 <div className="grid md:grid-cols-3 gap-8">
 {c.testimonials.items.map((t, i) => (
 <figure key={i} className="bg-background/10 border border-background/25 p-8 hover:border-background/60 transition-colors rounded-lg">
 <div className="flex gap-1 text-background mb-5">
 {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
 </div>
 <blockquote className="font-serif text-xl leading-relaxed text-background mb-6">"{t.text}"</blockquote>
 <figcaption>
 <p className="text-sm font-semibold text-background">{t.name}</p>
 <p className="text-xs text-background/80 tracking-wider mt-1">{t.role}</p>
 </figcaption>
 </figure>
 ))}
 </div>
 </div>
 </section>

 {/* RITUAL BANNER */}
 <section className="relative h-[60vh] overflow-hidden">
 <img src={ritualImg} alt="Spa pedicure" loading="lazy" className="w-full h-full object-cover" width={1024} height={1280} />
 <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/50 to-foreground/30 flex items-center justify-center">
 <div className="text-center text-background px-6">
 <p className="tracking-luxe text-[0.7rem] text-gold-soft mb-4">{c.ritual_banner.eyebrow}</p>
 <p className="font-serif text-3xl md:text-5xl italic max-w-2xl [text-shadow:0_2px_20px_rgba(0,0,0,0.5)] mb-8">
 "{c.ritual_banner.quote}"
 </p>
 <a href={BOOKING_URL}
 className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors rounded-full shadow-luxe">
 {c.ritual_banner.cta_label}
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </div>
 </section>

 {/* LOYALTY */}
 <section className="py-20 md:py-24 px-6 lg:px-10 bg-secondary/40">
 <div className="max-w-5xl mx-auto bg-gradient-to-br from-cream to-background border border-gold/30 rounded-2xl px-8 md:px-14 py-12 md:py-16 text-center shadow-soft">
 <p className="tracking-luxe text-[0.7rem] text-gold mb-4">{c.loyalty_promo.eyebrow}</p>
 <h2 className="font-serif text-3xl md:text-5xl mb-5 leading-[1.05]">
 {c.loyalty_promo.heading_part1} <span className="italic text-gold">{c.loyalty_promo.heading_part2}</span>
 </h2>
 <p className="text-muted-foreground max-w-xl mx-auto mb-10">{c.loyalty_promo.description}</p>
 <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 text-sm">
 {c.loyalty_promo.tiers.map((t, i) => (
 <div key={i} className="border border-gold/30 rounded-lg p-4 bg-background">
 <p className="font-serif text-2xl text-gold">{t.points}</p>
 <p className="text-xs text-muted-foreground mt-1">{t.reward}</p>
 </div>
 ))}
 </div>
 <Link to={c.loyalty_promo.cta_link as any}
 className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors rounded-full shadow-luxe">
 {c.loyalty_promo.cta_label}
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </section>

 {/* NEWSLETTER */}
 <NailsClubSignup
 eyebrow={c.newsletter.eyebrow}
 headingPart1={c.newsletter.heading_part1}
 headingPart2={c.newsletter.heading_part2}
 description={c.newsletter.description}
 buttonLabel={c.newsletter.button_label}
 />

 {/* INSTAGRAM */}
 <section className="py-24 px-6 lg:px-10 border-t border-border">
 <div className="max-w-7xl mx-auto text-center">
 <p className="tracking-luxe text-[0.7rem] text-gold mb-4">{c.instagram.eyebrow}</p>
 <h2 className="font-serif text-3xl md:text-4xl mb-3">{c.instagram.heading}</h2>
 <a
 href={c.instagram.instagram_url} target="_blank" rel="noopener noreferrer"
 onClick={(e) => { e.preventDefault(); window.open(c.instagram.instagram_url, "_blank", "noopener,noreferrer"); }}
 className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition mb-12"
 >
 <Instagram className="w-4 h-4" /> {c.instagram.link_label}
 </a>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
 {c.instagram.images.map((img, i) => {
 const src = img.url || instaFallbacks[i % instaFallbacks.length];
 return (
 <a key={i} href={c.instagram.instagram_url} target="_blank" rel="noopener noreferrer"
 onClick={(e) => { e.preventDefault(); window.open(c.instagram.instagram_url, "_blank", "noopener,noreferrer"); }}
 className="block aspect-square overflow-hidden group cursor-pointer">
 <img src={src} alt="Crème de la Crème Nails ® Instagram" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
 </a>
 );
 })}
 </div>
 </div>
 </section>

 <Footer />
 <StickyBook />
 </div>
 );
}

function NailsClubSignup({ eyebrow, headingPart1, headingPart2, description, buttonLabel }: {
 eyebrow: string; headingPart1: string; headingPart2: string; description: string; buttonLabel: string;
}) {
 const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
 const [error, setError] = useState<string | null>(null);

 return (
 <section id="nails-club" className="py-24 md:py-32 px-6 lg:px-10 bg-cream scroll-mt-24">
 <div className="max-w-3xl mx-auto text-center">
 <p className="font-display tracking-luxe text-[0.75rem] text-gold mb-5">{eyebrow}</p>
 <h2 className="font-serif text-4xl md:text-5xl mb-5 leading-[1.05]">
 {headingPart1} <span className="font-script italic font-light text-gold">{headingPart2}</span>
 </h2>
 <p className="text-muted-foreground mb-10">{description}</p>

 {status === "success" ? (
 <div className="max-w-md mx-auto py-8 px-6 border border-gold/30 bg-background rounded-md">
 <p className="font-serif text-2xl text-gold mb-2">Welcome to the club ✦</p>
 <p className="text-sm text-muted-foreground">You're on the list. Check your inbox for a confirmation.</p>
 </div>
 ) : (
 <form
 className="flex flex-col gap-3 max-w-md mx-auto"
 onSubmit={async (e) => {
 e.preventDefault();
 if (status === "loading") return;
 const fd = new FormData(e.currentTarget);
 const email = String(fd.get("email") ?? "").trim();
 const phone = String(fd.get("phone") ?? "").trim();
 if (!email) return;
 setStatus("loading");
 setError(null);
 try {
 const res = await fetch("/api/public/newsletter-signup", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email, phone: phone || null }),
 });
 const json = await res.json();
 if (!res.ok) throw new Error(json?.error ?? "Signup failed");
 setStatus("success");
 } catch (err) {
 setStatus("error");
 setError(err instanceof Error ? err.message : "Something went wrong");
 }
 }}
 >
 <input required name="email" type="email" maxLength={255} placeholder="Email address"
 className="px-5 py-4 bg-background border border-border focus:border-gold outline-none text-sm rounded-md" />
 <input name="phone" type="tel" maxLength={50} placeholder="Phone number (optional)"
 className="px-5 py-4 bg-background border border-border focus:border-gold outline-none text-sm rounded-md" />
 <button type="submit" disabled={status === "loading"}
 className="font-display px-6 py-4 bg-primary text-primary-foreground tracking-[0.28em] text-xs uppercase hover:bg-foreground transition rounded-full disabled:opacity-60">
 {status === "loading" ? "Joining…" : buttonLabel}
 </button>
 {status === "error" && <p className="text-xs text-red-600 mt-1">{error}</p>}
 </form>
 )}
 </div>
 </section>
 );
}
