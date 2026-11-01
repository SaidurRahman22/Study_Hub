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
 *  The portal shell: a navy rail and the canvas.                         *
 *                                                                        *
 *  The rail carries the site's navy so a student knows whose portal      *
 *  this is on sight. The active item takes a gold edge, the one brand    *
 *  mark in the chrome. Counts appear only where something is waiting.    *
 * ====================================================================== */

const NAV = [
  { href: "/student", label: "Overview", icon: LayoutGrid },
  { href: "/student/documents", label: "Documents", icon: FileText },
  { href: "/student/messages", label: "Messages", icon: MessageSquare },
] as const;

export default function StudentShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { student, signedIn, restoring, signOut, lastRead } = useStudent();

  /* A signed-out reader goes to the sign-in screen. This is a
   * convenience, not a security control. See StudentContext. */
  useEffect(() => {
    if (!restoring && !signedIn) navigate("/student/login", { replace: true });
  }, [restoring, signedIn, navigate]);

  if (restoring || !student) {
    return (
      <div className="sp">
        <div className="sp-main">
          <p className="sp-sub">Loading your file</p>
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
            aria-label="Study Hub BD, back to the website"
          >
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={34}
              height={34}
            />
            <span>
              <span className="sp-brand-name">Study Hub BD</span>
              <span className="sp-brand-scope">File {student.studentId}</span>
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
                  <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
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
                <span className="sp-user-name">{student.name}</span>
                <span className="sp-user-meta">{student.country}</span>
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
              <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
              <span>Sign out</span>
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

/** One line, on every portal screen. Your sign-in and your application now come
 *  from the server; documents and messages are still being wired. */
export function DemoNotice() {
  return (
    <p className="sp-demo" style={{ marginBottom: 18 }}>
      <Info size={15} aria-hidden="true" />
      <span>
        Your application is live. Documents and messages are still being
        connected, so anything you add there is not kept yet.
      </span>
    </p>
  );
}
