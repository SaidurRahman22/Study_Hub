import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Info } from "lucide-react";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  useStudent,
} from "@/contexts/StudentContext";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  SIGN IN                                                               *
 *                                                                        *
 *  Split screen, after the reference portal: what the portal is for on   *
 *  the navy side, the form on the white one. On a phone the navy block   *
 *  stacks above the form rather than being dropped, so the student can   *
 *  still tell what they are signing in to.                               *
 *                                                                        *
 *  The demo credentials are printed on the screen on purpose. Hiding     *
 *  them would not make this sign-in secure — the password is in the      *
 *  JavaScript bundle either way — and printing them makes it obvious     *
 *  that this is a prototype rather than a live service.                  *
 * ====================================================================== */

const POINTS = [
  "See exactly which stage your application has reached, and what happens next.",
  "Check every document: what we have accepted, what is still with us, and what we need from you.",
  "Ask your counsellor a question without waiting for office hours.",
];

export default function StudentLogin() {
  const [, navigate] = useLocation();
  const { signIn, signedIn, restoring } = useStudent();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  /* Already signed in: go straight to the file rather than asking again. */
  useEffect(() => {
    if (!restoring && signedIn) navigate("/student", { replace: true });
  }, [restoring, signedIn, navigate]);

  /* Move focus to the error so a screen reader announces it, and so the
   * keyboard lands next to the thing that needs fixing. */
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and your password.");
      return;
    }
    const result = signIn(email, password);
    if (result.ok) navigate("/student", { replace: true });
    else setError(result.error);
  }

  return (
    <div className="sp">
      <div className="sp-auth">
        <section className="sp-auth-pitch">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            style={{ color: "#fff", textDecoration: "none", fontSize: 14 }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to studyhubbd.com
          </Link>

          <div>
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={44}
              height={44}
              style={{ marginBottom: 20 }}
            />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 1.1rem + 1.6vw, 2rem)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                maxWidth: "18ch",
              }}
            >
              Your application, in one place
            </h1>
            <ul
              style={{
                marginTop: 22,
                display: "grid",
                gap: 12,
                maxWidth: "46ch",
              }}
            >
              {POINTS.map(p => (
                <li
                  key={p}
                  className="flex gap-3"
                  style={{ fontSize: 14.5, lineHeight: 1.55 }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "none",
                      width: 6,
                      height: 6,
                      borderRadius: 1,
                      marginTop: 9,
                      background: "var(--color-golden)",
                    }}
                  />
                  <span style={{ color: "#c9d3e2" }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <p style={{ fontSize: 13, color: "#8fa0b8", maxWidth: "48ch" }}>
            Study Hub BD · GIIT Building, Mymensingh Road, Kumudini College
            Gate, Tangail
          </p>
        </section>

        <section className="sp-auth-form">
          <div className="sp-auth-card">
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Sign in
            </h2>
            <p className="sp-sub" style={{ marginBottom: 22 }}>
              Use the email address you gave the office.
            </p>

            <form onSubmit={onSubmit} noValidate>
              {error && (
                <p
                  className="sp-err"
                  role="alert"
                  tabIndex={-1}
                  ref={errorRef}
                  style={{ marginTop: 0, marginBottom: 14 }}
                >
                  {error}
                </p>
              )}

              <div style={{ marginBottom: 14 }}>
                <label className="sp-label" htmlFor="sp-email">
                  Email address
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

              <div style={{ marginBottom: 20 }}>
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
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    style={{
                      position: "absolute",
                      right: 4,
                      top: 2,
                      width: 36,
                      height: 36,
                      display: "grid",
                      placeItems: "center",
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      color: "var(--sp-faint)",
                      borderRadius: 6,
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="sp-btn sp-btn-primary"
                style={{ width: "100%" }}
              >
                Sign in
              </button>
            </form>

            <div className="sp-demo" style={{ marginTop: 22 }}>
              <Info size={15} aria-hidden="true" />
              <span>
                <strong style={{ fontWeight: 600 }}>Prototype.</strong> There
                are no real accounts yet. Sign in with{" "}
                <code style={{ fontSize: 12.5 }}>{DEMO_EMAIL}</code> and{" "}
                <code style={{ fontSize: 12.5 }}>{DEMO_PASSWORD}</code> to walk
                through a sample student&rsquo;s file.
              </span>
            </div>

            <p className="sp-hint" style={{ marginTop: 16 }}>
              Not registered with Study Hub yet?{" "}
              <Link href="/contact" style={{ color: "var(--sp-ink)" }}>
                Talk to the office
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
