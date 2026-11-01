import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { useConsultation } from "@/components/ConsultationDialog";
import { CountUp, Reveal, ScrollProgress } from "@/components/Reveal";
import { COUNTRIES } from "@/lib/countries";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  ABOUT                                                                 *
 *                                                                        *
 *  The idea the page is built on: this is not a Dhaka chain. It is one   *
 *  office on Mymensingh Road, at the Kumudini College gate in Tangail,   *
 *  that takes a student the whole way to a seat abroad. Everything is    *
 *  arranged around that — the place first, then the work, then what the  *
 *  office holds to, then where to find it.                               *
 *                                                                        *
 *  Nothing here claims a number the client has not already published.    *
 *  The figures come from the CMS, the service list is the real one, and  *
 *  the destination count is read off the data rather than typed in.      *
 * ====================================================================== */

/** The narrative. It describes how the office works today — no founding
 *  date and no origin story, because neither is documented anywhere we
 *  can check. */
const STORY = [
  "You do not have to go to Dhaka for this. The office is on Mymensingh Road in Tangail, at the Kumudini College gate, and you can walk in and sit across a desk from the person who will handle your file.",
  "What happens inside is the whole job rather than one slice of it. Counselling on course and country comes first — including the unwelcome answer, that a result is not strong enough yet or that a budget does not reach the country a student had in mind. Then the university application, the motivation letter and the statement of purpose.",
  "The language training is in the same building. IELTS, Spoken English and Japanese are taught here, so one team is accountable for both the score and the application it supports. So is the part that files are rejected over: the bank documents and the financial papers an embassy reads closely.",
];

/** The district, in four public-domain photographs. None of them shows the
 *  office — they show the town it is in, which is the point of the section
 *  they sit in. */
const TANGAIL = [
  {
    src: "/images/tangail/atia-mosque.jpg",
    alt: "The Atia Mosque in Tangail, a terracotta mosque dating from the Mughal period",
  },
  {
    src: "/images/tangail/dc-lake.jpg",
    alt: "The DC Lake in Tangail town",
  },
  {
    src: "/images/tangail/handloom-weaver.jpg",
    alt: "A weaver at a pit handloom in Berabuchina village, Tangail, working a saree in orange and gold",
  },
  {
    src: "/images/tangail/dyed-yarn-drying.jpg",
    alt: "Freshly dyed cotton yarn in magenta, indigo and saffron hung on bamboo poles to dry in Aloa village, Tangail",
  },
];

/** Why a student picks this office over the next one. Each line describes
 *  a practice, not a statistic. */
const REASONS = [
  {
    title: "Counselling before commitment",
    body: "The first consultation is about whether studying abroad is right for you at all, and which countries your results actually open — not about signing you up.",
  },
  {
    title: "The language training is ours",
    body: "IELTS, Spoken English and Japanese are taught in this office, so one team is accountable for both the test score and the application it supports.",
  },
  {
    title: "The visa file is prepared here",
    body: "Financial documents, bank support, SOP and motivation letter — the parts an embassy reads hardest are written and checked in-house before anything is submitted.",
  },
  {
    title: "You can walk in",
    body: "GIIT Building, Mymensingh Road, at the Kumudini College gate. No sub-agent in another city, and no file you cannot ask about in person.",
  },
];

