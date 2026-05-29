import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { BOOKING_URL } from "@/lib/booking";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/membership", label: "Membership" },
  { to: "/parties", label: "Parties & Bridal" },
  { to: "/rewards", label: "Rewards" },
  { to: "/mobile", label: "Mobile Services" },
  { to: "/press", label: "Press" },
  { to: "/contact", label: "Contact" },
  { to: "/members", label: "Members Only", gold: true },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = !scrolled && !open;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        onHero
          ? "bg-gradient-to-b from-foreground/40 to-transparent"
          : "bg-background/90 backdrop-blur-md border-b border-border/60"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-between h-20 gap-4">
        <Link to="/" className="flex items-center gap-3 leading-none group shrink-0">
          <img
            src={logo}
            alt="Crème de la Crème Nails ® logo"
            className="w-11 h-11 md:w-12 md:h-12 object-contain transition-transform group-hover:scale-105 drop-shadow-md"
          />
          <span className="hidden sm:flex flex-col whitespace-nowrap">
            <span className={`font-serif text-base md:text-lg leading-tight ${onHero ? "text-background [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]" : "text-foreground"}`}>
              Crème de la Crème Nails ®
            </span>
            <span className={`tracking-luxe text-[0.55rem] mt-0.5 ${onHero ? "text-gold-soft" : "text-primary"}`}>
              NAILS · EST. 2010
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {links.map((l) => {
            const isGold = "gold" in l && l.gold;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={
                  isGold
                    ? "text-xs tracking-[0.18em] uppercase font-bold bg-[linear-gradient(110deg,#a87a2a_0%,#f4cf6b_20%,#fff4c4_45%,#f4cf6b_60%,#a87a2a_100%)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[gold-shimmer_3s_linear_infinite] drop-shadow-[0_1px_3px_rgba(196,148,52,0.5)]"
                    : `text-xs tracking-[0.18em] uppercase transition-colors ${
                        onHero
                          ? "text-background/90 hover:text-gold-soft [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
                          : "text-muted-foreground hover:text-foreground"
                      }`
                }
                activeProps={isGold ? undefined : { className: onHero ? "text-gold-soft" : "text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <a
            href={BOOKING_URL}
            className="font-display hidden md:inline-flex items-center whitespace-nowrap px-6 py-2.5 text-[0.7rem] tracking-[0.22em] uppercase bg-primary text-primary-foreground hover:bg-foreground transition-colors shadow-soft rounded-full"
          >
            Book Now
          </a>
          <button
            className={`lg:hidden w-10 h-10 inline-flex items-center justify-center ${onHero ? "text-background" : ""}`}
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
          <nav className="flex flex-col px-6 py-6 gap-1">
            {links.map((l) => {
              const isGold = "gold" in l && l.gold;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={
                    isGold
                      ? "py-3 text-sm tracking-[0.2em] uppercase font-bold bg-[linear-gradient(110deg,#a87a2a_0%,#f4cf6b_20%,#fff4c4_45%,#f4cf6b_60%,#a87a2a_100%)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[gold-shimmer_3s_linear_infinite] border-b border-border/40 last:border-0"
                      : "py-3 text-sm tracking-[0.2em] uppercase text-foreground/80 hover:text-foreground border-b border-border/40 last:border-0"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
            <a
              href={BOOKING_URL}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex justify-center px-6 py-3 text-xs tracking-[0.22em] uppercase bg-primary text-primary-foreground rounded-full"
            >
              Book Appointment
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
