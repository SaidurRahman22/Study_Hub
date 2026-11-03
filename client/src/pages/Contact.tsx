import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Phone } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";
import { Reveal, ScrollProgress } from "@/components/Reveal";
import { submitEnquiry } from "@/lib/api";
import {
  isPlaceholderMapEmbed,
  mapEmbedForAddress,
  safeHref,
  safeMapEmbed,
} from "@/lib/safe-url";
import { asset } from "@/lib/asset";
import { phoneDisplay, phoneHref } from "@/lib/phone";

/* ====================================================================== *
 *  CONTACT                                                               *
 *                                                                        *
 *  Rebuilt in the site's design language. This was the last page still   *
 *  on the old template: a gold gradient hero, four identical icon tiles  *
 *  in gradient squares, and `text-golden` headings, which the brand      *
 *  tokens file records as 2.1:1 on a light ground.                       *
 *                                                                        *
 *  THE IDEA: every consultancy in the country has a contact form. What   *
 *  this one has is a door — the GIIT Building on Mymensingh Road, at the *
 *  Kumudini College gate. So the page leads with reaching a person now,  *
 *  with both numbers large and tappable, puts the form second for people *
 *  who would rather write, and ends at the map, which is the thing a     *
 *  form can never be.                                                    *
 *                                                                        *
 *  The form still posts to the Laravel API exactly as before, and every  *
 *  field the admin's Contact editor exposes is still rendered.           *
 * ====================================================================== */

/** What the enquiry is about. Stored on the enquiry row, so the office can
 *  sort the list; the values are the ones the admin screens already show. */
const SUBJECTS = [
  "IELTS Inquiry",
  "Japanese Language",
  "Admission Support",
  "Visa Assistance",
  "Other",
];

/* Tangail, for the many students who travel in from the district. The
 * bundled photographs show the town the office is in, never the office
 * itself — see client/src/lib/imageCredits.ts. */
const TOWN = [
  {
    file: "/images/tangail/atia-mosque.jpg",
    alt: "The terracotta facade of the Atia Mosque near Tangail",
    cap: "The Atia Mosque, Delduar.",
  },
  {
    file: "/images/tangail/dc-lake.jpg",
    alt: "The DC Lake in Tangail town",
    cap: "DC Lake, in the middle of town.",
  },
  {
    file: "/images/tangail/dyed-yarn-drying.jpg",
    alt: "Dyed yarn drying in the open in Tangail",
    cap: "Dyed yarn, for the handloom saris Tangail is known for.",
  },
];

