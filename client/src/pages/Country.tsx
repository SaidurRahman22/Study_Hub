import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useConsultation } from "@/components/ConsultationDialog";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  ONE COUNTRY                                                           *
 *                                                                        *
 *  Opened from a card on /destinations. The shape follows the reference  *
 *  site's country bands (a positioning line, quick facts, then the       *
 *  detail), but kept to the landing page's own type, colour and motion.  *
 *                                                                        *
 *  Every figure on this page is indicative. The cost panel says so in    *
 *  as many words rather than leaving a student to assume otherwise.      *
 * ====================================================================== */

const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export default function Country() {
  const [, params] = useRoute("/destinations/:slug");
  const { open: openConsultation } = useConsultation();
  const country = params?.slug ? getCountry(params.slug) : undefined;

  if (!country) {
    return (
      <div className="lp">
        <section className="lp-section">
          <div className="lp-frame">
            <h1 className="lp-head">We do not have a page for that country</h1>
            <p className="lp-body lp-soft mt-4 max-w-[52ch]">
              The address may be out of date. Every destination we file for is
              on the destinations page.
            </p>
            <Link href="/destinations" className="lp-btn mt-7 inline-flex">
              <ArrowLeft size={17} aria-hidden="true" />
              All destinations
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const c = country;
  const others = COUNTRIES.filter(x => x.slug !== c.slug).slice(0, 4);

  const facts: [string, string][] = [
    ["Capital", c.capital],
    ["Taught in", c.language],
    ["Intakes", c.intakes],
    [
      "Tuition a year",
      `${money(c.cost.tuitionLow, c.cost.currency)}-${money(c.cost.tuitionHigh, c.cost.currency)}`,
    ],
  ];

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ---- hero ---- */}
      <section className="lp-field-ink" aria-labelledby="country-title">
        <div className="lp-frame lp-grid items-center py-12 md:py-16">
          <div className="col-span-12 lg:col-span-6">
            <Reveal y={8}>
              <Link
                href="/destinations"
                className="lp-link lp-small inline-flex items-center gap-2"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                All destinations
              </Link>
            </Reveal>

            <Reveal as="p" className="lp-meta mt-7" y={10} delay={50}>
              {c.tagline}
            </Reveal>
            <Reveal
              as="h1"
              id="country-title"
              className="lp-display mt-3"
              y={18}
              delay={100}
            >
              Study in {c.name}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={160}>
              {c.summary}
            </Reveal>
            <Reveal className="mt-8" delay={220}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => openConsultation(`Country: ${c.name}`)}
              >
                Book a consultation
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </Reveal>
          </div>

          {/* The country's own photograph belongs on the first screen, not
              below it: left under the fold it gave the hero a third of a
              screen of empty navy and no dominant element. */}
          <Reveal className="col-span-12 lg:col-span-6" y={20} delay={180}>
            <span className="lp-media block aspect-[4/3] w-full lg:aspect-square">
              <img
                src={asset(`/images/country/${c.slug}.jpg`)}
                alt={c.name}
                width={1600}
                height={1200}
                decoding="async"
                className="lp-drift"
              />
            </span>
          </Reveal>
        </div>
      </section>

      {/* ---- quick facts ---- */}
      <section className="lp-section" aria-labelledby="facts-title">
        <div className="lp-frame">
          <h2 id="facts-title" className="sr-only">
            {c.name} at a glance
          </h2>
          <dl className="lp-swap grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facts.map(([k, v], i) => (
              <Reveal key={k} delay={i * 60} y={12}>
                <div
                  className={`lp-panel lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <dt className="lp-meta">{k}</dt>
                  <dd className="lp-body mt-2 font-medium">{v}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- life and study ---- */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="life-title"
      >
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-4">
            <Reveal as="p" className="lp-meta" y={10}>
              Living there
            </Reveal>
            <Reveal
              as="h2"
              id="life-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              Life and study in {c.name}
            </Reveal>
          </div>
          <div className="col-span-12 grid gap-3 sm:grid-cols-2 lg:col-span-8">
            <Reveal delay={60}>
              <div className="lp-panel lp-panel-plain h-full">
                <h3
                  className="lp-gold font-semibold"
                  style={{ fontSize: "var(--text-body)" }}
                >
                  Culture and daily life
                </h3>
                <p className="lp-body lp-soft mt-3">{c.culture}</p>
              </div>
            </Reveal>
            <Reveal delay={130}>
              <div className="lp-panel lp-panel-plain h-full">
                <h3
                  className="lp-gold font-semibold"
                  style={{ fontSize: "var(--text-body)" }}
                >
                  How the education system works
                </h3>
                <p className="lp-body lp-soft mt-3">{c.educationSystem}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- universities ---- */}
      <section className="lp-section" aria-labelledby="unis-title">
        <div className="lp-frame">
          <Reveal as="p" className="lp-meta" y={10}>
            Institutions
          </Reveal>
          <Reveal
            as="h2"
            id="unis-title"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            Universities students ask about
          </Reveal>
          <Reveal
            as="p"
            className="lp-body lp-soft mt-4 max-w-[56ch]"
            delay={100}
          >
            A few of the institutions that come up most often. Which one fits
            depends on your results, your subject and your budget. That is what
            the counselling session is for.
          </Reveal>

          <ul className="lp-swap mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.universities.map((u, i) => (
              <Reveal as="li" key={u.name} delay={Math.min(i, 5) * 55} y={12}>
                <div
                  className={`lp-panel lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <h3
                    className="font-semibold"
                    style={{ fontSize: "var(--text-body)" }}
                  >
                    {u.name}
                  </h3>
                  <p className="lp-small lp-gold mt-1">{u.city}</p>
                  {u.note && <p className="lp-body lp-soft mt-2">{u.note}</p>}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- what it opens up ---- */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="opps-title"
      >
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-5">
            <Reveal as="p" className="lp-meta" y={10}>
              Afterwards
            </Reveal>
            <Reveal
              as="h2"
              id="opps-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              What a degree there opens up
            </Reveal>
            <Reveal as="p" className="lp-body lp-soft mt-4" delay={100}>
              {c.economy}
            </Reveal>
          </div>

          <div className="col-span-12 grid gap-3 sm:grid-cols-2 lg:col-span-7">
            <Reveal delay={70}>
              <div className="lp-panel lp-panel-plain h-full">
                <h3
                  className="lp-gold font-semibold"
                  style={{ fontSize: "var(--text-body)" }}
                >
                  Work and residency
                </h3>
                <ul className="mt-3 space-y-2">
                  {c.opportunities.map(o => (
                    <li key={o} className="lp-body flex gap-3">
                      <span className="lp-bullet" aria-hidden="true" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="lp-panel lp-panel-plain h-full">
                <h3
                  className="lp-gold font-semibold"
                  style={{ fontSize: "var(--text-body)" }}
                >
                  Why students pick it
                </h3>
                <ul className="mt-3 space-y-2">
                  {c.benefits.map(b => (
                    <li key={b} className="lp-body flex gap-3">
                      <span className="lp-bullet" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- what it costs ---- */}
      <section className="lp-section" aria-labelledby="cost-title">
        <div className="lp-frame">
          <Reveal as="p" className="lp-meta" y={10}>
            Money
          </Reveal>
          <Reveal
            as="h2"
            id="cost-title"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            What a year costs
          </Reveal>

          <div className="mt-10 grid gap-3 lg:grid-cols-12">
            <Reveal className="lg:col-span-4" y={14} delay={60}>
              <div className="lp-panel lp-panel-ink h-full">
                <p className="lp-meta">Tuition a year</p>
                <p
                  className="mt-2 font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-head)",
                  }}
                >
                  {money(c.cost.tuitionLow, c.cost.currency)} -{" "}
                  {money(c.cost.tuitionHigh, c.cost.currency)}
                </p>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-4" y={14} delay={120}>
              <div className="lp-panel h-full">
                <p className="lp-meta">Living a year</p>
                <p
                  className="mt-2 font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-head)",
                  }}
                >
                  {money(c.cost.livingLow, c.cost.currency)} -{" "}
                  {money(c.cost.livingHigh, c.cost.currency)}
                </p>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-4" y={14} delay={180}>
              <div className="lp-panel h-full">
                <p className="lp-meta">Read this first</p>
                <p className="lp-body lp-soft mt-2">{c.cost.note}</p>
              </div>
            </Reveal>
          </div>

          <Reveal
            as="p"
            className="lp-small lp-soft mt-5 max-w-[70ch]"
            delay={240}
          >
            These are indicative bands, not quotations. Tuition differs by
            course and institution, and living costs differ sharply between
            cities. Confirm the figure with the institution before you budget on
            it. We will do that with you.
          </Reveal>
        </div>
      </section>

      {/* ---- close + the other countries ---- */}
      <section className="lp-field-gold" aria-labelledby="country-cta">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <Reveal as="h2" id="country-cta" className="lp-head" y={14}>
              Thinking about {c.name}?
            </Reveal>
            <Reveal as="p" className="lp-body mt-3 max-w-[52ch]" delay={70}>
              Tell us your results and we will tell you which institutions are
              realistic and what the file needs.
            </Reveal>
          </div>
          <Reveal delay={130}>
            <button
              type="button"
              className="lp-btn"
              onClick={() => openConsultation(`Country: ${c.name}`)}
            >
              Book a consultation
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="others-title">
        <div className="lp-frame">
          <Reveal as="h2" id="others-title" className="lp-sub" y={12}>
            Other destinations
          </Reveal>
          <ul className="lp-swap mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {others.map((o, i) => (
              <Reveal as="li" key={o.slug} delay={i * 50} y={12}>
                <Link
                  href={`/destinations/${o.slug}`}
                  className={`lp-card lp-swap-item block h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-card-media">
                    <img
                      src={asset(`/images/world/${o.slug}.jpg`)}
                      alt=""
                      width={480}
                      height={320}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="lp-card-body">
                    <span className="lp-card-title">{o.name}</span>
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
    </div>
  );
}
