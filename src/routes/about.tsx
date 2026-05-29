import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { usePageContent } from "@/hooks/usePageContent";
import salonImg from "@/assets/about-salon.jpg";

const aboutShorts = [
  "1fYBFaoXtls",
  "EPdcltZVJew",
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Crème de la Crème Nails ®" },
      { name: "description", content: "Established 2010. A premium nail experience focused on quality, hygiene, and inclusivity by licensed & insured professionals." },
      { property: "og:title", content: "About Crème de la Crème Nails ®" },
      { property: "og:description", content: "The originals since 2010 — a luxury, gender-neutral nail sanctuary." },
    ],
  }),
  component: AboutPage,
});

const fallback = {
  hero: {
    eyebrow: "ABOUT",
    heading_part1: "A Bit",
    heading_part2: "About Us.",
    description: "Since 2010, Crème de la Crème Nails ® has stood for one thing: uncompromising quality in every detail of the nail experience.",
    image_url: "",
  },
  story: {
    eyebrow: "ANGIE'S STORY",
    heading_part1: "From Washington Heights,",
    heading_part2: "with love.",
    paragraphs: [
      "My mother's retirement from nails in 2000 in Washington Heights made me realize that nails were a part of me. I am just an ordinary girl from Washington Heights living my dream.",
      "I started in the nail business in 1998 — it was my mother's tactic to keep me out of trouble as a teenager. She opened up her own shop and hired me part-time after school, training me on how to do acrylic nails, manicures, and pedicures. Since then, this is all I have done. After 13 years in the nail business, Crème de la Crème Nails ® by Angie was born.",
      "Our goal is to make each client feel comfortable and special. You will always receive the best services and friendly smiles from our talented staff. We offer our clients the maximum in style, quality, and customer service.",
      "We aim to maintain our reputation with professionalism and quality services that will compel you to refer us with pride. Building relationships with people is one of the main satisfactions we get.",
    ],
    signature: "— Angie",
  },
  pillars: {
    items: [
      { title: "Our Origin", description: "Founded in 2010 as one of the original premium nail studios — long before luxury nail care became an industry." },
      { title: "Our Standard", description: "Hospital-grade hygiene, premium products, and licensed and insured technicians at every chair." },
      { title: "Our Philosophy", description: "Self-care is universal. Our doors are gender-neutral and our service is consistent for every guest." },
      { title: "Our Promise", description: "Long-lasting results, designed around the integrity of your natural nails." },
    ],
  },
  cta: {
    quote: "\"The originals since 2010.\"",
    button_label: "Book Your Visit",
    button_link: "/contact",
  },
};

function AboutPage() {
  const c = usePageContent("about", fallback);
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="pt-40 pb-20 px-6 lg:px-10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="tracking-luxe text-[0.7rem] text-gold mb-5">{c.hero.eyebrow}</p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-8">
            {c.hero.heading_part1} <span className="italic text-gold">{c.hero.heading_part2}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {c.hero.description}
          </p>
        </div>
      </section>

      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-3xl mx-auto">
          <img src={c.hero.image_url || salonImg} alt="Our salon storefront" loading="lazy" className="w-full h-auto object-contain shadow-luxe rounded-lg" />
        </div>
      </section>

      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <p className="tracking-luxe text-[0.7rem] text-gold mb-5 text-center">INSIDE THE SALON</p>
          <p className="text-xs text-muted-foreground text-center mb-6 italic">Tap a video to play with sound · Tap CC for subtitles</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {aboutShorts.map((id) => (
              <div key={id} className="relative w-full aspect-[9/16] rounded-lg overflow-hidden shadow-soft bg-foreground/5">
                <iframe
                  src={`https://www.youtube.com/embed/${id}?cc_load_policy=1&cc_lang_pref=en&playsinline=1&rel=0&modestbranding=1`}
                  title="Inside the salon"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-3xl mx-auto">
          <p className="tracking-luxe text-[0.7rem] text-gold mb-5 text-center">{c.story.eyebrow}</p>
          <h2 className="font-serif text-4xl md:text-5xl text-center mb-10">
            {c.story.heading_part1} <span className="italic text-gold">{c.story.heading_part2}</span>
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed text-[1.05rem]">
            {c.story.paragraphs.map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
            <p className="font-serif italic text-foreground text-xl pt-2">{c.story.signature}</p>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-10 pb-32">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
          {c.pillars.items.map((p: any) => (
            <div key={p.title} className="border-t border-gold/30 pt-6">
              <h3 className="font-serif text-2xl mb-3">{p.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-20 text-center px-6">
        <p className="font-serif text-3xl md:text-4xl italic mb-8">{c.cta.quote}</p>
        <Link to={c.cta.button_link} className="inline-flex items-center px-8 py-4 bg-background text-primary font-semibold tracking-[0.22em] text-xs uppercase hover:bg-gold hover:text-background transition rounded-full shadow-luxe">
          {c.cta.button_label}
        </Link>
      </section>

      <Footer />
      <StickyBook />
    </div>
  );
}
