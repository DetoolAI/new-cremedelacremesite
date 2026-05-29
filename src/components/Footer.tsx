import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, MapPin, Phone, Mail, Calendar, Link as LinkIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { BOOKING_URL } from "@/lib/booking";
import { usePageContent } from "@/hooks/usePageContent";

const fallback = {
  brand: {
    name: "Crème de la Crème Nails ®",
    eyebrow: "NAILS · EST. 2010",
    description: "The originals since 2010. Luxury nail care for all. Licensed & insured manicurists & nail technicians.",
    book_label: "Book Online",
  },
  hours: {
    heading: "Hours",
    days: [
      { day: "Mon", hours: "10am – 7pm" },
      { day: "Tue", hours: "10am – 7pm" },
      { day: "Wed", hours: "10am – 7pm" },
      { day: "Thu", hours: "10am – 7pm" },
      { day: "Fri", hours: "10am – 7pm" },
      { day: "Sat", hours: "10am – 7pm" },
      { day: "Sun", hours: "10am – 6pm" },
    ],
    note: "OPEN 7 DAYS",
  },
  contact: {
    heading: "Contact",
    address_line1: "4413 Broadway 189ST",
    address_line2: "New York, NY 10040",
    address_url: "https://maps.google.com/?q=4413+Broadway+189ST,+New+York,+NY+10040",
    phone: "(347) 880-8282",
    phone_url: "tel:+13478808282",
    email: "angie@cremedelacremenails.com",
    linktree_label: "Linktree",
    linktree_url: "https://linktr.ee/Cremedelacremenails",
    instagram_url: "https://www.instagram.com/cremedelacremenails",
    facebook_url: "https://www.facebook.com/Cremenailsbyangie/",
    youtube_url: "https://www.youtube.com/@cremedelacremenails",
    tiktok_url: "https://www.tiktok.com/@cremedelacremenails",
  },
  legal: {
    copyright: "© {year} Crème de la Crème Nails ®. All rights reserved.",
    tagline: "The Originals Since 2010",
  },
};

export function Footer() {
  const c = usePageContent("global", { footer: fallback }).footer ?? fallback;
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-14 md:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          <div>
            <div className="bg-background rounded-full w-20 h-20 flex items-center justify-center mb-5 shadow-soft">
              <img src={logo} alt="Crème de la Crème Nails ® logo" className="w-16 h-16 object-contain" />
            </div>
            <h3 className="font-serif text-2xl mb-2">{c.brand.name}</h3>
            <p className="tracking-luxe text-[0.6rem] text-gold-soft mb-6">
              {c.brand.eyebrow}
            </p>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-6">
              {c.brand.description}
            </p>
            <a
              href={BOOKING_URL}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gold text-background font-semibold text-[0.7rem] tracking-[0.22em] uppercase hover:bg-background hover:text-primary transition-colors rounded-full"
            >
              <Calendar className="w-4 h-4" />
              {c.brand.book_label}
            </a>
          </div>

          <div>
            <h4 className="text-base tracking-[0.22em] uppercase mb-5 text-gold-soft font-semibold">{c.hours.heading}</h4>
            <ul className="space-y-2 text-base text-primary-foreground max-w-[14rem]">
              {c.hours.days.map((d: any) => (
                <li key={d.day} className="flex items-baseline gap-3"><span className="w-16 font-semibold">{d.day}</span><span>{d.hours}</span></li>
              ))}
              <li className="pt-3 text-gold-soft tracking-[0.18em] text-sm font-semibold">{c.hours.note}</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-[0.22em] uppercase mb-5 text-gold">Explore</h4>
            <ul className="space-y-2 text-sm">
              {[
                ["/services", "Services"],
                ["/membership", "Membership"],
                ["/parties", "Parties & Bridal"],
                ["/programs", "Loyalty & Gifts"],
                ["/mobile", "Mobile Services"],
                ["/contact", "Press & Contact"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-primary-foreground/70 hover:text-gold transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base tracking-[0.22em] uppercase mb-5 text-gold-soft font-semibold">{c.contact.heading}</h4>
            <ul className="space-y-3 text-base text-primary-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <a
                  href={c.contact.address_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold transition-colors"
                >
                  {c.contact.address_line1}<br />{c.contact.address_line2}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gold" />
                <a href={c.contact.phone_url} className="hover:text-gold transition-colors">{c.contact.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold" />
                <a href={`mailto:${c.contact.email}`} className="hover:text-gold transition-colors break-all">{c.contact.email}</a>
              </li>
              <li className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-gold" />
                <a href={c.contact.linktree_url} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{c.contact.linktree_label}</a>
              </li>
            </ul>
            <div className="flex gap-3 mt-6">
              <a href={c.contact.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-primary-foreground/20 hover:border-gold hover:text-gold transition" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
              <a href={c.contact.facebook_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-primary-foreground/20 hover:border-gold hover:text-gold transition" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
              <a href={c.contact.youtube_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-primary-foreground/20 hover:border-gold hover:text-gold transition" aria-label="YouTube"><Youtube className="w-4 h-4" /></a>
              <a href={c.contact.tiktok_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-primary-foreground/20 hover:border-gold hover:text-gold transition" aria-label="TikTok">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.87a8.16 8.16 0 0 0 4.77 1.52V6.94a4.85 4.85 0 0 1-1.84-.25z"/></svg>
              </a>
              <a href={c.contact.linktree_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-primary-foreground/20 hover:border-gold hover:text-gold transition" aria-label="Linktree"><LinkIcon className="w-4 h-4" /></a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 pb-24 md:pb-0 border-t border-primary-foreground/10 flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-primary-foreground/50">
          <p>{c.legal.copyright.replace("{year}", String(new Date().getFullYear()))}</p>
          <p className="tracking-[0.2em] uppercase">{c.legal.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
