import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import BandCalculator from "@/components/BandCalculator";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  IELTS                                                                 *
 *                                                                        *
 *  Rebuilt in the site's own design language. This page and Contact were *
 *  the last two still on the old template: centred hero, blurred colour  *
 *  blobs, four icon cards, a gold gradient band. It also used            *
 *  `text-golden` throughout, which the brand tokens file records as      *
 *  2.1:1 on a light ground, so the headings were failing contrast while  *
 *  looking like the brand.                                               *
 *                                                                        *
 *  THE IDEA: every IELTS school in the country advertises "7+" as an     *
 *  adjective. The band scale is the one thing that belongs to IELTS and  *
 *  to nothing else — 0 to 9, in half steps, four papers collapsing into  *
 *  one number by a rule most candidates have never been told. So the     *
 *  scale is the page's spine: it opens the page as something you can     *
 *  actually move, and the programme is then described as the distance    *
 *  between where you are on it and where you need to be.                 *
 *                                                                        *
 *  The agency's own copy still comes from the CMS, every field the admin *
 *  editor exposes is rendered, and the facts about the test itself are   *
 *  hard-coded on purpose: the format belongs to the test's owner, not to *
 *  the office, and it should not drift because someone edited a page.    *
 * ====================================================================== */

/** What each paper actually is. Facts about the test, not claims about us. */
const PAPERS = [
  {
    name: "Listening",
    time: "30 minutes",
    shape: "40 questions · 4 recordings",
    body: "Four recordings, played once each: two conversations and two monologues. The same paper whichever version of the test you sit.",
  },
  {
    name: "Reading",
    time: "60 minutes",
    shape: "40 questions · 3 sections",
    body: "Academic uses three long passages from journals and books. General Training uses shorter workplace and everyday texts. No extra time to transfer answers.",
  },
  {
    name: "Writing",
    time: "60 minutes",
    shape: "2 tasks",
    body: "Task 2 is worth twice Task 1, and is the one most candidates under-prepare. Academic Task 1 describes a chart; General Training Task 1 is a letter.",
  },
  {
    name: "Speaking",
    time: "11–14 minutes",
    shape: "3 parts · with an examiner",
    body: "A real conversation, recorded: introduction, a long turn from a prompt card, then a discussion. Identical for Academic and General Training.",
  },
];

/** The decision nobody explains, and the one people get wrong. */
const VERSIONS = [
  {
    name: "Academic",
    who: "University and professional registration",
    body: "What you need for a bachelor's or master's place abroad, and for registering in a regulated profession. This is the version almost every student who walks into our office needs.",
  },
  {
    name: "General Training",
    who: "Migration, work, school below degree level",
    body: "For migration to Australia, Canada, New Zealand and the UK, and for work or training below degree level. Sitting this one for a university application means sitting the test again.",
  },
];

/* Where a band is actually read. These are destinations the office already
 * places students in, and the pictures are the site's own bundled ones, so
 * nothing here is a new claim. No per-country band number is printed: the
 * requirement is set by the university and the course, it moves, and a page
 * that guesses it would be read as a promise. */
const DESTINATIONS = [
  {
    name: "United Kingdom",
    file: "/images/world/united-kingdom.jpg",
    alt: "Tower Bridge over the Thames in London",
    body: "Universities set their own band, and UKVI rules add a separate minimum for the visa itself.",
  },
  {
    name: "Australia",
    file: "/images/world/australia.jpg",
    alt: "Sydney Opera House at close range",
    body: "The student visa carries an English requirement of its own, on top of whatever the university asks.",
  },
  {
    name: "Canada",
    file: "/images/world/canada.jpg",
    alt: "The Chateau Frontenac above Quebec City",
    body: "Most institutions publish a minimum overall band and a floor for each of the four papers.",
  },
  {
    name: "Malta",
    file: "/images/world/malta.jpg",
    alt: "A painted fishing boat at Marsaxlokk, Malta",
    body: "English-speaking, EU, and a common first step for students building toward a larger destination.",
  },
];

/** Questions the office is actually asked, answered plainly. */
const FAQS = [
  {
    q: "How long is an IELTS score valid?",
    a: "Two years from the test date. Plan the test so the score is still valid on the day the university or the embassy reads your file, not just on the day you apply.",
  },
  {
    q: "Can I retake just one paper?",
    a: "In many centres yes: One Skill Retake lets you re-sit a single paper within 60 days of the original test, if you sat it on computer. Check it is offered at your centre before you count on it.",
  },
  {
    q: "Where can I sit the test in Bangladesh?",
    a: "There are centres in Dhaka, Chattogram, Sylhet, Khulna, Rajshahi, Bogura, Cumilla, Barishal, Narayanganj and more. We help you pick the date and the centre that fit your application deadline.",
  },
  {
    q: "Computer or paper?",
    a: "The test is the same and so is the marking. On computer the result comes back in a few days rather than around two weeks, which is usually the deciding factor when a deadline is close.",
  },
  {
    q: "What band do I actually need?",
    a: "It depends on the country, the university and the course, and it is the first thing we check with you. Work out where you are with the calculator above, then let us tell you what the gap means for your plan.",
  },
];

