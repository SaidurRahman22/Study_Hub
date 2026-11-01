import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { CountUp, Reveal, ScrollProgress } from "@/components/Reveal";
import HeroGlobe from "@/components/HeroGlobe";
import { asset } from "@/lib/asset";
import { useConsultation } from "@/components/ConsultationDialog";

/* ====================================================================== *
 *  THE LANDING PAGE                                                      *
 *                                                                        *
 *  Section order follows nhpeducationconsultants.com, at the client's    *
 *  request. The design language is Swiss: a twelve-column grid, a        *
 *  restrained type scale, surfaces told apart by a step in tone rather   *
 *  than by lines or shadows, and one accent, the logo's gold, carried    *
 *  on the action and almost nothing else.                                *
 *                                                                        *
 *  The copy is a visa consultancy's, not a language school's: the page   *
 *  leads with admissions and visa filing, and treats IELTS and Japanese  *
 *  as one stage of the work rather than the subject of the site.         *
 *                                                                        *
 *  Four of NHP's sections have no Study Hub equivalent. They are driven  *
 *  by the empty arrays below and render only once filled, so the page    *
 *  never shows an empty shell and never shows an invented number.        *
 * ====================================================================== */

/** Visa approval rates by country, e.g. `{ country: "UK", rate: 92 }`. */
const VISA_SUCCESS: { country: string; rate: number }[] = [];
/** Accreditations and agent authorisations actually held. */
const RECOGNITIONS: { name: string; issuer: string; logo?: string }[] = [];
/** Upcoming seminars, spot assessments and university visits. */
const EVENTS: { title: string; place: string; date: string; href?: string }[] =
  [];
/** Universities Study Hub is an authorised representative for. Where a
 *  student ended up is not the same claim as a partnership. */
const PARTNERS: { name: string; country: string; logo?: string }[] = [];

const COUNTRY_PHOTO: Record<string, string> = {
  Australia: asset("/images/world/australia.jpg"),
  Canada: asset("/images/world/canada.jpg"),
  Italy: asset("/images/world/italy.jpg"),
  Malta: asset("/images/world/malta.jpg"),
  "South Korea": asset("/images/world/south-korea.jpg"),
  UK: asset("/images/world/united-kingdom.jpg"),
  Japan: asset("/images/world/japan.jpg"),
  Cyprus: asset("/images/world/cyprus.jpg"),
  Russia: asset("/images/world/russia.jpg"),
  Denmark: asset("/images/world/denmark.jpg"),
};

const INTAKES: Record<string, string> = {
  Australia: "Feb · Jul",
  Canada: "Jan · May · Sep",
  Italy: "Sep · Feb",
  Malta: "Oct · Feb",
  "South Korea": "Mar · Sep",
  UK: "Jan · Sep",
  Japan: "Apr · Oct",
  Cyprus: "Sep · Jan",
  Russia: "Sep",
  Denmark: "Aug · Jan",
};

/** The three stages the office works in. Language sits inside stage one
 *  rather than being the headline of the business. */
const STAGES = [
  {
    title: "Counselling and offer",
    body: "We work out which country, course and intake fit your results and your budget, then prepare and submit the university application.",
    items: [
      "Course and country counselling",
      "University admission processing",
      "Motivation letter and SOP",
      "Scholarship opportunities",
    ],
  },
  {
    title: "Language and documents",
    body: "Where the offer needs a test score, we train for it in-house. Everything else in the file is prepared and checked before it is sent.",
    items: [
      "IELTS preparation and mock tests",
      "Japanese, N5 to advanced",
      "Profile review and feedback",
      "Document preparation",
    ],
  },
  {
    title: "Visa, bank and departure",
    body: "We prepare and file the student visa application together with the financial documents the embassy will ask to see.",
    items: [
      "Visa guidance and documentation",
      "Bank support and financial documents",
      "International job visa, SSW and TITP",
      "Pre-departure guidance",
    ],
  },
];

