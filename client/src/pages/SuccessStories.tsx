import { ArrowRight, Quote } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { useConsultation } from "@/components/ConsultationDialog";
import { CountUp, Reveal, ScrollProgress } from "@/components/Reveal";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  SUCCESS STORIES                                                       *
 *                                                                        *
 *  Rebuilt in the renovated design language, and rebuilt around one      *
 *  rule: this page shows nobody's face unless Study Hub owns the         *
 *  photograph and has the student's permission.                          *
 *                                                                        *
 *  The old page put a stock photograph of a stranger next to five of the *
 *  six named students, and used the same stranger twice under two        *
 *  different names. A testimonial page is the one page on a consultancy  *
 *  site that exists to be believed, so it is the worst possible place    *
 *  for an invented face.                                                 *
 *                                                                        *
 *  So: a student is shown as a monogram unless `image` points at a file  *
 *  this site serves itself (`/images/...`). A remote URL is ignored on   *
 *  purpose. That also keeps the page free of third-party requests, which *
 *  is what the privacy and cookie notices promise.                       *
 * ====================================================================== */

/** Pale tint plus dark ink of the same hue. Each pair was measured for
 *  contrast when the student portal was built; all clear 8:1. */
const TINTS = [
  { bg: "#e8edf5", fg: "#16366b" },
  { bg: "#dcfae5", fg: "#04250e" },
  { bg: "#fdf0d5", fg: "#5c3d00" },
  { bg: "#ffedea", fg: "#831c1e" },
];