export default function IELTS() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const ielts = content.ielts;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const stats = [
    { value: ielts.courseStats.classes, label: "Classes" },
    { value: ielts.courseStats.perWeek, label: "Classes a week" },
    { value: ielts.courseStats.mockTests, label: "Mock test" },
    { value: ielts.courseStats.support, label: "Support" },
  ].filter(s => s.value);

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO — the scale, as something you can move ============ */}
      <section className="lp-field-ink" aria-labelledby="ielts-hero">
        {/* Three children, so the phone can order them differently from the
            desktop. Stacked, the buttons go BELOW the calculator: a pill
            button sitting directly above the big band number reads as a
            label above a headline, which is the one shape this design system
            bans. On desktop the calculator spans both rows on the right and
            the text and buttons stack on the left, as before. */}
        <div className="lp-frame flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-6 lg:items-center py-16 md:py-24">
          <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1">
            <Reveal
              as="h1"
              id="ielts-hero"
              className="lp-display"
              y={18}
              delay={60}
            >
              {ielts.hero.title} {ielts.hero.titleHighlight}{" "}
              {ielts.hero.titleSuffix}
            </Reveal>
            <RichText
              as="p"
              className="lp-lead mt-5 opacity-85"
              text={ielts.hero.description}
            />
          </div>

          {/* The live thing sits in the hero rather than further down,
              because it is the fastest honest answer to the question the
              visitor actually arrived with: how far off am I? */}
          <Reveal
            className="lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:row-span-2"
            y={20}
            delay={160}
          >
            <BandCalculator target={7} tone="ink" />
          </Reveal>

          <Reveal
            className="flex flex-wrap gap-3 lg:col-span-6 lg:col-start-1 lg:row-start-2"
            delay={200}
          >
            <button
              type="button"
              className="lp-btn"
              onClick={() => openConsultation("IELTS")}
            >
              {ielts.hero.ctaButton || "Book a consultation"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <a href="#programme" className="lp-btn lp-btn-quiet">
              See the programme
            </a>
          </Reveal>
        </div>
      </section>

      {/* ============ THE FOUR PAPERS ============ */}
      <section className="lp-section" aria-labelledby="ielts-papers">
        <div className="lp-frame">
          <Reveal
            as="h2"
            id="ielts-papers"
            className="lp-head mt-3"
            y={14}
            delay={50}
          >
            Four papers, one number
          </Reveal>
          <Reveal as="p" className="lp-body lp-soft mt-4 max-w-[58ch]" delay={90}>
            Two hours and forty-five minutes of written papers, sat in one
            sitting, and a speaking test that may be on another day. The
            scores average into the band above.
          </Reveal>

          <div className="lp-grid mt-10">
            {PAPERS.map((paper, i) => (
              <Reveal
                key={paper.name}
                className="col-span-12 sm:col-span-6 lg:col-span-3"
                y={16}
                delay={60 + i * 60}
              >
                <article className="lp-panel h-full p-6">
                  <span className="lp-rule" aria-hidden="true" />
                  <h3 className="lp-sub mt-4">{paper.name}</h3>
                  <p className="lp-meta mt-2">{paper.time}</p>
                  <p className="lp-small lp-soft mt-1">{paper.shape}</p>
                  <p className="lp-small lp-soft mt-3">{paper.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ACADEMIC OR GENERAL TRAINING ============ */}
      <section className="lp-section lp-field-step" aria-labelledby="ielts-version">
        <div className="lp-frame">
          <div className="lp-grid">
            <div className="col-span-12 lg:col-span-4">
              <Reveal
                as="h2"
                id="ielts-version"
                className="lp-head mt-3"
                y={14}
                delay={50}
              >
                Sit the right version
              </Reveal>
              <Reveal as="p" className="lp-body lp-soft mt-4" delay={90}>
                The two versions share the Listening and Speaking papers and
                differ in Reading and Writing. Booking the wrong one is the
                most expensive mistake a candidate can make before the test
                even starts, because the only fix is to sit it again.
              </Reveal>

              {/* Closes the far side of this column rather than leaving the
                  grid half empty under the text. */}
              <Reveal className="mt-8" y={18} delay={140}>
                <span className="lp-media block aspect-[5/4] w-full">
                  <img
                    src={asset("/images/slots/answer-sheet.jpg")}
                    alt="A hand filling in a multiple-choice answer sheet with a pencil"
                    width={1000}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="lp-drift"
                  />
                </span>
              </Reveal>
            </div>

            <div className="col-span-12 lg:col-span-8 lg:pl-6">
              <div className="lp-grid">
                {VERSIONS.map((v, i) => (
                  <Reveal
                    key={v.name}
                    className="col-span-12 sm:col-span-6"
                    y={16}
                    delay={80 + i * 80}
                  >
                    <article className="lp-panel lp-panel-plain h-full p-6">
                      <h3 className="lp-sub">{v.name}</h3>
                      <p className="lp-meta mt-2">{v.who}</p>
                      <p className="lp-small lp-soft mt-3">{v.body}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHERE THE BAND IS READ ============ */}
      <section className="lp-section" aria-labelledby="ielts-where">
        <div className="lp-frame">
          {/* Heading then its sentence, both on the left, exactly as the
              other sections on this page do it. The split heading-left /
              paragraph-right version left the two visually unaligned and
              read as two unrelated blocks. */}
          <Reveal as="h2" id="ielts-where" className="lp-head" y={14}>
            What your band opens
          </Reveal>
          <Reveal
            as="p"
            className="lp-body lp-soft mt-4 max-w-[58ch]"
            delay={90}
          >
            Every university and every visa office sets its own minimum. We
            check your target against the offer in front of you, not against a
            general figure.
          </Reveal>

          <div className="lp-grid mt-10">
            {DESTINATIONS.map((d, i) => (
              <Reveal
                key={d.name}
                className="col-span-6 lg:col-span-3"
                y={16}
                delay={60 + i * 70}
              >
                <figure className="m-0">
                  <span className="lp-media block aspect-[4/5] w-full">
                    <img
                      src={asset(d.file)}
                      alt={d.alt}
                      width={900}
                      height={1125}
                      loading="lazy"
                      decoding="async"
                      className="lp-drift"
                    />
                  </span>
                  <figcaption className="mt-3">
                    <span className="lp-sub block">{d.name}</span>
                    <span className="lp-small lp-soft mt-1 block">
                      {d.body}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8" delay={120}>
            <Link href="/destinations" className="lp-link">
              Every destination the office works with
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ THE PROGRAMME (all from the CMS) ============ */}
      <section className="lp-section" id="programme" aria-labelledby="ielts-programme">
        <div className="lp-frame">
          <div className="lp-grid items-start">
            <div className="col-span-12 lg:col-span-6">
              <Reveal
                as="h2"
                id="ielts-programme"
                className="lp-head mt-3"
                y={14}
                delay={50}
              >
                {ielts.programTitle}
              </Reveal>
              <RichText
                as="p"
                className="lp-body lp-soft mt-4"
                text={ielts.programDescription}
              />

              {stats.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {/* column-reverse so the figure reads above its label while
                      the markup keeps the term-then-definition order a
                      screen reader expects. */}
                  {stats.map((s, i) => (
                    <Reveal
                      key={s.label}
                      className="flex flex-col-reverse"
                      y={14}
                      delay={80 + i * 60}
                    >
                      <dt className="lp-small lp-soft">{s.label}</dt>
                      <dd className="lp-head m-0 lp-gold">{s.value}</dd>
                    </Reveal>
                  ))}
                </dl>
              )}

              {ielts.courseFeatures?.length > 0 && (
                <ul className="mt-8 grid gap-3 list-none p-0">
                  {ielts.courseFeatures.map((f: string, i: number) => (
                    <Reveal
                      as="li"
                      key={i}
                      className="flex gap-3"
                      y={12}
                      delay={60 + i * 50}
                    >
                      <span className="lp-bullet" aria-hidden="true" />
                      <span className="lp-body">{f}</span>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>

            <Reveal className="col-span-12 lg:col-span-6 lg:pl-6" y={20} delay={140}>
              <figure className="m-0">
                <span className="lp-media block aspect-[4/3] w-full">
                  <img
                    src={asset("/images/slots/library.jpg")}
                    alt="The reading room of Duke Humfrey's Library at the Bodleian, Oxford"
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="lp-drift"
                  />
                </span>
                {/* The bundled photographs show the world the consultancy
                    works in, never its own rooms or students. The caption
                    says what the picture is, and claims nothing more:
                    see client/src/lib/imageCredits.ts. */}
                <figcaption className="lp-small lp-soft mt-3">
                  Duke Humfrey's Library, Oxford. Classes run at the Tangail
                  office, with the application team in the same building.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CURRICULUM (CMS) ============ */}
      {ielts.curriculum?.length > 0 && (
        <section className="lp-section lp-field-step" aria-labelledby="ielts-curriculum">
          <div className="lp-frame">
            <Reveal
              as="h2"
              id="ielts-curriculum"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              What you will work on
            </Reveal>

            <div className="lp-grid mt-10">
              {ielts.curriculum.map(
                (
                  item: { id: string | number; title: string; description: string },
                  i: number
                ) => (
                  <Reveal
                    key={item.id}
                    className="col-span-12 sm:col-span-6"
                    y={16}
                    delay={60 + i * 60}
                  >
                    <article className="lp-panel lp-panel-plain h-full p-6">
                      {/* The gold rule rather than an index number: order is
                          carried by position, and 01/02/03 is one of the
                          tells this design system bans. */}
                      <span className="lp-rule" aria-hidden="true" />
                      <h3 className="lp-sub mt-4">{item.title}</h3>
                      <RichText
                        as="p"
                        className="lp-small lp-soft mt-3"
                        text={item.description}
                      />
                    </article>
                  </Reveal>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ WHY THIS PROGRAMME (CMS) ============ */}
      {ielts.whyChooseUs?.length > 0 && (
        <section className="lp-section" aria-labelledby="ielts-why">
          <div className="lp-frame">
            <Reveal
              as="h2"
              id="ielts-why"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              What the office adds
            </Reveal>

            <div className="lp-facts mt-10">
              {ielts.whyChooseUs.map(
                (
                  item: { id: string | number; title: string; description: string },
                  i: number
                ) => (
                  <Reveal
                    key={item.id}
                    className="lp-fact"
                    y={12}
                    delay={40 + i * 45}
                  >
                    <span className="lp-fact-mark" aria-hidden="true">
                      <span className="lp-bullet" />
                    </span>
                    <div>
                      <h3 className="lp-sub">{item.title}</h3>
                      <RichText
                        as="p"
                        className="lp-small lp-soft mt-1"
                        text={item.description}
                      />
                    </div>
                  </Reveal>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ FAQ ============ */}
      <section className="lp-section lp-field-step" aria-labelledby="ielts-faq">
        <div className="lp-frame">
          <div className="lp-grid">
            <div className="col-span-12 lg:col-span-4">
              <Reveal
                as="h2"
                id="ielts-faq"
                className="lp-head mt-3"
                y={14}
                delay={50}
              >
                The questions people bring in
              </Reveal>
            </div>

            <div className="col-span-12 lg:col-span-8 lg:pl-6">
              <div className="lp-facts">
                {FAQS.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    /* Separated by a step in tone, not a hairline: an open
                       answer takes the lighter ground so the boundary is a
                       surface change rather than a drawn line. */
                    <div
                      key={item.q}
                      className={isOpen ? "bg-[var(--color-ground-2)]" : ""}
                    >
                      <h3 className="m-0">
                        <button
                          type="button"
                          className="flex w-full items-start gap-4 p-5 text-left"
                          aria-expanded={isOpen}
                          aria-controls={`faq-${i}`}
                          onClick={() => setOpenFaq(isOpen ? null : i)}
                        >
                          <span className="lp-sub flex-1">{item.q}</span>
                          <span
                            className="lp-gold mt-1 shrink-0"
                            aria-hidden="true"
                          >
                            {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                          </span>
                        </button>
                      </h3>
                      {isOpen && (
                        <div id={`faq-${i}`} className="px-5 pb-5 -mt-1">
                          <p className="lp-small lp-soft max-w-[62ch]">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA (CMS) ============ */}
      <section className="lp-section lp-field-ink" aria-labelledby="ielts-cta">
        <div className="lp-frame">
          <div className="lp-grid items-center">
            <div className="col-span-12 lg:col-span-7">
              <Reveal as="h2" id="ielts-cta" className="lp-head" y={14}>
                {ielts.ctaTitle}
              </Reveal>
              <RichText
                as="p"
                className="lp-lead mt-4 opacity-85"
                text={ielts.ctaSubtitle}
              />
            </div>
            <Reveal
              className="col-span-12 lg:col-span-5 flex flex-wrap gap-3 lg:justify-end"
              y={14}
              delay={80}
            >
              <button
                type="button"
                className="lp-btn"
                onClick={() => openConsultation("IELTS")}
              >
                {ielts.ctaButton || ielts.hero.ctaButton || "Book a consultation"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link href="/contact" className="lp-btn lp-btn-quiet">
                Talk to the office
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
