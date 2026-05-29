import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { usePageContent } from "@/hooks/usePageContent";
import { X } from "lucide-react";
import g1 from "@/assets/gallery/g1.png";
import g2 from "@/assets/gallery/g2.jpg";
import g3 from "@/assets/gallery/g3.jpg";
import g4 from "@/assets/gallery/g4.jpg";
import g5 from "@/assets/gallery/g5.jpg";
import g6 from "@/assets/gallery/g6.jpg";
import g7 from "@/assets/gallery/g7.jpg";
import g8 from "@/assets/gallery/g8.jpg";
import g9 from "@/assets/gallery/g9.jpg";
import g10 from "@/assets/gallery/g10.jpg";
import g11 from "@/assets/gallery/g11.jpg";
import g12 from "@/assets/gallery/g12.jpg";
import g13 from "@/assets/gallery/g13.jpg";
import g14 from "@/assets/gallery/g14.jpg";
import g15 from "@/assets/gallery/g15.jpg";
import g16 from "@/assets/gallery/g16.jpg";
import g17 from "@/assets/gallery/g17.jpg";
import g18 from "@/assets/gallery/g18.jpg";
import g19 from "@/assets/gallery/g19.jpg";
import g20 from "@/assets/gallery/g20.jpg";

const defaultPhotos = [
  { image_url: g1, alt: "Pink almond nails with black heart art" },
  { image_url: g10, alt: "Glossy pearl chrome almond nails" },
  { image_url: g20, alt: "Red & pink heart French tips" },
  { image_url: g2, alt: "Classic white French tip nails" },
  { image_url: g11, alt: "French tips with hand-painted lemon art" },
  { image_url: g3, alt: "Pink glitter and marble nail set" },
  { image_url: g12, alt: "Bright fruit-themed summer nail set" },
  { image_url: g4, alt: "Detailed nail art with gold and floral accents" },
  { image_url: g13, alt: "Sky blue cat-eye almond nails" },
  { image_url: g14, alt: "Pop-art pink lips and cherries acrylic set" },
  { image_url: g15, alt: "Green agate stone & swirl nail art" },
  { image_url: g16, alt: "Hand-painted rose nail art" },
  { image_url: g17, alt: "Soft natural nude almond manicure" },
  { image_url: g9, alt: "Soft white French gel nails" },
  { image_url: g5, alt: "Precision cuticle work in progress" },
  { image_url: g6, alt: "E-file nail prep close-up" },
  { image_url: g18, alt: "Pedicure exfoliation & callus care" },
  { image_url: g19, alt: "Hot stone pedicure detail" },
  { image_url: g7, alt: "Chrome and marble nail finishing" },
  { image_url: g8, alt: "Acrylic application detail" },
];

const fallback = {
  hero: {
    eyebrow: "✦ OUR WORK ✦",
    heading_part1: "The",
    heading_part2: "Gallery.",
    description: "Real client sets, signature designs, and a peek behind the scenes.",
  },
  photos: { items: defaultPhotos },
};

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Crème de la Crème Nails ®" },
      { name: "description", content: "A look inside our salon: signature nail art, French tips, chrome, builder gel sets and more." },
      { property: "og:title", content: "Gallery — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Real client work and behind-the-scenes from Crème de la Crème Nails." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const c = usePageContent("gallery", fallback);
  const [active, setActive] = useState<number | null>(null);
  const items = (c.photos.items ?? []).filter((p: any) => p && p.image_url);
  const photos = items.length > 0 ? items : defaultPhotos;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="tracking-luxe text-xs text-primary mb-3">{c.hero.eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground">
              {c.hero.heading_part1} <em className="italic text-primary">{c.hero.heading_part2}</em>
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{c.hero.description}</p>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 [column-fill:_balance]">
            {photos.map((p: any, i: number) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="group block w-full mb-3 md:mb-4 break-inside-avoid overflow-hidden rounded-xl bg-muted shadow-soft focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={p.image_url}
                  alt={p.alt ?? ""}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </main>

      {active !== null && photos[active] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={photos[active].image_url}
            alt={photos[active].alt ?? ""}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <StickyBook />
      <Footer />
    </div>
  );
}
