import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { WhatsAppButton } from "@/components/WhatsAppButton";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Crème de la Crème Nails ®" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Crème de la Crème Nails ®" },
      { property: "og:title", content: "Crème de la Crème Nails ®" },
      { name: "twitter:title", content: "Crème de la Crème Nails ®" },
      { name: "description", content: "A luxury nail salon offering premium services, memberships, and online booking — since 2010." },
      { property: "og:description", content: "A luxury nail salon offering premium services, memberships, and online booking — since 2010." },
      { name: "twitter:description", content: "A luxury nail salon offering premium services, memberships, and online booking — since 2010." },
      { name: "theme-color", content: "#0a0a0a" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NailSalon",
          name: "Crème de la Crème Nails",
          description: "A luxury nail salon offering premium services, memberships, and online booking — since 2010.",
          url: "https://cremedelacremenails.com",
          image: "https://cremedelacremenails.com/favicon.png",
          priceRange: "$$$",
          foundingDate: "2010",
        }),
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;0,900;1,500;1,700&family=Montserrat:wght@400;500;600;700;800;900&family=Oswald:wght@500;600;700&family=Anton&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname } = useLocation();
  // Hide on admin/auth screens to keep them uncluttered
  const hideChat = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  return (
    <>
      <Outlet />
      {!hideChat && <WhatsAppButton />}
    </>
  );
}
