import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { BOOKING_URL, BOOKING_HELPER } from "@/lib/booking";
import { Hand, Footprints, Sparkles, Palette, Brush, Crown, ArrowRight } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";
import manicureVideo from "@/assets/videos/manicures.mp4";
import pedicureVideo from "@/assets/videos/pedicures.mp4";
import gelVideo from "@/assets/videos/polish-change.mp4";
import builderVideo from "@/assets/videos/extensions.mp4";
import addOnsVideo from "@/assets/videos/nail-art.mp4";
import maniPediComboVideo from "@/assets/videos/mani-pedi-combo.mp4";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Crème de la Crème Nails ®" },
      { name: "description", content: "Luxury manicures, pedicures, extensions, nail art, polish change, kids services and waxing — by licensed & insured technicians." },
      { property: "og:title", content: "Services — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Manicures, pedicures, extensions, nail art, polish change, kids services & waxing." },
    ],
  }),
  component: ServicesPage,
});

type Category = {
  icon: typeof Hand;
  name: string;
  desc: string;
  slug: string;
  video?: string;
};

const categories: Category[] = [
  {
    icon: Hand,
    name: "Manicure Services",
    desc: "Classic, Russian and luxury manicures — clean, precise, long-wearing.",
    slug: "manicures",
    video: manicureVideo,
  },
  {
    icon: Footprints,
    name: "Pedicure Services",
    desc: "Spa rituals from deep callus care to our deluxe CBD experience.",
    slug: "pedicure",
    video: pedicureVideo,
  },
  {
    icon: Sparkles,
    name: "Gel Services",
    desc: "High-shine, long-wearing gel polish in a curated palette.",
    slug: "gel",
    video: gelVideo,
  },
  {
    icon: Brush,
    name: "Nail Extensions & Overlays",
    desc: "Builder gel overlays, soft gel extensions, acrylic and powder finishes — tailored to your hand.",
    slug: "builder-gel",
    video: builderVideo,
  },
  {
    icon: Palette,
    name: "Specialty Services & Add-Ons",
    desc: "Soaks, hand-painted nail art, custom designs and finishing touches to elevate any service.",
    slug: "specialty-add-ons",
    video: addOnsVideo,
  },
  {
    icon: Crown,
    name: "Combos",
    desc: "Curated mani + pedi pairings — gel, builder gel, acrylic and spa upgrades bundled at one price.",
    slug: "mani-pedi-combos",
    video: maniPediComboVideo,
  },
];

function CategoryCard({ c }: { c: Category }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const startPlayback = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  };

  const handleMouseEnter = () => {
    if (isMobile) return;
    videoRef.current?.pause();
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    startPlayback();
  };

  const handleClick = () => {
    if (!isMobile) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden bg-cream border border-gold/20 rounded-2xl shadow-soft hover:shadow-2xl hover:shadow-gold/20 hover:-translate-y-1 transition-all duration-500 flex flex-col animate-fade-up"
    >
      {c.video && (
        <div
          onClick={handleClick}
          className="relative aspect-[4/3] overflow-hidden bg-foreground/10 cursor-pointer"
        >
          <video
            ref={videoRef}
            src={c.video}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onPlay={() => setIsLoaded(true)}
            onLoadedData={() => setIsLoaded(true)}
            className="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-100 transition-transform duration-[1400ms] ease-out group-hover:scale-110"
          />
          {!isLoaded && (
            <div className="absolute inset-0 z-10 bg-secondary/35 animate-pulse" aria-hidden="true" />
          )}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-foreground/35 via-foreground/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 z-10 ring-1 ring-inset ring-gold/0 group-hover:ring-gold/50 transition-all duration-500 rounded-t-2xl pointer-events-none" />
        </div>
      )}

      <div className="p-8 flex flex-col flex-1">
        <div className="w-12 h-12 rounded-full bg-gold/15 inline-flex items-center justify-center mb-5">
          <c.icon className="w-5 h-5 text-gold" />
        </div>
        <h3 className="font-serif text-2xl mb-3 group-hover:text-gold transition-colors">{c.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{c.desc}</p>
        <a
          href={`${BOOKING_URL}?category=${c.slug}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[0.7rem] tracking-[0.22em] uppercase rounded-full hover:bg-foreground transition-all duration-300 group-hover:shadow-luxe group-hover:scale-[1.02]"
        >
          Book Now
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

const servicesFallback = {
  hero: {
    eyebrow: "THE MENU",
    heading_part1: "Crème Premium",
    heading_part2: "Services.",
    description: "Each service is performed by a licensed & insured technician using premium products and meticulous technique.",
    helper_text: "Tap a video to pause · Hover to preview",
    footer_note: "All services and full details available in our booking system.",
  },
  cta: {
    eyebrow: "TREAT YOURSELF TODAY",
    heading: "Ready when you are.",
    button_label: "Book Your Appointment",
  },
};

function ServicesPage() {
  const c = usePageContent("services-page", servicesFallback);
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="pt-40 pb-16 px-6 lg:px-10 text-center">
        <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.hero.eyebrow}</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6">
          {c.hero.heading_part1} <span className="italic text-gold">{c.hero.heading_part2}</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {c.hero.description}
        </p>
        <div className="mt-8">
          <a
            href={BOOKING_URL}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors rounded-full shadow-luxe"
          >
            Book Now
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground italic">{BOOKING_HELPER}</p>
        </div>
        <p className="mt-4 text-[0.7rem] tracking-[0.2em] uppercase text-muted-foreground/70">
          {c.hero.helper_text}
        </p>
      </section>

      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <CategoryCard key={cat.name} c={cat} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground italic max-w-xl mx-auto">
          {c.hero.footer_note}
        </p>
      </section>

      <section className="bg-secondary/40 py-20 px-6 text-center">
        <p className="tracking-luxe text-[0.7rem] text-gold mb-4">{c.cta.eyebrow}</p>
        <h2 className="font-serif text-4xl md:text-5xl mb-8">{c.cta.heading}</h2>
        <a
          href={BOOKING_URL}
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition-colors rounded-full"
        >
          {c.cta.button_label}
          <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      <Footer />
      <StickyBook />
    </div>
  );
}