export default function Home() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const {
    home,
    about,
    destinations,
    successStories,
    successPage,
    contact,
    global: g,
  } = content;

  const tel = (n: string) =>
    `tel:+880${n.replace(/\D/g, "").replace(/^0/, "")}`;
  const wa = `https://wa.me/880${g.whatsapp.replace(/\D/g, "").replace(/^0/, "")}`;

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO ============ */}
      {/* The hero is a full navy field, the way the reference site does it:
          the globe glows on it instead of washing out, and the header and
          utility bar above continue the same block. Everything below the
          figures strip returns to white. */}
      <section
        className="lp-field-ink relative flex flex-col justify-center overflow-hidden"
        style={{ minHeight: "min(42rem, calc(100svh - 8rem))" }}
        aria-labelledby="hero-title"
      >
        <div className="lp-hero-stage pointer-events-auto absolute inset-x-0 bottom-0 top-[50svh] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[58%]">
          <HeroGlobe />
        </div>

        {/* The wrapper spans the full width so the copy keeps the page's
            margins, which means it lies over the canvas on the right. Left
            clickable it swallowed every mouse press meant for the globe, so
            the globe could not be dragged at all. The frame lets pointers
            through; only the copy block itself takes them back. */}
        <div className="lp-frame pointer-events-none relative z-10 w-full">
          <div className="pointer-events-auto max-w-[36rem] pb-[44svh] pt-8 lg:max-w-[48%] lg:pb-0 lg:pt-0">
            <Reveal as="p" className="lp-meta" y={10}>
              {home.hero.badge}
            </Reveal>
            <Reveal
              as="h1"
              id="hero-title"
              className="lp-display mt-3"
              y={18}
              delay={60}
            >
              {home.hero.title} {home.hero.titleHighlight}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={130}>
              {home.hero.description}
            </Reveal>
            <Reveal className="mt-7 flex flex-wrap gap-3" delay={200}>
              <button
                type="button"
                onClick={() => openConsultation("Home")}
                className="lp-btn"
                data-hero-cta
              >
                {home.hero.ctaButton}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a href="#countries" className="lp-btn lp-btn-quiet">
                {home.hero.learnMoreButton}
              </a>
            </Reveal>
            <Reveal
              as="p"
              className="lp-small lp-soft mt-6 max-w-[46ch]"
              delay={270}
            >
              We prepare and file the application. The decision rests with the
              university and the embassy.
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ FIGURES: a slim navy strip, not three giant tiles ====== */}
      <section className="lp-field-ink" aria-labelledby="figures-title">
        <div className="lp-frame py-10 md:py-12">
          <h2 id="figures-title" className="sr-only">
            Study Hub BD in numbers
          </h2>
          <dl className="grid grid-cols-3 gap-6 md:gap-10">
            {[
              home.hero.stats[0] ?? { value: "500+", label: "Students placed" },
              home.hero.stats[1] ?? { value: "50+", label: "Universities" },
              home.hero.stats[2] ?? { value: "10+", label: "Countries" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 70} y={12}>
                <dt className="sr-only">{s.label}</dt>
                <dd
                  className="lp-gold font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-head)",
                    lineHeight: 1.1,
                  }}
                >
                  <CountUp value={s.value} />
                </dd>
                <p className="lp-small lp-soft mt-1">{s.label}</p>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ CONSULTATION CALLOUT ============ */}
      <section className="lp-field-gold" aria-labelledby="consult-title">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-10">
          <div>
            <Reveal as="h2" id="consult-title" className="lp-sub" y={12}>
              Book a consultation before you apply
            </Reveal>
            <Reveal
              as="p"
              className="lp-small mt-2 max-w-[56ch] opacity-80"
              delay={70}
            >
              Come to the office on Mymensingh Road, or send a message and we
              will call you back.
            </Reveal>
          </div>
          <Reveal className="flex flex-wrap gap-3" delay={120}>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn"
            >
              Book a consultation
            </a>
            <a href={tel(g.phone1)} className="lp-btn lp-btn-quiet">
              {g.phone1}
            </a>
          </Reveal>
        </div>
      </section>

      {/* ============ COUNTRIES: a clean card grid ============= */}
      <section
        id="countries"
        className="lp-section"
        aria-labelledby="countries-title"
      >
        <div className="lp-frame">
          <SectionHead
            id="countries-title"
            meta="Destinations"
            title={`${home.destinationsSection.title} ${home.destinationsSection.titleHighlight}`}
            lead={home.destinationsSection.subtitle}
          />

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {destinations.map((country, i) => (
              <Reveal
                as="li"
                key={country.id}
                delay={Math.min(i, 5) * 45}
                y={14}
              >
                <Link
                  href="/destinations"
                  className="lp-panel lp-panel-hover block !p-0 overflow-hidden"
                >
                  <span className="lp-media block aspect-[4/3] !rounded-none">
                    <PhotoOrFlag
                      src={COUNTRY_PHOTO[country.name]}
                      flag={country.flag}
                    />
                  </span>
                  <span className="block px-3.5 py-3">
                    <span
                      className="lp-body block font-medium"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {country.name}
                    </span>
                    {INTAKES[country.name] && (
                      <span className="lp-small lp-gold mt-0.5 block">
                        {INTAKES[country.name]}
                      </span>
                    )}
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>

          <Reveal className="mt-8" delay={120}>
            <Link href="/destinations" className="lp-link lp-body font-medium">
              Every country in detail →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="lp-section lp-field-step" aria-labelledby="why-title">
        <div className="lp-frame">
          <SectionHead
            id="why-title"
            meta="Why us"
            title={`${about.whyChooseTitle} ${about.whyChooseHighlight}`}
          />
          <ul className="lp-swap mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {about.whyChooseUs.map((item, i) => (
              <Reveal as="li" key={item.id} delay={i * 60} y={14}>
                <div
                  className={`lp-panel lp-panel-plain lp-swap-item ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-rule" aria-hidden="true" />
                  <h3
                    className="mt-4 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ WHAT MAKES US DIFFERENT ============ */}
      <section className="lp-section" aria-labelledby="diff-title">
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-4">
            <Reveal as="p" className="lp-meta" y={10}>
              About us
            </Reveal>
            <Reveal
              as="h2"
              id="diff-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              What makes us different
            </Reveal>
            <Reveal as="p" className="lp-body lp-soft mt-4" delay={110}>
              {about.hero.subtitle}
            </Reveal>
            <Reveal className="mt-6" delay={160}>
              <Link href="/about" className="lp-link lp-body font-medium">
                More about Study Hub BD →
              </Link>
            </Reveal>
          </div>

          <div className="lp-swap col-span-12 grid gap-3 sm:grid-cols-2 lg:col-span-8">
            <Reveal delay={60}>
              <div className="lp-panel lp-swap-item lp-swap-lead">
                <p className="lp-meta">Our mission</p>
                <p className="lp-body mt-3">{about.mission}</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="lp-panel lp-swap-item">
                <p className="lp-meta">Our vision</p>
                <p className="lp-body lp-soft mt-3">{about.vision}</p>
              </div>
            </Reveal>
            {about.values.map((v, i) => (
              <Reveal key={v.id} delay={180 + i * 60}>
                <div className="lp-panel lp-swap-item">
                  <h3
                    className="font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {v.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{v.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VISA SUCCESS: appears once real rates exist =========== */}
      {VISA_SUCCESS.length > 0 && (
        <section
          className="lp-section lp-field-step"
          aria-labelledby="visa-title"
        >
          <div className="lp-frame">
            <SectionHead
              id="visa-title"
              meta="Outcomes"
              title="Visa success rate"
            />
            <ul className="mt-10 max-w-[44rem] space-y-5">
              {VISA_SUCCESS.map((v, i) => (
                <Reveal as="li" key={v.country} delay={i * 60} y={12}>
                  <p className="lp-body flex items-baseline justify-between font-medium">
                    <span>{v.country}</span>
                    <span className="lp-gold">{v.rate}%</span>
                  </p>
                  <span
                    className="mt-2 block h-1.5 rounded-full"
                    style={{ background: "var(--color-ground-3)" }}
                    role="img"
                    aria-label={`${v.country}: ${v.rate} per cent`}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${v.rate}%`,
                        background: "var(--color-golden)",
                      }}
                    />
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ============ HOW WE WORK: three numbered stages ============= */}
      <section className="lp-section lp-field-step" aria-labelledby="how-title">
        <div className="lp-frame">
          <SectionHead
            id="how-title"
            meta="Process"
            title="How we work"
            lead="From the first counselling session to the day the embassy decides, one office handles every stage."
          />

          <ol className="lp-swap mt-10 grid gap-3 lg:grid-cols-3">
            {STAGES.map((stage, i) => (
              <Reveal as="li" key={stage.title} delay={i * 80} y={16}>
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
                  <ul className="mt-4 space-y-1.5">
                    {stage.items.map(it => (
                      <li key={it} className="lp-body flex gap-2.5">
                        <span className="lp-bullet" aria-hidden="true" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal className="mt-8" delay={120}>
            <Link href="/services" className="lp-link lp-body font-medium">
              All services in detail →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ TESTIMONIALS: quotes lead, portraits are incidental === */}
      <section className="lp-section" aria-labelledby="stories-title">
        <div className="lp-frame">
          <SectionHead
            id="stories-title"
            meta="Students"
            title={`${successPage.testimonialTitle} ${successPage.testimonialHighlight}`}
          />

          <ul className="lp-swap mt-10 grid gap-3 md:grid-cols-2">
            {successPage.testimonials.map((t, i) => (
              <Reveal as="li" key={t.id} delay={i * 70} y={14}>
                <figure
                  className={`lp-panel lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <blockquote
                    className="lp-sub"
                    style={{ fontWeight: 400, maxWidth: "46ch" }}
                  >
                    “{t.quote}”
                  </blockquote>
                  <figcaption
                    className={`lp-small mt-4 ${i === 0 ? "lp-meta" : "lp-soft"}`}
                  >
                    {t.author}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>

          {/* where they actually landed: the substance, as a compact list */}
          <Reveal as="h3" className="lp-sub mt-14" y={12}>
            Where they landed
          </Reveal>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {successStories.map((student, i) => (
              <Reveal
                as="li"
                key={student.id}
                delay={Math.min(i, 5) * 45}
                y={10}
                className="flex items-center gap-3"
              >
                <span
                  className="lp-media h-11 w-11 flex-none !rounded-full"
                  aria-hidden="true"
                >
                  <img
                    src={student.image}
                    alt=""
                    width={88}
                    height={88}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: "50% 25%" }}
                  />
                </span>
                <span className="min-w-0">
                  <span className="lp-body block font-medium leading-tight">
                    {student.name}
                  </span>
                  <span className="lp-small lp-soft block leading-tight">
                    {student.university} ·{" "}
                    <span className="lp-gold">{student.country}</span>
                  </span>
                </span>
              </Reveal>
            ))}
          </ul>

          <Reveal className="mt-8" delay={120}>
            <Link
              href="/success-stories"
              className="lp-link lp-body font-medium"
            >
              All success stories →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ RECOGNITIONS / EVENTS / PARTNERS: data-gated ========== */}
      {RECOGNITIONS.length > 0 && (
        <section
          className="lp-section lp-field-step"
          aria-labelledby="recog-title"
        >
          <div className="lp-frame">
            <SectionHead
              id="recog-title"
              meta="Credentials"
              title="Authorisation and certificates"
            />
            <ul className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {RECOGNITIONS.map((r, i) => (
                <Reveal as="li" key={r.name} delay={i * 50} y={12}>
                  <div className="lp-panel lp-panel-plain">
                    {r.logo && (
                      <img
                        src={asset(r.logo)}
                        alt=""
                        width={160}
                        height={64}
                        loading="lazy"
                        className="h-12 w-auto"
                      />
                    )}
                    <p className="lp-body mt-3 font-medium">{r.name}</p>
                    <p className="lp-small lp-soft">{r.issuer}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {EVENTS.length > 0 && (
        <section className="lp-section" aria-labelledby="events-title">
          <div className="lp-frame">
            <SectionHead
              id="events-title"
              meta="Diary"
              title="Events and university visits"
            />
            <ul className="mt-10 grid gap-3 lg:grid-cols-3">
              {EVENTS.map((e, i) => (
                <Reveal
                  as="li"
                  key={`${e.title}-${e.date}`}
                  delay={i * 70}
                  y={14}
                >
                  <div className="lp-panel h-full">
                    <p className="lp-meta">{e.date}</p>
                    <h3 className="lp-sub mt-2">{e.title}</h3>
                    <p className="lp-small lp-soft mt-2">{e.place}</p>
                    {e.href && (
                      <a
                        href={e.href}
                        className="lp-link lp-small mt-3 inline-block"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Register
                      </a>
                    )}
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {PARTNERS.length > 0 && (
        <section
          className="lp-section lp-field-step"
          aria-labelledby="partners-title"
        >
          <div className="lp-frame">
            <SectionHead
              id="partners-title"
              meta="Network"
              title="Universities we represent"
            />
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {PARTNERS.map((p, i) => (
                <Reveal as="li" key={p.name} delay={Math.min(i, 8) * 40} y={10}>
                  <div className="lp-panel lp-panel-plain">
                    {p.logo ? (
                      <img
                        src={asset(p.logo)}
                        alt={p.name}
                        width={160}
                        height={64}
                        loading="lazy"
                        className="h-10 w-auto"
                      />
                    ) : (
                      <p className="lp-small font-medium">{p.name}</p>
                    )}
                    <p className="lp-small lp-soft mt-1">{p.country}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ============ ENQUIRY + VISIT ============ */}
      <section className="lp-section" aria-labelledby="visit-title">
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-5">
            <Reveal as="p" className="lp-meta" y={10}>
              Contact
            </Reveal>
            <Reveal
              as="h2"
              id="visit-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              {home.ctaSection.title}
            </Reveal>
            <Reveal as="p" className="lp-body lp-soft mt-4" delay={110}>
              {home.ctaSection.subtitle}
            </Reveal>

            <Reveal className="mt-7 flex flex-wrap gap-3" delay={160}>
              <button
                type="button"
                onClick={() => openConsultation("Home")}
                className="lp-btn"
              >
                {home.ctaSection.buttonText}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn-quiet"
              >
                Book a consultation
              </a>
            </Reveal>

            <Reveal className="mt-8" delay={210}>
              <dl className="lp-body space-y-2.5">
                <div>
                  <dt className="lp-small lp-soft">Office</dt>
                  <dd>
                    <a
                      href={contact.mapDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lp-link"
                    >
                      {g.address}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="lp-small lp-soft">Phone</dt>
                  <dd className="flex flex-wrap gap-x-4">
                    <a href={tel(g.phone1)} className="lp-link">
                      {g.phone1}
                    </a>
                    <a href={tel(g.phone2)} className="lp-link">
                      {g.phone2}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="lp-small lp-soft">Email</dt>
                  <dd>
                    <a href={`mailto:${g.email}`} className="lp-link">
                      {g.email}
                    </a>
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <Reveal className="col-span-12 lg:col-span-7" y={18} delay={80}>
            <span className="lp-media block aspect-[16/10] w-full">
              <img
                src={asset("/images/tangail/dc-lake-sign.jpg")}
                alt="The name Tangail set in stone at the DC Lake, in Bengali and Latin letters"
                width={1200}
                height={750}
                decoding="async"
                className="lp-drift"
              />
            </span>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

/** One heading treatment for the whole page: a small gold label, the
 *  heading, and an optional lead. Used everywhere so no two sections
 *  introduce themselves differently. */
function SectionHead({
  id,
  meta,
  title,
  lead,
}: {
  id: string;
  meta: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-[46rem]">
      <Reveal as="p" className="lp-meta" y={10}>
        {meta}
      </Reveal>
      <Reveal as="h2" id={id} className="lp-head mt-3" y={14} delay={50}>
        {title}
      </Reveal>
      {lead && (
        <Reveal as="p" className="lp-body lp-soft mt-4" delay={110}>
          {lead}
        </Reveal>
      )}
    </div>
  );
}

/** The country photograph, falling back to the flag if the file is absent. */
function PhotoOrFlag({ src, flag }: { src?: string; flag: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) {
    return (
      <span className="grid h-full w-full place-items-center text-3xl">
        {flag}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={320}
      height={240}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