export default function About() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const { about, services, contact, home, global: g } = content;
  const placed = home.hero.stats[0]?.value ?? "500+";

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO ============ */}
      <section className="lp-field-ink" aria-labelledby="about-hero">
        <div className="lp-frame lp-grid items-center py-16 md:py-24">
          <div className="col-span-12 lg:col-span-5">
            <Reveal as="p" className="lp-meta" y={10}>
              About us
            </Reveal>
            <Reveal
              as="h1"
              id="about-hero"
              className="lp-display mt-3"
              y={18}
              delay={60}
            >
              {about.hero.title} {about.hero.titleHighlight}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={130}>
              {about.hero.subtitle}
            </Reveal>
            <Reveal className="mt-8 flex flex-wrap gap-3" delay={200}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => openConsultation("About")}
              >
                Book a consultation
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link href="/services" className="lp-btn lp-btn-quiet">
                What we do
              </Link>
            </Reveal>
          </div>

          {/* The Shamsul Haq Toran: the gateway arch over the road into
              Tangail town. A gate people walk through is the plainest
              possible picture of what this page is about, and the arch is
              the shape the rest of the site is built on. */}
          <Reveal className="col-span-12 lg:col-span-7" y={20} delay={160}>
            <figure className="m-0">
              <span className="lp-media block aspect-[4/3] w-full">
                <img
                  src={asset("/images/tangail/shamsul-haq-toran.jpg")}
                  alt="The Shamsul Haq Toran, the domed gateway arch over the road into Tangail town, with rickshaws and people passing underneath"
                  width={1600}
                  height={1200}
                  decoding="async"
                  className="lp-drift"
                />
              </span>
              <figcaption className="lp-small lp-soft mt-3">
                Shamsul Haq Toran, Tangail
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ============ THE STORY + THE FACTS ============ */}
      <section className="lp-section" aria-labelledby="story-title">
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-7">
            <Reveal
              as="h2"
              id="story-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              One office, from the first question to the visa
            </Reveal>
            <div className="mt-6 space-y-4">
              {STORY.map((para, i) => (
                <Reveal
                  as="p"
                  key={para.slice(0, 24)}
                  className={`lp-body ${i === 0 ? "" : "lp-soft"}`}
                  delay={110 + i * 70}
                >
                  {para}
                </Reveal>
              ))}
            </div>
          </div>

          {/* The one dark block on a white section: the facts a visitor came
              to check, in the order they tend to ask for them. */}
          <Reveal className="col-span-12 lg:col-span-5" y={18} delay={140}>
            <div className="lp-panel lp-panel-ink">
              <p className="lp-meta">At a glance</p>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="lp-small opacity-70">Office</dt>
                  <dd className="lp-body mt-0.5">
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
                  <dt className="lp-small opacity-70">Destinations</dt>
                  <dd className="lp-body mt-0.5">
                    {COUNTRIES.length} countries, from the UK to South Korea
                  </dd>
                </div>
                <div>
                  <dt className="lp-small opacity-70">Services</dt>
                  <dd className="lp-body mt-0.5">
                    {services.length}, from counselling to visa filing
                  </dd>
                </div>
                <div>
                  <dt className="lp-small opacity-70">Taught in-house</dt>
                  <dd className="lp-body mt-0.5">
                    IELTS · Spoken English · Japanese
                  </dd>
                </div>
                <div>
                  <dt className="lp-small opacity-70">Students placed</dt>
                  <dd
                    className="lp-gold mt-0.5 font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-head)",
                      lineHeight: 1.1,
                    }}
                  >
                    <CountUp value={placed} />
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ MISSION & VISION ============ */}
      {/* Set as two statements at reading-plus size rather than as two
          tinted boxes: they are the only sentences on the page written in
          the first person, and they are given the room to be read. */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="purpose-title"
      >
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-4">
            <Reveal
              as="h2"
              id="purpose-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              Mission and vision
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <Reveal delay={90}>
              <span className="lp-rule" aria-hidden="true" />
              <h3 className="lp-meta mt-4">Our mission</h3>
              <p className="lp-sub mt-2 max-w-[42ch]">{about.mission}</p>
            </Reveal>
            <Reveal className="mt-10" delay={160}>
              <span className="lp-rule" aria-hidden="true" />
              <h3 className="lp-meta mt-4">Our vision</h3>
              <p className="lp-sub lp-soft mt-2 max-w-[42ch]">{about.vision}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ WHAT WE DO ============ */}
      <section className="lp-section" aria-labelledby="work-title">
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-8">
            <Reveal
              as="h2"
              id="work-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              Everything the office does, in one list
            </Reveal>
            <Reveal as="p" className="lp-body lp-soft mt-4" delay={100}>
              Counselling, the language training, the application and the visa
              file are all handled by the same team, in the same building.
            </Reveal>
            <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {services.map((s, i) => (
                <Reveal
                  as="li"
                  key={s.id}
                  className="flex gap-3"
                  delay={Math.min(i, 8) * 40}
                  y={10}
                >
                  <span className="lp-bullet" aria-hidden="true" />
                  <span className="lp-body">{s.title}</span>
                </Reveal>
              ))}
            </ul>
            <Reveal className="mt-8" delay={180}>
              <Link href="/services" className="lp-link lp-body font-medium">
                What each one involves →
              </Link>
            </Reveal>
          </div>

          <Reveal className="col-span-12 lg:col-span-4" y={18} delay={120}>
            <figure className="m-0">
              <span className="lp-media block aspect-[4/3] w-full lg:aspect-[3/4]">
                <img
                  src={asset("/images/slots/classroom.jpg")}
                  alt="Rows of desks in a lecture theatre"
                  width={900}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                  className="lp-drift"
                />
              </span>
              <figcaption className="lp-small lp-soft mt-3">
                Rows of desks in a lecture theatre.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ============ VALUES ============ */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="values-title"
      >
        <div className="lp-frame">
          <Reveal as="p" className="lp-meta" y={10}>
            How we work
          </Reveal>
          <Reveal
            as="h2"
            id="values-title"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            What we hold to
          </Reveal>

          <ul className="lp-swap mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {about.values.map((v, i) => (
              <Reveal as="li" key={v.id} delay={i * 70} y={14}>
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
                    {v.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{v.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="lp-section" aria-labelledby="why-title">
        <div className="lp-frame lp-grid items-start">
          <div className="col-span-12 lg:col-span-5">
            <Reveal
              as="h2"
              id="why-title"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              {about.whyChooseTitle} {about.whyChooseHighlight}
            </Reveal>
            <Reveal className="mt-8" y={18} delay={120}>
              <figure className="m-0">
                <span className="lp-media block aspect-[4/3] w-full">
                  <img
                    src={asset("/images/slots/passport-stamps.jpg")}
                    alt="A passport page filled with entry stamps and a visa"
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="lp-drift"
                  />
                </span>
                <figcaption className="lp-small lp-soft mt-3">
                  A passport full of entry stamps.
                </figcaption>
              </figure>
            </Reveal>
          </div>

          <ul className="lp-swap col-span-12 grid gap-3 lg:col-span-7">
            {REASONS.map((r, i) => (
              <Reveal as="li" key={r.title} delay={60 + i * 70} y={14}>
                <div
                  className={`lp-panel lp-swap-item h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <h3
                    className="font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {r.title}
                  </h3>
                  <p className="lp-body lp-soft mt-2">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ WHERE STUDENTS GO ============ */}
      <section
        className="lp-section lp-field-step"
        aria-labelledby="where-title"
      >
        <div className="lp-frame">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal as="p" className="lp-meta" y={10}>
                Destinations
              </Reveal>
              <Reveal
                as="h2"
                id="where-title"
                className="lp-head mt-3"
                y={14}
                delay={50}
              >
                Where our students go
              </Reveal>
            </div>
            <Reveal delay={110}>
              <Link
                href="/destinations"
                className="lp-link lp-body font-medium"
              >
                All {COUNTRIES.length} destinations →
              </Link>
            </Reveal>
          </div>

          <ul className="lp-swap mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COUNTRIES.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={Math.min(i, 9) * 35} y={12}>
                <Link
                  href={`/destinations/${c.slug}`}
                  className={`lp-card lp-swap-item block h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                >
                  <span className="lp-card-media">
                    <img
                      src={asset(`/images/world/${c.slug}.jpg`)}
                      alt=""
                      width={480}
                      height={360}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="lp-card-body">
                    <span className="lp-card-title">{c.name}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ FIND US ============ */}
      <section className="lp-section" aria-labelledby="find-title">
        <div className="lp-frame lp-grid items-center">
          {/* Four pictures of the district rather than one, because the
              claim being made here is about a place, not a building. */}
          <Reveal className="col-span-12 lg:col-span-6" y={18}>
            <figure className="m-0">
              <div className="grid grid-cols-2 gap-3">
                {TANGAIL.map((t, i) => (
                  <span
                    key={t.src}
                    className="lp-media block aspect-[4/3] w-full"
                  >
                    <img
                      src={asset(t.src)}
                      alt={t.alt}
                      width={800}
                      height={600}
                      loading="lazy"
                      decoding="async"
                      className={i % 3 === 0 ? "lp-drift" : undefined}
                    />
                  </span>
                ))}
              </div>
              <figcaption className="lp-small lp-soft mt-3">
                Tangail: the Atia Mosque, the DC Lake, and the handlooms the
                district is known for.
              </figcaption>
            </figure>
          </Reveal>

          <div className="col-span-12 lg:col-span-6">
            <Reveal as="p" className="lp-meta" y={10} delay={60}>
              Find us
            </Reveal>
            <Reveal
              as="h2"
              id="find-title"
              className="lp-head mt-3"
              y={14}
              delay={110}
            >
              At the Kumudini College gate
            </Reveal>
            <Reveal as="p" className="lp-body lp-soft mt-4" delay={160}>
              The GIIT Building sits on Mymensingh Road where it meets the
              college gate. Come in with your results and your budget, and the
              first conversation will tell you where you actually stand.
            </Reveal>
            <Reveal className="mt-7 flex flex-wrap gap-3" delay={210}>
              <a
                href={contact.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn-ink"
              >
                Get directions
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <Link href="/contact" className="lp-btn lp-btn-quiet">
                Phone and email
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CLOSE ============ */}
      <section className="lp-field-gold" aria-labelledby="about-cta">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <Reveal as="h2" id="about-cta" className="lp-head" y={14}>
              {about.ctaTitle}
            </Reveal>
            <Reveal as="p" className="lp-body mt-3 max-w-[52ch]" delay={70}>
              Tell us your results and the country you have in mind. We will
              tell you what it would actually take.
            </Reveal>
          </div>
          <Reveal delay={130}>
            <button
              type="button"
              className="lp-btn lp-btn-ink"
              onClick={() => openConsultation("About")}
            >
              {about.ctaButton}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
