import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { Sparkles, Phone, Mail, ArrowRight } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";

const MOBILE_BOOKING_URL = "https://creme.setmore.com?utm_source=qr-code&utm_medium=settings-share-bp";
const MOBILE_EMAIL = "cremedelacrememobile@gmail.com";
const MOBILE_PHONE = "(347) 880-8282";

export const Route = createFileRoute("/mobile")({
  head: () => ({
    meta: [
      { title: "Mobile Services — Crème de la Crème Nails ®" },
      { name: "description", content: "The Crème experience, brought to you. Mobile manicure, pedicure and bridal services for events and at home." },
      { property: "og:title", content: "Mobile Nail Services — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Luxury at-home and on-location nail care. Book online instantly." },
    ],
  }),
  component: MobilePage,
});

const fallback = {
  hero: {
    eyebrow: "MOBILE SERVICES",
    heading_part1: "The salon,",
    heading_part2: "at your door.",
    description: "The full Crème experience, brought directly to your home, hotel, office or event venue. Book your mobile appointment instantly.",
    cta_label: "Book Mobile Appointment",
  },
  cards: {
    items: [
      { title: "At-Home", description: "Privacy and comfort, with the same premium tools and products we use in studio." },
      { title: "Bridal & Events", description: "On-location nail care for weddings, galas and intimate gatherings." },
      { title: "Group & Corporate", description: "Treat your team or guests to a refined, shared spa moment." },
    ],
  },
};

function MobilePage() {
  const c = usePageContent("mobile", fallback);
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="pt-40 pb-20 px-6 text-center bg-gradient-to-b from-cream to-background">
        <Sparkles className="w-7 h-7 text-gold mx-auto mb-4" />
        <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.hero.eyebrow}</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6">
          {c.hero.heading_part1} <span className="italic text-gold">{c.hero.heading_part2}</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10">{c.hero.description}</p>
        <a
          href={MOBILE_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition rounded-full shadow-luxe"
        >
          {c.hero.cta_label}
          <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      <section className="py-24 px-6 lg:px-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {c.cards.items.map((card: any) => (
            <div key={card.title} className="border border-gold/30 p-10 flex flex-col rounded-lg">
              <h3 className="font-serif text-3xl mb-4">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{card.description}</p>
              <a
                href={MOBILE_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto text-xs tracking-[0.22em] uppercase text-gold hover:text-foreground transition-colors border-b border-gold/40 pb-1 self-start"
              >
                Book Now →
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="tracking-luxe text-[0.7rem] text-gold mb-4">QUESTIONS?</p>
          <h2 className="font-serif text-3xl md:text-4xl mb-6">Get in touch with our mobile team.</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href={`tel:${MOBILE_PHONE.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 px-6 py-3 border border-gold/40 rounded-full hover:bg-gold/10 transition">
              <Phone className="w-4 h-4 text-gold" /> {MOBILE_PHONE}
            </a>
            <a href={`mailto:${MOBILE_EMAIL}`} className="inline-flex items-center gap-2 px-6 py-3 border border-gold/40 rounded-full hover:bg-gold/10 transition">
              <Mail className="w-4 h-4 text-gold" /> {MOBILE_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <StickyBook />
    </div>
  );
}
