import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { usePageContent } from "@/hooks/usePageContent";
import { Mail, Quote, Newspaper, Download } from "lucide-react";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press — Crème de la Crème Nails ®" },
      { name: "description", content: "Press, partnerships and media inquiries for Crème de la Crème Nails ® — luxury nail care since 2010." },
      { property: "og:title", content: "Press — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Media inquiries, brand partnerships and press resources." },
    ],
  }),
  component: PressPage,
});

const fallback = {
  hero: {
    eyebrow: "✦ PRESS & MEDIA ✦",
    heading_part1: "In the",
    heading_part2: "press.",
    description: "The originals since 2010. For interviews, features, partnerships and media inquiries — we'd love to hear from you.",
  },
  features: {
    items: [
      { outlet: "Featured Local Spotlight", quote: "A neighborhood institution redefining the modern nail experience.", year: "2024" },
      { outlet: "Community Beauty Feature", quote: "Hospital-grade hygiene meets hand-painted artistry.", year: "2023" },
      { outlet: "Bridal Inspiration", quote: "The go-to for editorial-quality bridal nails.", year: "2023" },
    ],
  },
  at_a_glance: {
    items: [
      { label: "Est.", value: "2010" },
      { label: "Locations", value: "NYC" },
      { label: "Specialty", value: "Luxury Nails" },
      { label: "Audience", value: "All Genders" },
    ],
  },
  press_kit: {
    title: "Press kit",
    description: "High-resolution logos, brand imagery and our boilerplate are available on request.",
    button_label: "Request Press Kit",
    email: "angie@cremedelacremenails.com",
    email_subject: "Press Kit Request",
  },
  media_inquiries: {
    title: "Media inquiries",
    description: "For interviews, features, collaborations and brand partnerships.",
    button_label: "Email Us",
    email: "angie@cremedelacremenails.com",
    email_subject: "Media Inquiry",
  },
};

function PressPage() {
  const c = usePageContent("press", fallback);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="tracking-luxe text-xs text-primary mb-3">{c.hero.eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground">
              {c.hero.heading_part1} <em className="italic text-primary">{c.hero.heading_part2}</em>
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{c.hero.description}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-20">
            {(c.features.items ?? []).map((f: any, i: number) => (
              <article key={i} className="bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col">
                <Quote className="w-6 h-6 text-primary mb-3" />
                <p className="font-serif text-lg text-foreground leading-snug flex-1">"{f.quote}"</p>
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs tracking-[0.18em] uppercase text-muted-foreground">{f.outlet}</span>
                  <span className="text-xs text-primary">{f.year}</span>
                </div>
              </article>
            ))}
          </div>

          <section className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-soft mb-12">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">At a glance</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(c.at_a_glance.items ?? []).map((s: any, i: number) => (
                <div key={i}>
                  <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">{s.label}</p>
                  <p className="font-serif text-2xl text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-5">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
              <Newspaper className="w-7 h-7 text-primary mb-3" />
              <h3 className="font-serif text-2xl text-foreground mb-2">{c.press_kit.title}</h3>
              <p className="text-muted-foreground text-sm mb-5">{c.press_kit.description}</p>
              <a
                href={`mailto:${c.press_kit.email}?subject=${encodeURIComponent(c.press_kit.email_subject)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs tracking-[0.22em] uppercase hover:bg-foreground transition-colors"
              >
                <Download className="w-4 h-4" /> {c.press_kit.button_label}
              </a>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
              <Mail className="w-7 h-7 text-primary mb-3" />
              <h3 className="font-serif text-2xl text-foreground mb-2">{c.media_inquiries.title}</h3>
              <p className="text-muted-foreground text-sm mb-5">{c.media_inquiries.description}</p>
              <a
                href={`mailto:${c.media_inquiries.email}?subject=${encodeURIComponent(c.media_inquiries.email_subject)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs tracking-[0.22em] uppercase hover:bg-primary transition-colors"
              >
                {c.media_inquiries.button_label}
              </a>
            </div>
          </section>

          <div className="text-center mt-16">
            <Link to="/gallery" className="text-xs tracking-[0.22em] uppercase text-primary hover:text-foreground transition-colors">
              View Our Work →
            </Link>
          </div>
        </div>
      </main>
      <StickyBook />
      <Footer />
    </div>
  );
}
