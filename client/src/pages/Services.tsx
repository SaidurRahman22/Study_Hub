import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { useConsultation } from "@/components/ConsultationDialog";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  SERVICES                                                             *
 *                                                                        *
 *  Rebuilt in the renovated design language: white ground, navy field,   *
 *  the gold on the one action, flat surfaces, the moving fill. The old   *
 *  page listed everything twice (twelve cards, then four category        *
 *  lists) and failed contrast on the grey descriptions. This version     *
 *  organises the work the way the office actually does it: three stages  *
 *  of the journey, then the four groups of services under them.          *
 *                                                                        *
 *  Everything is read from the CMS, so the office can edit it without a  *
 *  deploy, and nothing claims a figure the business has not published.   *
 * ====================================================================== */

/** The order the work happens in. Describes the service flow, which is the
 *  same flow the home page and the about page describe. */
const STAGES = [
  {
    title: "Counselling",
    body: "We work out which country, course and intake fit your results and your budget, and say so honestly before any fee is paid.",
  },
  {
    title: "Preparation",
    body: "Language training, the application, the motivation letter and the statement of purpose, all handled by one team in one office.",
  },
  {
    title: "Visa and departure",
    body: "The student visa file, the bank and financial documents the embassy reads, and the pre-departure steps once the visa is granted.",
  },
];