export default function Contact() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const c = content.contact;
  const g = content.global;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  /* Per-field messages. The form is noValidate, which suppresses the
   * browser's own bubbles, so without these a missing name collapsed into one
   * generic strip at the top of a five-field form — roughly 600px above the
   * thumb that pressed Send, and off-screen on a phone. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const doneRef = useRef<HTMLHeadingElement>(null);

  /* Move the visitor to the confirmation. Swapping a 600px form for a 200px
   * panel in place makes the page shorter with nothing to say it worked. */
  useEffect(() => {
    if (status === "done") {
      doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      doneRef.current?.focus();
    }
  }, [status]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Please tell us your name.";
    if (!form.email.trim()) next.email = "We need an email to reply to.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "That does not look like an email address.";
    setFieldErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`ct-${first}`)?.focus();
    return Object.keys(next).length === 0;
  }

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
    {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setFieldErrors(prev => {
        if (!prev[k]) return prev;
        const next = { ...prev };
        delete next[k];
        return next;
      });
    };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!validate()) return;
    setStatus("sending");
    setError("");
    try {
      await submitEnquiry({ ...form, source: "contact" });
      setStatus("done");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="lp">
      <ScrollProgress />

      {/* ============ HERO — the quickest way to a person ============ */}
      <section className="lp-field-ink" aria-labelledby="contact-hero">
        {/* One column, not a 6/6 split. The split left both halves floating
            in the middle of the band at unrelated heights with dead navy
            under each; stacked, everything shares one margin and one
            reading order, which is what the phone layout already did well. */}
        <div className="lp-frame py-16 md:py-24">
          <div className="lp-grid items-start">
            <div className="col-span-12 lg:col-span-6">
              <Reveal as="h1" id="contact-hero" className="lp-display" y={18}>
                {c.hero.title} {c.hero.titleHighlight}
              </Reveal>
              <RichText
                as="p"
                className="lp-lead mt-5 opacity-85"
                text={c.hero.subtitle}
              />

              {/* The primary number is a filled block so it is obviously
                  tappable; the second sits under it rather than beside it as
                  a near-identical twin the visitor has to choose between. */}
              <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" delay={120}>
                {c.phone1 && (
                  <a
                    href={phoneHref(c.phone1)}
                    className="ct-tel ct-tel-primary"
                  >
                    <Phone size={20} aria-hidden="true" />
                    {phoneDisplay(c.phone1)}
                  </a>
                )}
                {c.phone2 && (
                  <a
                    href={phoneHref(c.phone2)}
                    className="ct-tel ct-tel-secondary"
                  >
                    or {phoneDisplay(c.phone2)}
                  </a>
                )}
              </Reveal>

              <p className="lp-body mt-5 opacity-80">
                Call the office, or email{" "}
                <a href={`mailto:${c.email}`} className="ct-mail">
                  {c.email}
                </a>
              </p>

              {c.hours && (
                <Reveal className="mt-10" delay={200}>
                  <p className="lp-small opacity-60">Open</p>
                  <RichText as="p" className="lp-sub m-0 mt-1" text={c.hours} />
                </Reveal>
              )}

              <Reveal className="mt-6" delay={240}>
                <p className="lp-small opacity-60">Find us</p>
                <RichText as="p" className="lp-body m-0 mt-1 opacity-85" text={c.address} />
                <p className="lp-body mt-2 opacity-85">
                  Walk in during opening hours, or{" "}
                  <a
                    href={safeHref(`https://${c.website}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ct-mail"
                  >
                    {c.website}
                  </a>
                </p>
              </Reveal>
            </div>

            {/* Closes the far side of the frame and gives the first screen
                something to lead with, which two capped phone numbers no
                longer do on their own. */}
            <Reveal className="col-span-12 lg:col-span-6 mt-10 lg:mt-0" y={20} delay={160}>
              <figure className="m-0">
                <span className="lp-media block aspect-[5/6] w-full">
                  <img
                    src={asset("/images/tangail/shamsul-haq-toran.jpg")}
                    alt="The Shamsul Haq Toran gateway in Tangail"
                    width={1200}
                    height={900}
                    decoding="async"
                    className="lp-drift"
                  />
                </span>
                <figcaption className="lp-small mt-3 opacity-70">
                  Tangail. The office is on Mymensingh Road, at the Kumudini
                  College gate.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ THE FORM, AND THE OFFICE BESIDE IT ============ */}
      <section className="lp-section" aria-labelledby="contact-write">
        <div className="lp-frame">
          <div className="lp-grid">
            <div className="col-span-12 lg:col-span-8">
              <Reveal as="h2" id="contact-write" className="lp-head" y={14}>
                Write to us instead
              </Reveal>
              <Reveal as="p" className="lp-body lp-soft mt-4 max-w-[52ch]" delay={60}>
                Tell us what you are planning and we will come back to you.
                Nothing here commits you to anything.
              </Reveal>

              <Reveal className="mt-8" y={16} delay={110}>
                {status === "done" ? (
                  <div className="lp-panel lp-panel-ink p-8" role="status">
                    <Check size={28} aria-hidden="true" style={{ color: "var(--color-golden)" }} />
                    <h3 ref={doneRef} tabIndex={-1} className="lp-sub mt-3 outline-none">
                      Thank you, we have your message
                    </h3>
                    <p className="lp-body mt-2 opacity-85">
                      Someone from Study Hub BD will get back to you shortly.
                      For anything urgent, call {phoneDisplay(g.phone1)}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="lp-btn lp-btn-quiet mt-6"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate className="lp-panel p-6 sm:p-8">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="ct-label" htmlFor="ct-name">
                          Full name
                        </label>
                        <input
                          id="ct-name"
                          className="ct-input"
                          aria-invalid={fieldErrors.name ? true : undefined}
                          aria-describedby={fieldErrors.name ? "ct-name-err" : undefined}
                          type="text"
                          required
                          autoComplete="name"
                          value={form.name}
                          onChange={set("name")}
                        />
                        {fieldErrors.name && (
                          <p id="ct-name-err" className="ct-field-error">
                            {fieldErrors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="ct-label" htmlFor="ct-email">
                          Email
                        </label>
                        <input
                          id="ct-email"
                          className="ct-input"
                          aria-invalid={fieldErrors.email ? true : undefined}
                          aria-describedby={fieldErrors.email ? "ct-email-err" : undefined}
                          type="email"
                          required
                          autoComplete="email"
                          value={form.email}
                          onChange={set("email")}
                        />
                        {fieldErrors.email && (
                          <p id="ct-email-err" className="ct-field-error">
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="ct-label" htmlFor="ct-phone">
                          Phone
                        </label>
                        <input
                          id="ct-phone"
                          className="ct-input"
                          type="tel"
                          autoComplete="tel"
                          value={form.phone}
                          onChange={set("phone")}
                        />
                      </div>
                      <div>
                        <label className="ct-label" htmlFor="ct-subject">
                          What is it about
                        </label>
                        <select
                          id="ct-subject"
                          className="ct-input"
                          value={form.subject}
                          onChange={set("subject")}
                        >
                          <option value="">Choose one</option>
                          {SUBJECTS.map(s => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="ct-label" htmlFor="ct-message">
                        Message
                      </label>
                      <textarea
                        id="ct-message"
                        className="ct-input"
                        rows={5}
                        value={form.message}
                        onChange={set("message")}
                      />
                    </div>

                    {status === "error" && (
                      <p role="alert" className="ct-error mt-6 mb-0">
                        {error}
                      </p>
                    )}

                    {/* Full width at every breakpoint: the only full-width
                        gold on the page, which makes it the primary action
                        without inventing a new button style. */}
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="lp-btn mt-4 w-full"
                    >
                      {status === "sending" ? "Sending…" : "Send message"}
                      {status !== "sending" && (
                        <ArrowRight size={17} aria-hidden="true" />
                      )}
                    </button>

                    <p className="lp-small lp-soft mt-5">
                      Would rather book a time?{" "}
                      <button
                        type="button"
                        onClick={() => openConsultation("Contact")}
                        className="lp-link"
                      >
                        Book a consultation
                      </button>
                      .
                    </p>
                  </form>
                )}
              </Reveal>
            </div>

            {/* The four columns beside the form were empty — about 390px by
             *  1000px of bare white, which is the largest void on the site
             *  and reads as an unfinished layout rather than as rest.
             *
             *  What belongs there is the question the form itself raises and
             *  cannot answer: having typed all that, will anyone read it?
             *  So: what happens next, how long it takes, and the two routes
             *  that are faster than waiting. It sticks to the top on desktop
             *  so it stays beside the fields as they are filled in. */}
            <aside className="col-span-12 lg:col-span-4 lg:pt-[7.5rem]">
              <div className="lg:sticky lg:top-28">
                <Reveal className="lp-panel lp-panel-ink p-6" y={16} delay={140}>
                  <h3 className="lp-sub m-0">After you send it</h3>
                  <ol className="mt-5 grid gap-4 list-none p-0 m-0">
                    {[
                      "It reaches the Tangail office, not an inbox nobody opens.",
                      "A counsellor reads it and checks what your options actually are.",
                      "You hear back within one working day, by phone or by email, whichever you gave us.",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="ct-step" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span className="lp-small opacity-85">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <p className="lp-small opacity-70 mt-6 mb-0">
                    In a hurry? Calling is faster than any of this.
                  </p>
                  {c.phone1 && (
                    <a
                      href={phoneHref(c.phone1)}
                      className="lp-btn lp-btn-quiet mt-3 w-full"
                    >
                      {phoneDisplay(c.phone1)}
                    </a>
                  )}
                </Reveal>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ============ WHERE TO WALK IN ============ */}
      <section className="lp-section lp-field-step" aria-labelledby="contact-map">
        <div className="lp-frame">
          <div className="lp-grid">
            <div className="col-span-12 lg:col-span-4">
          <Reveal as="h2" id="contact-map" className="lp-head" y={14}>
            Where to find us
          </Reveal>
          <Reveal as="p" className="lp-body lp-soft mt-4 max-w-[56ch]" delay={60}>
            If you are coming from out of town, ring ahead and we will make
            sure the right counsellor is free when you arrive.
          </Reveal>

          <Reveal className="mt-8 flex flex-wrap items-center gap-4" delay={150}>
            <a
              href={safeHref(c.mapDirectionsUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn"
            >
              Get directions
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </Reveal>
          <RichText as="p" className="lp-body lp-soft mt-4" text={c.address} />
            </div>

            <div className="col-span-12 lg:col-span-8 mt-8 lg:mt-0">

          <Reveal y={18} delay={110}>
            {/* Only a real Google Maps embed is framed: a javascript: URL in
                an iframe src executes in this page's own origin. */}
            <span className="lp-media block h-[24rem] w-full lg:h-[32rem]">
              {/* A pasted Google embed wins when it is a real one. The stored
                  value was a template with placeholder coordinates pointing
                  ~16km from the office, so anything that looks like that is
                  ignored in favour of geocoding the address the office
                  actually maintains. */}
              <iframe
                src={
                  (!isPlaceholderMapEmbed(c.mapEmbedUrl)
                    ? safeMapEmbed(c.mapEmbedUrl)
                    : undefined) ?? safeMapEmbed(mapEmbedForAddress(c.address))
                }
                title="Map showing the Study Hub BD office in Tangail"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </span>
          </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE TOWN ============ */}
      <section className="lp-section" aria-labelledby="contact-town">
        <div className="lp-frame">
          <Reveal as="h2" id="contact-town" className="lp-head" y={14}>
            Finding the office
          </Reveal>
          <Reveal as="p" className="lp-body lp-soft mt-4 max-w-[56ch]" delay={60}>
            Addresses here are approximate and most people navigate by
            landmark. If you are coming in from the district, these are the
            ones to steer by; the office is a short ride from the college
            gate.
          </Reveal>

          <div className="lp-grid mt-10">
            {TOWN.map((t, i) => (
              <Reveal
                key={t.file}
                className={
                  i === 0
                    ? "col-span-12 lg:col-span-6"
                    : "col-span-6 lg:col-span-3"
                }
                y={16}
                delay={60 + i * 70}
              >
                <figure className="m-0">
                  <span
                    className={`lp-media block w-full ${
                      i === 0 ? "aspect-[16/10]" : "aspect-[4/5]"
                    }`}
                  >
                    <img
                      src={asset(t.file)}
                      alt={t.alt}
                      width={1200}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      className="lp-drift"
                    />
                  </span>
                  <figcaption className="lp-small lp-soft mt-3">
                    {t.cap}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA (CMS) ============ */}
      <section className="lp-section lp-field-ink" aria-labelledby="contact-cta">
        <div className="lp-frame">
          <div className="lp-grid items-center">
            <div className="col-span-12 lg:col-span-7">
              <Reveal as="h2" id="contact-cta" className="lp-head" y={14}>
                {c.ctaTitle}
              </Reveal>
              <RichText
                as="p"
                className="lp-lead mt-4 opacity-85"
                text={c.ctaSubtitle}
              />
            </div>
            {/* This band carries no button, and that is the point.
             *
             * It used to close with "Book a consultation" and the phone
             * number. By that point in the page each was the fourth and the
             * third time it had appeared — after the gold telephone block
             * in the hero, the form, the aside beside the form, the
             * directions link under the map and the floating WhatsApp
             * button. A contact page has no action left to ask for; the
             * whole page is the action. Repeating one does not strengthen
             * it, it just makes the last screen look like every other
             * page's last screen.
             *
             * What the page only ever said in small type is WHEN. The hours
             * sat in the hero at label size, which is where a visitor
             * deciding whether to come in today will not find them. They
             * close the page instead, at the size of a statement. */}
            {c.hours && (
              <Reveal
                className="col-span-12 lg:col-span-5 mt-8 lg:mt-0 lg:text-right"
                y={14}
                delay={80}
              >
                {/* The hours lead; the context follows them.
                 *
                 * This first shipped with "The office is open" set small
                 * above the hours, which is an eyebrow — a label over a
                 * statement, the one shape this design system bans, and
                 * the inspector caught it immediately. 29 of them were
                 * removed from this site; this must not be the 30th.
                 * Whatever the label was carrying belongs underneath, as
                 * a sentence. */}
                <RichText
                  as="p"
                  className="lp-head m-0"
                  text={c.hours}
                />
                <RichText
                  as="p"
                  className="lp-small opacity-70 mt-4 lg:ml-auto max-w-[34ch]"
                  text={`The office is open these hours at ${c.address}.`}
                />
              </Reveal>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
