import { Link } from "wouter";
import { Mail, Phone, UserRound } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";

/**
 * The contact strip above the navigation.
 *
 * It sits outside the sticky header on purpose, so it scrolls away and
 * leaves the slim nav bar behind, rather than making the sticky element
 * taller on every page.
 */
export default function UtilityBar() {
  const { content } = useCms();
  const g = content.global;

  const tel = (n: string) =>
    `tel:+880${n.replace(/\D/g, "").replace(/^0/, "")}`;

  return (
    <div className="lp-field-ink">
      <div className="lp-frame flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5">
        <p className="lp-small flex flex-wrap items-center gap-x-5 gap-y-1">
          <a
            href={tel(g.phone1)}
            className="lp-link inline-flex items-center gap-2"
          >
            <Phone size={14} aria-hidden="true" />
            {g.phone1}
          </a>
          <a
            href={tel(g.phone2)}
            className="lp-link hidden items-center gap-2 sm:inline-flex"
          >
            <Phone size={14} aria-hidden="true" />
            {g.phone2}
          </a>
          <a
            href={`mailto:${g.email}`}
            className="lp-link hidden items-center gap-2 md:inline-flex"
          >
            <Mail size={14} aria-hidden="true" />
            {g.email}
          </a>
        </p>
        <Link
          href="/student/login"
          className="lp-small lp-link inline-flex items-center gap-2"
        >
          <UserRound size={14} aria-hidden="true" />
          Student login
        </Link>
      </div>
    </div>
  );
}
