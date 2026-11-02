import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Info } from "lucide-react";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  useStudent,
} from "@/contexts/StudentContext";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  SIGN IN                                                               *
 *                                                                        *
 *  Split screen. The navy side carries the gate into Tangail under a     *
 *  flat scrim, so the first thing a student sees is the brand rather     *
 *  than a form. The form side stays white and roomy.                     *
 * ====================================================================== */

const POINTS = [
  "Follow your application stage by stage.",
  "See which documents are accepted and which are still needed.",
  "Message your counsellor any time.",
];

export default function StudentLogin() {
  const [, navigate] = useLocation();
  const { signIn, signedIn, restoring } = useStudent();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!restoring && signedIn) navigate("/student", { replace: true });
  }, [restoring, signedIn, navigate]);

  /* Move focus to the error so it is announced, and so the keyboard
   * lands beside the thing that needs fixing. */
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  /* No "fill both fields" guard and no browser email validation while the
   * API runs with DEV_OPEN_LOGIN on: it accepts anything, so stopping the
   * submit here would be the only thing left blocking the way in. Put the
   * guard back when the real password check comes back. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await signIn(email, password);
    if (result.ok) navigate("/student", { replace: true });
    else setError(result.error);
  }

  return (
    <div className="sp">
      <div className="sp-auth">
        <section
          className="sp-auth-pitch"
          style={
            {
              "--sp-auth-photo": `url(${asset("/images/tangail/shamsul-haq-toran.jpg")})`,
            } as React.CSSProperties
          }
        >
          <div className="sp-rise">
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={40}
              height={40}
            />
            <span className="sp-auth-rule" style={{ margin: "22px 0 18px" }} />
            <h1 className="sp-auth-head">Your application, in one place</h1>
            <ul className="sp-auth-points" style={{ marginTop: 24 }}>
              {POINTS.map(p => (
                <li key={p}>
                  <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="sp-auth-foot">
            Study Hub BD, GIIT Building, Mymensingh Road, Kumudini College Gate,
            Tangail
          </p>
        </section>

        <section className="sp-auth-form">
          <div
            className="sp-auth-card sp-rise"
            style={{ "--sp-delay": "80ms" } as React.CSSProperties}
          >
            <Link
              href="/"
              className="sp-hint"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 26,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to the website
            </Link>

            <h2 className="sp-auth-title">Sign in</h2>
            <p className="sp-sub" style={{ marginBottom: 26 }}>
              Use the email you gave the office.
            </p>

            <form onSubmit={onSubmit} noValidate>
              {error && (
                <p
                  className="sp-err"
                  role="alert"
                  tabIndex={-1}
                  ref={errorRef}
                  style={{ marginBottom: 18 }}
                >
                  <Info
                    size={15}
                    aria-hidden="true"
                    style={{ flex: "none", marginTop: 2 }}
                  />
                  {error}
                </p>
              )}

              <div style={{ marginBottom: 16 }}>
                <label className="sp-label" htmlFor="sp-email">
                  Email
                </label>
                <input
                  id="sp-email"
                  className="sp-input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="sp-label" htmlFor="sp-password">
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="sp-password"
                    className="sp-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    style={{ paddingRight: 50 }}
                  />
                  <button
                    type="button"
                    className="sp-eye"
                    onClick={() => setShowPassword(v => !v)}
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="sp-btn sp-btn-primary"
                style={{ width: "100%", minHeight: 48 }}
              >
                Sign in
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>

            <p
              className="sp-demo"
              style={{ marginTop: 24, alignItems: "flex-start" }}
            >
              <Info size={15} aria-hidden="true" style={{ marginTop: 2 }} />
              {/* True while the API runs with DEV_OPEN_LOGIN on. Turning that
                  off restores the real password check, and this copy, along
                  with the whole box, goes before the site is real. */}
              <span>
                Development build: the password is not checked. Anything you
                type signs you in as the demo student,{" "}
                <strong style={{ fontWeight: 600 }}>{DEMO_EMAIL}</strong>{" "}
                (password <strong style={{ fontWeight: 600 }}>{DEMO_PASSWORD}</strong>).
              </span>
            </p>

            <p className="sp-hint" style={{ marginTop: 18 }}>
              Not registered yet?{" "}
              <Link
                href="/contact"
                style={{ color: "var(--sp-ink)", fontWeight: 500 }}
              >
                Talk to the office
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
