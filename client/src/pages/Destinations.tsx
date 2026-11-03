import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { useConsultation } from "@/components/ConsultationDialog";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import { COUNTRIES } from "@/lib/countries";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  DESTINATIONS                                                          *
 *                                                                        *
 *  The index: ten compact cards, about half the footprint of the old     *
 *  ones, each opening that country's own page. The expand-in-place       *
 *  accordion and its chevron are gone; the detail has a page now, so a   *
 *  card only has to say which country it is and invite the click.        *
 *                                                                        *
 *  The grid carries the landing page's moving fill: one card holds the   *
 *  navy at rest and hands it to whichever card the pointer is on.        *
 * ====================================================================== */

export default function Destinations() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const page = content.destinationsPage;

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ---- hero: the same navy field the landing page opens on ---- */}
      <section className="lp-field-ink" aria-labelledby="dest-hero">
        <div className="lp-frame lp-grid items-center py-16 md:py-24">
          <div className="col-span-12 lg:col-span-6">
            <Reveal
              as="h1"
              id="dest-hero"
              className="lp-display mt-3"
              y={18}
              delay={60}
            >
              {page.heroTitle} {page.heroHighlight}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={130}>
              {page.heroSubtitle}
            </Reveal>
            <Reveal className="mt-8 lp-btn-row" delay={200}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => openConsultation("Destinations")}
              >
                Book a consultation
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </Reveal>
          </div>

          {/* One picture rather than a grid of four: a page about ten
              destinations wants a single image of the thing they have in
              common, and a passport full of stamps is exactly that. */}
          <Reveal className="col-span-12 lg:col-span-6" y={20} delay={160}>
            <span className="lp-media block aspect-[4/3] w-full lg:aspect-square">
              <img
                src={asset("/images/slots/passport-stamps.jpg")}
                alt="An open passport showing border entry stamps"
                width={1200}
                height={1200}
                decoding="async"
                className="lp-drift"
              />
            </span>
          </Reveal>
        </div>
      </section>

      {/* ---- the ten ---- */}
      <section className="lp-section" aria-labelledby="dest-grid">
        <div className="lp-frame">
          <h2 id="dest-grid" className="sr-only">
            Every destination
          </h2>

          <ul className="lp-swap grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COUNTRIES.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={Math.min(i, 7) * 45} y={14}>
                <Link
                  href={`/destinations/${c.slug}`}
                  className={`lp-card lp-swap-item block h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-card-media">
                    <img
                      src={asset(`/images/world/${c.slug}.jpg`)}
                      alt=""
                      width={480}
                      height={320}
                      loading={i < 4 ? undefined : "lazy"}
                      decoding="async"
                    />
                  </span>
                  <span className="lp-card-body">
                    <span className="lp-card-title">{c.name}</span>
                    <span className="lp-small lp-gold mt-0.5 block">
                      {c.intakes}
                    </span>
                    <span className="lp-small lp-card-more mt-2 inline-flex items-center gap-1.5">
                      Explore
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- why study abroad at all ---- */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="why-abroad"
      >
        <div className="lp-frame">
          <Reveal
            as="h2"
            id="why-abroad"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            {page.whyTitle} {page.whyHighlight}
          </Reveal>
          <ul className="lp-swap mt-10 grid gap-3 sm:grid-cols-3">
            {page.whyCards.map((card, i) => (
              <Reveal as="li" key={card.id} delay={i * 70} y={14}>
                <div
                  className={`lp-panel lp-panel-plain lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-rule" aria-hidden="true" />
                  <h3
                    className="mt-4 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{card.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- close ---- */}
      <section className="lp-field-gold" aria-labelledby="dest-cta">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <Reveal as="h2" id="dest-cta" className="lp-head" y={14}>
              {page.ctaTitle}
            </Reveal>
            <Reveal as="p" className="lp-body mt-3 max-w-[52ch]" delay={70}>
              {page.ctaSubtitle}
            </Reveal>
          </div>
          <Reveal delay={130}>
            <button
              type="button"
              className="lp-btn"
              onClick={() => openConsultation("Destinations")}
            >
              Book a consultation
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