/** A stable tint per person, so the same student keeps the same colour. */
function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function initials(name: string): string {
  return name
    .replace(/^(Md\.?|Mohammad|Muhammad)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Only a photograph this site serves itself is ever rendered. Anything
 *  remote is treated as absent. */
function ownPhoto(src?: string): string | null {
  if (!src) return null;
  return src.startsWith("/images/") ? src : null;
}

/* ---------------------------------------------------------------------- *
 *  THE PICTURE ON EACH CARD                                              *
 *                                                                        *
 *  It used to be a photograph of the destination city. That said nothing *
 *  about the student it sat above, and six of them stacked down the page *
 *  read as stock filler competing with the quotes they were meant to     *
 *  support. (Those photographs are not gone — they still do their proper *
 *  job on Destinations, where the subject really is the country.)        *
 *                                                                        *
 *  These are flat vector scenes recoloured into the site's own palette:  *
 *  the accent moved to the brand gold and the figures to the brand ink,  *
 *  so the set looks drawn for this page rather than bought for it.       *
 *                                                                        *
 *  Nobody here is a portrait, which is the whole point on this page: a   *
 *  drawn figure makes no claim to be anyone, so the rule at the top of   *
 *  this file still holds.                                                *
 * ---------------------------------------------------------------------- */

/** The scenes, in the order an unmatched story takes them. */
const SCENES = [
  "around-the-world",
  "exam-prep",
  "at-the-airport",
  "doctors",
  "education",
  "next-adventure",
] as const;

/** What a story would prefer, read from what it actually says. */
function preferredScene(story: { university?: string; quote?: string }): string | null {
  const said = `${story.university ?? ""} ${story.quote ?? ""}`.toLowerCase();
  if (/medic|medical|health|nurs|pharmac|dental/.test(said)) return "doctors";
  if (/ielts|exam|test|language|training/.test(said)) return "exam-prep";
  return null;
}

/**
 * One scene per story, no two alike.
 *
 * Three of the six students here went to the same medical university, so
 * matching on the subject alone would print the same drawing three times
 * in one grid. A preference is honoured once and then gives way to the
 * next unused scene, which keeps the grid varied without anyone having to
 * pick a picture by hand when the office adds a student.
 */
function scenesFor(stories: ReadonlyArray<{ university?: string; quote?: string }>): string[] {
  const taken = new Set<string>();

  return stories.map((story, i) => {
    const wanted = preferredScene(story);
    const scene =
      wanted && !taken.has(wanted)
        ? wanted
        : SCENES.find(s => !taken.has(s)) ?? SCENES[i % SCENES.length];

    taken.add(scene);
    return scene;
  });
}

export default function SuccessStories() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const stories = content.successStories;
  /* Resolved for the whole list at once, not per card: "has this scene been
   * used yet" is a question about the grid, which a single card cannot see. */
  const scenes = scenesFor(stories);
  const page = content.successPage;
  const home = content.home;

  const figures = [
    home.hero.stats[0] ?? { value: "500+", label: "Students placed" },
    home.hero.stats[2] ?? { value: "10+", label: "Countries" },
    home.hero.stats[1] ?? { value: "50+", label: "Universities" },
  ];

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO ============ */}
      <section className="lp-field-ink" aria-labelledby="ss-hero">
        <div className="lp-frame py-16 md:py-24">
          <div className="max-w-[46rem]">
            <Reveal
              as="h1"
              id="ss-hero"
              className="lp-display mt-3"
              y={18}
              delay={60}
            >
              {page.heroTitle} {page.heroHighlight}
            </Reveal>
            <Reveal as="p" className="lp-lead lp-soft mt-5" delay={130}>
              {page.heroSubtitle}
            </Reveal>
          </div>

          {/* The office's own published figures, as the dominant element
              on the first screen rather than three icons in circles. */}
          <dl className="mt-12 grid grid-cols-3 gap-6 md:mt-16 md:gap-10">
            {figures.map((f, i) => (
              <Reveal key={f.label} delay={190 + i * 70} y={14}>
                <dt className="sr-only">{f.label}</dt>
                <dd
                  className="lp-gold font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-display)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                  }}
                >
                  <CountUp value={f.value} />
                </dd>
                <p className="lp-small lp-soft mt-1.5">{f.label}</p>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ THE STORIES ============ */}
      {stories.length > 0 && (
        <section className="lp-section" aria-labelledby="ss-stories">
          <div className="lp-frame">
            <Reveal
              as="h2"
              id="ss-stories"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              Students the office has placed
            </Reveal>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((s, i) => {
                const photo = ownPhoto(s.image);
                const scene = scenes[i];
                const tint = tintFor(s.name);
                return (
                  <Reveal as="li" key={s.id} delay={Math.min(i, 5) * 60} y={14}>
                    <figure className="lp-panel lp-panel-hover m-0 flex h-full flex-col overflow-hidden p-0">
                      <div className="ss-scene" aria-hidden="true">
                        <img
                          src={asset(`/images/illustrations/${scene}.svg`)}
                          alt=""
                          width={720}
                          height={405}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                      <Quote
                        size={20}
                        aria-hidden="true"
                        className="lp-gold"
                        style={{ opacity: 0.55 }}
                      />
                      <blockquote className="lp-body mt-3 flex-1">
                        {s.quote}
                      </blockquote>

                      <figcaption className="mt-5 flex items-center gap-3">
                        {photo ? (
                          <img
                            src={asset(photo)}
                            alt=""
                            width={44}
                            height={44}
                            loading="lazy"
                            decoding="async"
                            className="h-11 w-11 flex-none rounded-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="grid h-11 w-11 flex-none place-items-center rounded-full font-semibold"
                            style={{
                              background: tint.bg,
                              color: tint.fg,
                              fontFamily: "var(--font-display)",
                              fontSize: "var(--text-small)",
                            }}
                          >
                            {initials(s.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="lp-body block font-semibold">
                            {s.name}
                          </span>
                          <span className="lp-small lp-soft block">
                            {s.university}
                            {s.country ? ` · ${s.country}` : ""}
                          </span>
                        </span>
                      </figcaption>
                      </div>
                    </figure>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ============ WHAT STUDENTS SAY ============ */}
      {page.testimonials.length > 0 && (
        <section className="lp-section lp-field-step" aria-labelledby="ss-says">
          <div className="lp-frame">
            <Reveal
              as="h2"
              id="ss-says"
              className="lp-head mt-3"
              y={14}
              delay={50}
            >
              In their own words
            </Reveal>
            <Reveal
              as="p"
              className="lp-body lp-soft mt-4 max-w-[54ch]"
              delay={100}
            >
              These were given without a name attached, so they are published
              the way they were given.
            </Reveal>

            <ul className="lp-swap mt-10 grid gap-3 sm:grid-cols-2">
              {page.testimonials.map((t, i) => (
                <Reveal as="li" key={t.id} delay={i * 70} y={14}>
                  <figure
                    className={`lp-panel lp-panel-plain lp-swap-item m-0 h-full ${i === 0 ? "lp-swap-lead" : ""}`}
                  >
                    <span className="lp-rule" aria-hidden="true" />
                    <blockquote className="lp-lead mt-4">{t.quote}</blockquote>
                    <figcaption className="lp-small lp-gold mt-4">
                      {t.author}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ============ CLOSE ============ */}
      <section className="lp-field-gold" aria-labelledby="ss-cta">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <Reveal as="h2" id="ss-cta" className="lp-head" y={14}>
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
              onClick={() => openConsultation("SuccessStories")}
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
