import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCms } from "@/contexts/CmsContext";
import { asset } from "@/lib/asset";
import { useConsultation } from "@/components/ConsultationDialog";

const NAV = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "IELTS", href: "/ielts" },
  { label: "Destinations", href: "/destinations" },
  { label: "Success Stories", href: "/success-stories" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const g = content.global;
  const h = content.header;

  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* On the landing page the bar is part of the navy block at the top of the
   * page: utility strip, navigation and hero are one field, the way the
   * reference site does it. It is NOT an overlay: the header is a sibling
   * above the hero, so leaving it transparent put white type on the white
   * page rather than on the navy. */
  const onDark =
    location === "/" ||
    location === "/about" ||
    location.startsWith("/destinations");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close on route change, so tapping a link in the drawer does not leave it open. */
  useEffect(() => setIsOpen(false), [location]);

  /* Escape closes and hands focus back to the control that opened it, and the
   * page behind the drawer does not scroll while it is up. */
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-golden focus:px-5 focus:py-3 focus:font-medium focus:text-ink"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-50 transition-shadow duration-300 ${onDark ? "lp-on-dark" : ""}`}
        style={{
          background: onDark ? "var(--color-ink-field)" : "var(--color-ground)",
          boxShadow: scrolled
            ? onDark
              ? "0 10px 30px -18px rgba(0,0,0,.9)"
              : "0 10px 30px -20px rgba(15,26,46,.45)"
            : "none",
        }}
      >
        <div className="lp-frame flex h-20 items-center justify-between gap-6 md:h-24">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label={`${g.siteName}, home`}
          >
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={48}
              height={48}
              className="h-10 w-10 transition-transform duration-300 group-hover:scale-105 md:h-12 md:w-12"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            />
            <span className="leading-none">
              <span
                className="block font-semibold tracking-[-0.03em] text-ink"
                style={{ fontSize: "var(--text-body)" }}
              >
                {g.siteName}
              </span>
              <span
                className="mt-1 hidden text-ink-soft sm:block"
                style={{ fontSize: "var(--text-small)" }}
              >
                {g.tagline}
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={location === item.href ? "page" : undefined}
                className="lp-link lp-small"
                style={
                  location === item.href
                    ? {
                        color: onDark
                          ? "var(--color-golden)"
                          : "var(--color-gold-deep)",
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openConsultation("Header")}
              className="lp-btn hidden md:inline-flex"
              style={{
                padding: "0.7rem 1.4rem",
                minHeight: 44,
                fontSize: "var(--text-small)",
              }}
            >
              {h.registerButtonText}
            </button>

            <button
              ref={toggleRef}
              type="button"
              className="-mr-2 grid h-12 w-12 place-items-center rounded-full text-ink transition-colors duration-200 hover:bg-black/5 lg:hidden"
              onClick={() => setIsOpen(v => !v)}
              aria-expanded={isOpen}
              aria-controls="mobile-nav"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            id="mobile-nav"
            ref={panelRef}
            className="lg:hidden"
            style={{
              background: "var(--color-ground)",
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, var(--color-ink) 14%, transparent)",
            }}
          >
            <nav aria-label="Main" className="lp-frame flex flex-col py-4">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={location === item.href ? "page" : undefined}
                  className="lp-body border-0 py-3 text-ink transition-colors duration-200 hover:text-golden"
                  style={
                    location === item.href
                      ? {
                          color: onDark
                            ? "var(--color-golden)"
                            : "var(--color-gold-deep)",
                        }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => openConsultation("Header")}
                className="lp-btn mt-4 w-full"
              >
                {h.registerButtonText}
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
