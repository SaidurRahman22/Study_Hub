import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Mail, MessageCircle, X } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";

/* ====================================================================== *
 *  BOOK A CONSULTATION                                                   *
 *                                                                        *
 *  An overlay form, in place of the Google Form the buttons used to      *
 *  hand off to.                                                          *
 *                                                                        *
 *  WHERE THE ANSWERS GO. This project has no database and no mail        *
 *  service: `api/` holds only the admin and content endpoints. A form    *
 *  that posted nowhere would be the same defect as the dead contact      *
 *  form the audit flagged, so this one does not pretend: it composes     *
 *  the enquiry and hands it to WhatsApp (the number the office already   *
 *  publishes) or to email. Both buttons say exactly what they do, the    *
 *  enquiry arrives on a real device, and no personal data is stored      *
 *  anywhere on the way.                                                  *
 *                                                                        *
 *  Replace `submitToEndpoint` below with a real POST the day there is a  *
 *  backend; nothing else in the component has to change.                 *
 * ====================================================================== */

type Ctx = { open: (source?: string) => void; close: () => void };
const ConsultationContext = createContext<Ctx | null>(null);

/** Opens the booking overlay. Any button anywhere can call this. */
export function useConsultation(): Ctx {
  const ctx = useContext(ConsultationContext);
  if (!ctx)
    throw new Error(
      "useConsultation must be used inside <ConsultationProvider>"
    );
  return ctx;
}

const HELP_OPTIONS = [
  "University admission",
  "Student visa and documents",
  "Bank support and financial documents",
  "IELTS preparation",
  "Japanese language",
  "Scholarship",
  "Something else",
];

type Fields = {
  name: string;
  phone: string;
  email: string;
  destination: string;
  help: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  phone: "",
  email: "",
  destination: "",
  help: "",
  message: "",
};

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const sourceRef = useRef<string>("");
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((source = "") => {
    sourceRef.current = source;
    openerRef.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // hand focus back to whatever opened it
    openerRef.current?.focus?.();
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ConsultationContext.Provider value={value}>
      {children}
      {isOpen && <Dialog onClose={close} source={sourceRef.current} />}
    </ConsultationContext.Provider>
  );
}

