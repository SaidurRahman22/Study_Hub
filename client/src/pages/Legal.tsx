import { Fragment, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import NotFound from "@/pages/NotFound";
import {
  clearConsent,
  getConsent,
  needsConsent,
  NON_ESSENTIAL,
  setConsent,
} from "@/lib/consent";

/* ====================================================================== *
 *  LEGAL DOCUMENTS                                                       *
 *                                                                        *
 *  One renderer for all of them: privacy, terms, refunds, complaints,    *
 *  cookies and the data processing statement. They share a shape in the  *
 *  CMS, so they share a page, and nobody has to remember to update six   *
 *  layouts when one heading style changes.                               *
 *                                                                        *
 *  Long-form reading, so: one column at a comfortable measure, a         *
 *  contents list that follows you down the page on desktop, and real     *
 *  tables for the retention schedule rather than prose a reader has to   *
 *  decode.                                                               *
 * ====================================================================== */

export type LegalSection = {
  id: string;
  heading: string;
  body: string[];
  list?: string[];
  table?: { columns: string[]; rows: string[][] };
};

export type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

/** Anything still in [SQUARE CAPITALS] is a fact the client has to supply.
 *  It is marked in the page so an unfilled one cannot quietly go live. */
function withPlaceholders(text: string) {
  const parts = text.split(/(\[[A-Z0-9 ‑/|.-]+\])/g);
  return parts.map((part, i) =>
    /^\[[A-Z0-9 ‑/|.-]+\]$/.test(part) ? (
      <mark
        key={i}
        className="lp-todo"
        title="To be supplied before publication"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export default function Legal({ slug }: { slug: string }) {
  const { content } = useCms();
  const [active, setActive] = useState<string>("");

  const legal = (content as Record<string, unknown>).legal as
    | {
        lastUpdated?: string;
        documents?: Record<string, LegalDocument>;
      }
    | undefined;
  const doc = legal?.documents?.[slug];

  /* Highlight the section currently in view in the contents list. */
  useEffect(() => {
    if (!doc) return;
    const headings = doc.sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const io = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, [doc]);

  if (!doc) return <NotFound />;

  return (
    <div className="lp">
      <ScrollProgress />

      <section className="lp-field-ink" aria-labelledby="legal-title">
        <div className="lp-frame py-12 md:py-16">
          <Reveal as="p" className="lp-meta" y={10}>
            <Link href="/" className="lp-link">
              <ArrowLeft
                size={13}
                aria-hidden="true"
                style={{ display: "inline" }}
              />{" "}
              Study Hub BD
            </Link>
          </Reveal>
          <Reveal
            as="h1"
            id="legal-title"
            className="lp-display mt-3"
            y={16}
            delay={60}
          >
            {doc.title}
          </Reveal>
          <Reveal as="p" className="lp-lead lp-soft mt-4" delay={120}>
            {withPlaceholders(doc.summary)}
          </Reveal>
          {legal?.lastUpdated && (
            <Reveal as="p" className="lp-small lp-soft mt-6" delay={170}>
              Last updated {legal.lastUpdated}
            </Reveal>
          )}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-frame lp-grid items-start">
          {/* ---- contents ---- */}
          <nav
            className="lp-toc col-span-12 lg:col-span-3"
            aria-label="On this page"
          >
            <p className="lp-meta">On this page</p>
            <ol className="mt-4 space-y-2">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="lp-toc-link"
                    aria-current={active === s.id ? "true" : undefined}
                  >
                    <span className="lp-toc-n">{i + 1}</span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="lp-btn lp-btn-quiet mt-7 print:hidden"
              onClick={() => window.print()}
            >
              <Printer size={15} aria-hidden="true" />
              Print or save as PDF
            </button>
          </nav>

          {/* ---- the document ---- */}
          <article className="lp-doc col-span-12 lg:col-span-9">
            {doc.sections.map((s, i) => (
              <section key={s.id} className="lp-doc-section">
                <h2 id={s.id} className="lp-doc-h">
                  <span className="lp-doc-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  {s.heading}
                </h2>

                {s.body.map((p, j) => (
                  <p key={j} className="lp-doc-p">
                    {withPlaceholders(p)}
                  </p>
                ))}

                {s.list && (
                  <ul className="lp-doc-list">
                    {s.list.map((item, j) => (
                      <li key={j}>
                        <span className="lp-bullet" aria-hidden="true" />
                        <span>{withPlaceholders(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.table && (
                  <div className="lp-table-wrap">
                    <table className="lp-table">
                      <thead>
                        <tr>
                          {s.table.columns.map(c => (
                            <th key={c} scope="col">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((row, r) => (
                          <tr key={r}>
                            {row.map((cell, c) => (
                              <td key={c}>{withPlaceholders(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            {/* A policy that tells you how to change your mind, without a
                control that does it, is only half a policy. */}
            {slug === "cookies" && <ConsentControls />}
          </article>
        </div>
      </section>
    </div>
  );
}

function ConsentControls() {
  const [choice, setChoice] = useState(() =>
    typeof window === "undefined" ? null : getConsent()
  );
  const asks = needsConsent();

  const refresh = () => setChoice(getConsent());

  return (
    <section className="lp-doc-section" aria-labelledby="your-choice">
      <h2 id="your-choice" className="lp-doc-h">
        <span className="lp-doc-n" aria-hidden="true">
          &#9679;
        </span>
        Your choice
      </h2>

      {!asks ? (
        <p className="lp-doc-p">
          There is nothing to switch off. This site loads no analytics, no
          advertising and no third-party scripts, so there is no choice for you
          to make here yet. If that ever changes, this page will ask you before
          anything loads, and you will be able to change your answer here.
        </p>
      ) : (
        <>
          <p className="lp-doc-p">
            {choice === null
              ? "You have not answered yet, so nothing optional is loading."
              : choice.analytics
                ? "You have said yes to " +
                  NON_ESSENTIAL.map(n => n.name).join(", ") +
                  "."
                : "You have said no, and nothing optional is loading."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              className="lp-btn lp-btn-quiet"
              onClick={() => {
                setConsent({ analytics: false, marketing: false });
                refresh();
              }}
            >
              Turn it off
            </button>
            <button
              type="button"
              className="lp-btn lp-btn-quiet"
              onClick={() => {
                setConsent({ analytics: true, marketing: true });
                refresh();
              }}
            >
              Turn it on
            </button>
            <button
              type="button"
              className="lp-btn lp-btn-quiet"
              onClick={() => {
                clearConsent();
                refresh();
              }}
            >
              Ask me again
            </button>
          </div>
        </>
      )}
    </section>
  );
}
