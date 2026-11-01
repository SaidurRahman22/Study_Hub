import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  FileText,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Info,
} from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { openItems, unreadFromAgency } from "@/lib/studentData";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  The portal shell: a 236px labelled sidebar and the canvas.            *
 *                                                                        *
 *  The sidebar is white with a hairline rather than a navy rail. On a    *
 *  1440px screen a navy rail would be a sixth of every pixel the student *
 *  sees, and on an app screen the colour budget belongs to the data —    *
 *  here, to the three documents that are actually blocking the visa.     *
 *                                                                        *
 *  Counts appear only on a queue that needs action, and their noun is    *
 *  clear from the label they sit on.                                     *
 * ====================================================================== */

const NAV = [
  { href: "/student", label: "Overview", icon: LayoutGrid },
  { href: "/student/documents", label: "Documents", icon: FileText },
  { href: "/student/messages", label: "Messages", icon: MessageSquare },
] as const;

export default function StudentShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { student, signedIn, restoring, signOut, lastRead } = useStudent();

  /* The guard. A signed-out reader is sent to the sign-in screen rather
   * than shown an empty portal. This is a convenience, not a security
   * control — see the note at the top of StudentContext. */
  useEffect(() => {
    if (!restoring && !signedIn) navigate("/student/login", { replace: true });
  }, [restoring, signedIn, navigate]);

  if (restoring || !student) {
    return (
      <div className="sp">
        <div className="sp-main">
          <p className="sp-sub">Loading your file…</p>
        </div>
      </div>
    );
  }

  const outstanding = openItems(student.documents).length;
  const unread = unreadFromAgency(student.messages, lastRead);
  const initials = student.name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("");

  const countFor = (href: string) =>
    href === "/student/documents"
      ? outstanding
      : href === "/student/messages"
        ? unread
        : 0;

  return (
    <div className="sp">
      <div className="sp-shell">
        <aside className="sp-side">
          <Link
            href="/"
            className="sp-brand"
            aria-label="Study Hub BD — back to the main site"
          >
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={30}
              height={30}
            />
            <span>
              <span className="sp-brand-name">Study Hub BD</span>
              <span className="sp-brand-scope">
                Student file {student.studentId}
              </span>
            </span>
          </Link>

          <nav className="sp-nav" aria-label="Student portal">
            {NAV.map(item => {
              const Icon = item.icon;
              const count = countFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="sp-nav-item"
                  aria-current={location === item.href ? "page" : undefined}
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {item.label}
                  {count > 0 && (
                    <span className="sp-nav-count">
                      {count}
                      <span className="sr-only">
                        {item.href === "/student/messages"
                          ? " unread messages"
                          : " documents needing you"}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="sp-side-foot">
            <div className="sp-user">
              <span className="sp-avatar" aria-hidden="true">
                {initials}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {student.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--sp-faint)",
                  }}
                >
                  {student.country}
                </span>
              </span>
            </div>
            <button
              type="button"
              className="sp-nav-item"
              style={{
                width: "100%",
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
              onClick={() => {
                signOut();
                navigate("/student/login", { replace: true });
              }}
            >
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="sp-main" id="main">
          <div className="sp-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** The standing reminder that nothing here is a real record. One line, on
 *  every screen of the portal, until a back end exists. */
export function DemoNotice() {
  return (
    <p className="sp-demo" style={{ marginBottom: 16 }}>
      <Info size={15} aria-hidden="true" />
      <span>
        <strong style={{ fontWeight: 600 }}>Sample data.</strong> This portal is
        a working prototype — the file below belongs to a made-up student, and
        anything you upload or send stays in this browser tab. No document is
        stored or transmitted anywhere.
      </span>
    </p>
  );
}