function Dialog({ onClose, source }: { onClose: () => void; source: string }) {
  const { content } = useCms();
  const g = content.global;
  const destinations = content.destinations;

  const [f, setF] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState<
    Partial<Record<keyof Fields, boolean>>
  >({});
  /* "edited" is separate from "touched" on purpose. Blurring a field the
   * visitor never typed in used to raise its error, which grew the form and
   * shifted the submit button out from under the pointer mid-click. */
  const [edited, setEdited] = useState<Partial<Record<keyof Fields, boolean>>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [sentVia, setSentVia] = useState<"whatsapp" | "email" | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (!f.name.trim()) e.name = "Enter your name.";
    const digits = f.phone.replace(/\D/g, "");
    if (!digits) e.phone = "Enter a phone number we can call you back on.";
    else if (digits.length < 10)
      e.phone = "That number looks too short. Include the full number.";
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()))
      e.email = "That email address does not look right.";
    return e;
  }, [f]);

  const errorList = (Object.keys(errors) as (keyof Fields)[]).filter(
    k => submitted || (touched[k] && edited[k])
  );
  const isValid = Object.keys(errors).length === 0;

  /* Escape closes, the page behind does not scroll, and focus starts on the
   * first field rather than on the close button. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // keep Tab inside the dialog
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey, true);
      window.clearTimeout(t);
    };
  }, [onClose]);

  /* Once a failed submit has rendered the summary, send focus to it, so a
   * keyboard or screen-reader user lands on the problem rather than hunting
   * for it. Driven by the render, not by a timer racing it. */
  useEffect(() => {
    if (submitted && !isValid) summaryRef.current?.focus();
  }, [submitted, isValid]);

  const set =
    (k: keyof Fields) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      setF(prev => ({ ...prev, [k]: e.target.value }));
      setEdited(prev => (prev[k] ? prev : { ...prev, [k]: true }));
    };
  const blur = (k: keyof Fields) => () =>
    setTouched(prev => ({ ...prev, [k]: true }));

  /** The enquiry as plain text, in the order a counsellor reads it. */
  const compose = () => {
    const lines = [
      "Consultation request: Study Hub BD",
      "",
      `Name: ${f.name.trim()}`,
      `Phone: ${f.phone.trim()}`,
      f.email.trim() ? `Email: ${f.email.trim()}` : null,
      f.destination
        ? `Destination: ${f.destination}`
        : "Destination: not decided yet",
      f.help ? `Needs help with: ${f.help}` : null,
      f.message.trim() ? `\nMessage:\n${f.message.trim()}` : null,
      source ? `\n(from: ${source})` : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const submit = (via: "whatsapp" | "email") => (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) return; // the effect below moves focus to the summary
    const body = compose();
    if (via === "whatsapp") {
      const number = `880${g.whatsapp.replace(/\D/g, "").replace(/^0/, "")}`;
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(body)}`,
        "_blank",
        "noopener"
      );
    } else {
      const subject = `Consultation request: ${f.name.trim()}`;
      window.location.href = `mailto:${g.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    setSentVia(via);
  };

  const fieldErr = (k: keyof Fields) =>
    errorList.includes(k) ? errors[k] : undefined;

  return (
    <div
      className="cd-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cd-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-intro`}
      >
        <button
          type="button"
          className="cd-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {sentVia ? (
          <div className="cd-done" role="status">
            <span className="cd-done-mark" aria-hidden="true">
              <Check size={22} />
            </span>
            <h2 id={`${uid}-title`} className="cd-title">
              Your request is ready to send
            </h2>
            <p className="lp-body lp-soft mt-3">
              {sentVia === "whatsapp"
                ? "WhatsApp has opened in a new tab with your details filled in. Press send there and we will have it."
                : "Your email program has opened with the request filled in. Press send there and we will have it."}
            </p>
            <p className="lp-small lp-soft mt-4">
              Nothing was sent automatically. You stay in control of the
              message. If nothing opened, call{" "}
              <a
                href={`tel:+880${g.phone1.replace(/\D/g, "").replace(/^0/, "")}`}
                className="lp-link"
              >
                {g.phone1}
              </a>
              .
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="lp-btn" onClick={onClose}>
                Done
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-quiet"
                onClick={() => {
                  setSentVia(null);
                  setSubmitted(false);
                }}
              >
                Edit the request
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id={`${uid}-title`} className="cd-title">
              Book a consultation
            </h2>
            <p id={`${uid}-intro`} className="lp-body lp-soft mt-2">
              Tell us where you want to study and we will tell you what the
              application needs. A counsellor replies the same working day.
            </p>

            {submitted && errorList.length > 0 && (
              <div
                className="cd-summary"
                role="alert"
                tabIndex={-1}
                ref={summaryRef}
                aria-labelledby={`${uid}-errtitle`}
              >
                <p id={`${uid}-errtitle`} className="font-semibold">
                  There is a problem
                </p>
                <ul className="mt-1.5 space-y-1">
                  {errorList.map(k => (
                    <li key={k}>
                      <a href={`#${uid}-${k}`} className="cd-summary-link">
                        {errors[k]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form className="cd-form" noValidate onSubmit={submit("whatsapp")}>
              <Field
                id={`${uid}-name`}
                label="Your name"
                error={fieldErr("name")}
                required
              >
                <input
                  ref={firstFieldRef}
                  id={`${uid}-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="cd-input"
                  value={f.name}
                  onChange={set("name")}
                  onBlur={blur("name")}
                  aria-invalid={!!fieldErr("name")}
                  aria-describedby={
                    fieldErr("name") ? `${uid}-name-err` : undefined
                  }
                />
              </Field>

              <div className="cd-row">
                <Field
                  id={`${uid}-phone`}
                  label="Phone or WhatsApp"
                  error={fieldErr("phone")}
                  required
                >
                  <input
                    id={`${uid}-phone`}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXX-XXXXXX"
                    className="cd-input"
                    value={f.phone}
                    onChange={set("phone")}
                    onBlur={blur("phone")}
                    aria-invalid={!!fieldErr("phone")}
                    aria-describedby={
                      fieldErr("phone") ? `${uid}-phone-err` : undefined
                    }
                  />
                </Field>

                <Field
                  id={`${uid}-email`}
                  label="Email"
                  hint="optional"
                  error={fieldErr("email")}
                >
                  <input
                    id={`${uid}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="cd-input"
                    value={f.email}
                    onChange={set("email")}
                    onBlur={blur("email")}
                    aria-invalid={!!fieldErr("email")}
                    aria-describedby={
                      fieldErr("email") ? `${uid}-email-err` : undefined
                    }
                  />
                </Field>
              </div>

              <div className="cd-row">
                <Field
                  id={`${uid}-destination`}
                  label="Where do you want to study?"
                >
                  <select
                    id={`${uid}-destination`}
                    name="destination"
                    className="cd-input"
                    value={f.destination}
                    onChange={set("destination")}
                  >
                    <option value="">Not decided yet</option>
                    {destinations.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id={`${uid}-help`} label="What do you need help with?">
                  <select
                    id={`${uid}-help`}
                    name="help"
                    className="cd-input"
                    value={f.help}
                    onChange={set("help")}
                  >
                    <option value="">Not sure yet</option>
                    {HELP_OPTIONS.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                id={`${uid}-message`}
                label="Anything else we should know?"
                hint="optional"
              >
                <textarea
                  id={`${uid}-message`}
                  name="message"
                  rows={3}
                  className="cd-input"
                  placeholder="Your results, the course you have in mind, when you want to go…"
                  value={f.message}
                  onChange={set("message")}
                />
              </Field>

              <div className="cd-actions">
                <button type="submit" className="lp-btn">
                  <MessageCircle size={17} aria-hidden="true" />
                  Send on WhatsApp
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn-quiet"
                  onClick={submit("email")}
                >
                  <Mail size={17} aria-hidden="true" />
                  Send by email
                </button>
              </div>

              <p className="lp-small lp-soft cd-note">
                Your details go straight to the office on WhatsApp or by email.
                Nothing is stored on this website. Prefer to talk? Call{" "}
                <a
                  href={`tel:+880${g.phone1.replace(/\D/g, "").replace(/^0/, "")}`}
                  className="lp-link"
                >
                  {g.phone1}
                </a>
                .
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/** A labelled field with its error tied to the input by id. */
function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <p className="cd-field">
      <label htmlFor={id} className="cd-label">
        {label}
        {required ? (
          <span aria-hidden="true" className="cd-req">
            *
          </span>
        ) : null}
        {hint ? <span className="cd-hint">{hint}</span> : null}
      </label>
      {children}
      {error && (
        <span id={`${id}-err`} className="cd-err" role="alert">
          {error}
        </span>
      )}
    </p>
  );
}
