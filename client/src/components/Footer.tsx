import { Link } from "wouter";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { IMAGE_CREDITS } from "@/lib/imageCredits";
import { asset } from "@/lib/asset";
import { useConsultation } from "@/components/ConsultationDialog";
import { phoneDisplay, phoneHref } from "@/lib/phone";

const PAGES: [string, string][] = [
  ["Home", "/"],
  ["About us", "/about"],
  ["Services", "/services"],
  ["Success stories", "/success-stories"],
];

const LEGAL: [string, string][] = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Refunds", "/refunds"],
  ["Complaints", "/complaints"],
  ["Cookies", "/cookies"],
  ["Data processing", "/data-processing"],
];

const PROGRAMMES: [string, string][] = [
  ["Destinations", "/destinations"],
  ["IELTS training", "/ielts"],
  ["Contact", "/contact"],
];

export default function Footer() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const g = content.global;
  const f = content.footer;
  const legal = (content as Record<string, unknown>).legal as
    | {
        tradeLicence?: string;
        binNumber?: string;
        dataContact?: { name?: string; email?: string };
      }
    | undefined;

  /* Every social handle in the CMS is still "#". A link to "#" jumps the
   * page to the top and looks broken, so an unset one is not rendered. */
  const socials = [
    {
      key: "facebook",
      Icon: Facebook,
      href: g.socialMedia.facebook,
      label: "Facebook",
    },
    {
      key: "instagram",
      Icon: Instagram,
      href: g.socialMedia.instagram,
      label: "Instagram",
    },
    {
      key: "linkedin",
      Icon: Linkedin,
      href: g.socialMedia.linkedin,
      label: "LinkedIn",
    },
    {
      key: "youtube",
      Icon: Youtube,
      href: g.socialMedia.youtube,
      label: "YouTube",
    },
  ].filter(s => s.href && s.href !== "#");

  const tel = phoneHref;

  return (
    <footer className="lp-field-ink">
      <div className="lp-frame pb-10 pt-16 md:pt-20">
        <div className="lp-grid">
          {/* the brand */}
          <div className="col-span-12 lg:col-span-4">
            <div className="flex items-center gap-3">
              <img
                src={asset("/images/logo-mark.png")}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11"
              />
              <span className="leading-tight">
                <span
                  className="block font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-body)",
                  }}
                >
                  {g.siteName}
                </span>
                <span className="lp-small lp-gold block">{g.tagline}</span>
              </span>
            </div>
            <p className="lp-body lp-soft mt-5 max-w-[38ch]">{f.about}</p>

            <button
              type="button"
              onClick={() => openConsultation("Footer")}
              className="lp-btn mt-6 inline-flex"
            >
              Start your application
            </button>

            {socials.length > 0 && (
              <div className="mt-6 flex gap-2">
                {socials.map(({ key, Icon, href, label }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-10 w-10 place-items-center rounded-lg transition-colors duration-200 hover:bg-white/10 hover:text-golden"
                    style={{ background: "rgba(255,255,255,.06)" }}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* links */}
          <nav aria-label="Pages" className="col-span-6 lg:col-span-2">
            <h2 className="lp-meta">Pages</h2>
            <ul className="mt-4 space-y-2.5">
              {PAGES.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="lp-link lp-small">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Programmes" className="col-span-6 lg:col-span-2">
            <h2 className="lp-meta">Programmes</h2>
            <ul className="mt-4 space-y-2.5">
              {PROGRAMMES.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="lp-link lp-small">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* contact */}
          <div className="col-span-12 lg:col-span-4">
            <h2 className="lp-meta">Find us</h2>
            <address className="mt-4 space-y-3 not-italic">
              <p className="lp-small lp-soft flex gap-3">
                <MapPin
                  size={16}
                  className="mt-0.5 flex-none"
                  aria-hidden="true"
                />
                <span className="max-w-[32ch]">{g.address}</span>
              </p>
              <p className="lp-small flex gap-3">
                <Phone
                  size={16}
                  className="mt-0.5 flex-none"
                  aria-hidden="true"
                />
                <span className="flex flex-wrap gap-x-4">
                  <a href={tel(g.phone1)} className="lp-link">
                    {phoneDisplay(g.phone1)}
                  </a>
                  <a href={tel(g.phone2)} className="lp-link">
                    {phoneDisplay(g.phone2)}
                  </a>
                </span>
              </p>
              <p className="lp-small flex gap-3">
                <Mail
                  size={16}
                  className="mt-0.5 flex-none"
                  aria-hidden="true"
                />
                <a href={`mailto:${g.email}`} className="lp-link">
                  {g.email}
                </a>
              </p>
            </address>
          </div>
        </div>

        {/* the close: credits, then the bottom line */}
        <div
          className="mt-16 rounded-xl px-5 py-6"
          style={{ background: "rgba(255,255,255,.05)" }}
        >
          <details className="mb-6">
            <summary className="lp-small lp-soft cursor-pointer select-none hover:text-golden">
              Photograph credits
            </summary>
            <ul className="lp-small lp-soft mt-3 space-y-1">
              {IMAGE_CREDITS.map(c => (
                <li key={c.file}>
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-link"
                  >
                    {c.title}
                  </a>{" "}
                  by {c.creator},{" "}
                  <a
                    href={c.licenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-link"
                  >
                    {c.licence}
                  </a>
                  , via Wikimedia Commons
                </li>
              ))}
            </ul>
            <p className="lp-small lp-soft mt-3 max-w-[60ch]">
              These photographs show the places Study Hub BD works with. None of
              them shows the office, its staff or its students.
            </p>
          </details>

          <nav
            aria-label="Legal"
            className="mb-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            {LEGAL.map(([label, href]) => (
              <Link key={href} href={href} className="lp-link lp-small">
                {label}
              </Link>
            ))}
          </nav>

          {/* Who to write to about data, and the numbers that say this is a
              real registered business. Both are required reading for a
              partner university's due diligence team. */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <p className="lp-small lp-soft">
              <span className="lp-gold">Data contact</span>
              <br />
              {legal?.dataContact?.name ? (
                <Placeholder text={legal.dataContact.name} />
              ) : (
                "Not yet named"
              )}
              {legal?.dataContact?.email && (
                <>
                  {" · "}
                  <a
                    href={`mailto:${legal.dataContact.email}`}
                    className="lp-link"
                  >
                    {legal.dataContact.email}
                  </a>
                </>
              )}
            </p>
            {/* A registration line whose numbers have not been supplied says
                less than no line at all: a visitor reads the literal
                "[TRADE LICENCE NUMBER]" token on the page whose job is to
                show this is a real registered business. The admin still sees
                it flagged, because `Placeholder` marks it wherever a real
                value IS present but malformed. */}
            <p className="lp-small lp-soft sm:text-right">
              <span className="lp-gold">Registered in Bangladesh</span>
              {legal?.tradeLicence && !isPlaceholder(legal.tradeLicence) && (
                <>
                  <br />
                  Trade licence <Placeholder text={legal.tradeLicence} />
                  {legal?.binNumber && !isPlaceholder(legal.binNumber) && (
                    <>
                      {" · "}BIN <Placeholder text={legal.binNumber} />
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="lp-small lp-soft">{f.copyrightText}</p>
            <p className="lp-small lp-soft">
              Student-visa filing. We prepare and submit the file; the decision
              rests with the embassy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** A fact the client still has to supply. Marked so it cannot go live
 *  unnoticed, and so a reviewer can find every one of them at a glance. */
/** An unfilled template token, e.g. "[TRADE LICENCE NUMBER]". */
function isPlaceholder(text?: string): boolean {
  return !text || /^\[[A-Z0-9 /.-]+\]$/.test(text);
}

function Placeholder({ text }: { text: string }) {
  if (/^\[[A-Z0-9 /.-]+\]$/.test(text)) {
    return (
      <mark className="lp-todo" title="To be supplied before publication">
        {text}
      </mark>
    );
  }
  return <>{text}</>;
}
