import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { Gift, Award, Sparkles, Heart } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";
import giftcardFlyer from "@/assets/giftcard-flyer.jpg";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Programs — Loyalty, Gifts & Special Occasions" },
      { name: "description", content: "Our loyalty program, gift certificates, seasonal specials and bookings for weddings, birthdays and group events." },
      { property: "og:title", content: "Programs — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Loyalty rewards, gift certificates, and special occasion bookings." },
    ],
  }),
  component: ProgramsPage,
});

const ICONS: Record<string, any> = { Award, Gift, Sparkles, Heart };

const fallback = {
  hero: {
    eyebrow: "SPECIAL PROGRAMS",
    heading_part1: "Reasons to",
    heading_part2: "return.",
    description: "Loyalty, gifting, and bespoke experiences — designed for the moments that matter most.",
  },
  programs: {
    items: [
      { icon: "Award", title: "Loyalty Program", description: "Earn points with every visit and unlock exclusive rewards, complimentary services and members-only events." },
      { icon: "Gift", title: "Gift Certificates", description: "The most thoughtful gift — beautifully presented physical and digital cards in any amount." },
      { icon: "Sparkles", title: "Seasonal Specials", description: "Limited-edition treatments and curated colors throughout the year. Members notified first." },
      { icon: "Heart", title: "Special Occasions", description: "Birthdays, weddings, anniversaries, baby showers — celebrated in style with bespoke packages." },
    ],
  },
  events: {
    eyebrow: "GROUPS & EVENTS",
    heading: "Bridal · Birthdays · Celebrations",
    description: "Private salon buyouts, group bookings, and bespoke event packages — let us craft the perfect occasion.",
    cta_label: "Inquire About Events",
    cta_service: "Group / Event",
  },
};

function ProgramsPage() {
  const c = usePageContent("programs", fallback);
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="pt-40 pb-16 px-6 text-center">
        <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.hero.eyebrow}</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6">
          {c.hero.heading_part1} <span className="italic text-gold">{c.hero.heading_part2}</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">{c.hero.description}</p>
      </section>

      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-px bg-border">
          {c.programs.items.map((p: any) => {
            const Icon = ICONS[p.icon] ?? Award;
            return (
              <div key={p.title} className="bg-background p-10 md:p-12 hover:bg-cream transition-colors flex flex-col">
                <Icon className="w-7 h-7 text-gold mb-6" />
                <h3 className="font-serif text-3xl mb-4">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">{p.description}</p>
                <Link
                  to="/contact"
                  search={{ service: p.title }}
                  className="mt-auto text-xs tracking-[0.22em] uppercase text-gold hover:text-foreground transition-colors border-b border-gold/40 pb-1 self-start"
                >
                  Inquire →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 lg:px-10 py-20 bg-cream">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <a href="https://square.link/u/4Jgb3veb" target="_blank" rel="noopener noreferrer" aria-label="Purchase $100 Crème gift card on Square">
            <img src={giftcardFlyer} alt="Crème de la Crème $100 gift card promotion — get an extra $20 free" className="w-full rounded-lg shadow-luxe cursor-pointer hover:opacity-90 transition" loading="lazy" />
          </a>
          <div>
            <p className="tracking-luxe text-[0.7rem] text-gold mb-4">GIFT CARDS</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-6 leading-[1.05]">Give the gift of <span className="italic text-gold">Mani &amp; Pedi</span>.</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Buy a $100 Crème gift card and enjoy an extra <span className="font-semibold text-foreground">$20 on us</span>. The most thoughtful gift, beautifully presented.
            </p>
            <a href="https://square.link/u/4Jgb3veb" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition rounded-full shadow-luxe">
              Purchase Gift Card →
            </a>
          </div>
        </div>
      </section>

      <section className="bg-secondary/40 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="tracking-luxe text-[0.7rem] text-gold mb-4">{c.events.eyebrow}</p>
          <h2 className="font-serif text-4xl md:text-5xl mb-6 leading-[1.05]">{c.events.heading}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10">{c.events.description}</p>
          <Link
            to="/contact"
            search={{ service: c.events.cta_service }}
            className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition"
          >
            {c.events.cta_label}
          </Link>
        </div>
      </section>

      <Footer />
      <StickyBook />
    </div>
  );
}