export default function Services() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const page = content.servicesPage;
  const services = content.services;

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO ============ */}
      <section className="lp-field-ink" aria-labelledby="svc-hero">
        <div className="lp-frame lp-grid items-center py-16 md:py-24">
          <div className="col-span-12 lg:col-span-6">
            <Reveal as="p" className="lp-meta" y={10}>
              What we do
            </Reveal>
            <Reveal
              as="h1"
              id="svc-hero"
              className="lp-display mt-3"
              y={18}
              delay={60}
            >
              {page.heroTitle} {page.heroHighlight}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={130}>
              {page.heroSubtitle}
            </Reveal>
            <Reveal className="mt-8 flex flex-wrap gap-3" delay={200}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => openConsultation("Services")}
              >
                Book a consultation
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link href="/destinations" className="lp-btn lp-btn-quiet">
                Where students go
              </Link>
            </Reveal>
          </div>

          <Reveal className="col-span-12 lg:col-span-6" y={20} delay={160}>
            <figure className="m-0">
              <span className="lp-media block aspect-[4/3] w-full">
                <img
                  src={asset("/images/slots/classroom.jpg")}
                  alt="Rows of desks in a lecture theatre"
                  width={1200}
                  height={900}
                  decoding="async"
                  className="lp-drift"
                />
              </span>
              <figcaption className="lp-small lp-soft mt-3">
                Language training and applications are handled in one office.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ============ THE WHOLE JOURNEY ============ */}
      <section className="lp-section" aria-labelledby="svc-flow">
        <div className="lp-frame">
          <Reveal as="p" className="lp-meta" y={10}>
            Start to finish
          </Reveal>
          <Reveal
            as="h2"
            id="svc-flow"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            One office, the whole journey
          </Reveal>
          <Reveal
            as="p"
            className="lp-body lp-soft mt-4 max-w-[56ch]"
            delay={100}
          >
            Whatever stage you are at, the same team sees it through. These are
            the three stages the work moves through.
          </Reveal>

          <ol className="lp-swap mt-10 grid gap-3 sm:grid-cols-3">
            {STAGES.map((stage, i) => (
              <Reveal as="li" key={stage.title} delay={i * 70} y={14}>
                <div
                  className={`lp-panel lp-panel-plain lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-rule" aria-hidden="true" />
                  <h3
                    className="mt-4 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lead)",
                    }}
                  >
                    {stage.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{stage.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ SERVICE CATEGORIES ============ */}
      <section className="lp-section lp-field-step" aria-labelledby="svc-cats">
        <div className="lp-frame">
          <Reveal as="p" className="lp-meta" y={10}>
            {page.categoriesTitle} {page.categoriesHighlight}
          </Reveal>
          <Reveal
            as="h2"
            id="svc-cats"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            Everything we handle, grouped
          </Reveal>

          <ul className="lp-swap mt-10 grid gap-3 lg:grid-cols-2">
            {page.categories.map((category, i) => (
              <Reveal as="li" key={category.id} delay={i * 70} y={14}>
                <div
                  className={`lp-panel lp-panel-plain lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-rule" aria-hidden="true" />
                  <h3
                    className="mt-4 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lead)",
                    }}
                  >
                    {category.title}
                  </h3>
                  <ul className="mt-4 grid gap-2.5">
                    {category.items.map(item => (
                      <li key={item} className="flex gap-3">
                        <span className="lp-bullet" aria-hidden="true" />
                        <span className="lp-body">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ THE FULL LIST ============ */}
      {/* Every service as its own card: lifts on hover, reveals an
          invitation, and opens the consultation pointed at that service. */}
      <section className="lp-section" aria-labelledby="svc-all">
        <div className="lp-frame">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal as="p" className="lp-meta" y={10}>
                The full list
              </Reveal>
              <Reveal
                as="h2"
                id="svc-all"
                className="lp-head mt-3"
                y={14}
                delay={50}
              >
                {services.length} services under one roof
              </Reveal>
              <Reveal
                as="p"
                className="lp-body lp-soft mt-4 max-w-[48ch]"
                delay={110}
              >
                From a first English class to the day you fly. Not sure which
                you need? Tap any one to ask about it.
              </Reveal>
            </div>
            <Reveal delay={150}>
              <button
                type="button"
                className="lp-link lp-body font-medium"
                onClick={() => openConsultation("Services")}
              >
                Talk it through with us →
              </button>
            </Reveal>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal as="li" key={s.id} delay={Math.min(i, 8) * 45} y={14}>
                <button
                  type="button"
                  className="lp-panel lp-panel-hover lp-service"
                  onClick={() => openConsultation(`Services: ${s.title}`)}
                  aria-label={`Ask about ${s.title}`}
                >
                  <span className="lp-rule" aria-hidden="true" />
                  <h3
                    className="mt-4 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lead)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{s.description}</p>
                  <span className="lp-service-more" aria-hidden="true">
                    Ask about this
                    <ArrowRight size={15} />
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ A LOOK AT THE WORK ============ */}
      {/* Real pictures of the world the services sit in. None shows the
          office itself, so the captions name what the picture is. */}
      <section className="lp-section lp-field-step" aria-labelledby="svc-look">
        <h2 id="svc-look" className="sr-only">
          A look at the work
        </h2>
        <div className="lp-frame grid gap-3 sm:grid-cols-3">
          {[
            {
              src: "/images/slots/paperwork.jpg",
              alt: "A hand writing on a sheet of paper beside a stack of documents",
              cap: "The documents an embassy reads, prepared and checked in-house.",
            },
            {
              src: "/images/slots/japanese-signage.jpg",
              alt: "Bilingual station signage in Japanese and English",
              cap: "Language training, from IELTS to Japanese.",
            },
            {
              src: "/images/slots/passport-stamps.jpg",
              alt: "A passport page filled with entry stamps and a visa",
              cap: "The visa file, filed with the financial documents.",
            },
          ].map((pic, i) => (
            <Reveal
              as="figure"
              key={pic.src}
              className="m-0"
              delay={i * 80}
              y={16}
            >
              <span className="lp-media block aspect-[4/3] w-full">
                <img
                  src={asset(pic.src)}
                  alt={pic.alt}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className={i === 0 ? "lp-drift" : undefined}
                />
              </span>
              <figcaption className="lp-small lp-soft mt-3">
                {pic.cap}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CLOSE ============ */}
      <section className="lp-field-gold" aria-labelledby="svc-cta">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <Reveal as="h2" id="svc-cta" className="lp-head" y={14}>
              {page.ctaTitle}
            </Reveal>
            <Reveal as="p" className="lp-body mt-3 max-w-[52ch]" delay={70}>
              {page.ctaSubtitle}
            </Reveal>
          </div>
          <Reveal delay={130}>
            <button
              type="button"
              className="lp-btn lp-btn-ink"
              onClick={() => openConsultation("Services")}
            >
              {page.ctaButton}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
