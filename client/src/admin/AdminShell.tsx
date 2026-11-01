import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Images,
  LayoutGrid,
  LogOut,
  Quote,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import { useAdmin } from "./AdminContext";
import { asset } from "@/lib/asset";

/* The rail, the top bar and the save bar. Layout follows TailwindAdmin
 * (MIT); the content is this site's own. */

const NAV = [
  {
    group: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/stories", label: "Success stories", icon: Quote },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/media", label: "Media", icon: Images },
    ],
  },
  {
    group: "Site",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { content, dirty, saving, save, signOut, error, notice, setNotice } =
    useAdmin();
  const [query, setQuery] = useState("");

  const stories =
    (content?.successStories as unknown[] | undefined)?.length ?? 0;
  const counts: Record<string, number> = { "/admin/stories": 0 };
  // flag stories still without a photo, since that is the open job there
  const missingPhotos =
    (content?.successStories as { image?: string }[] | undefined)?.filter(
      s => !s.image
    ).length ?? 0;
  counts["/admin/stories"] = missingPhotos;

  return (
    <div className="ad">
      <div className="ad-shell">
        <aside className="ad-side">
          <Link href="/admin" className="ad-brand">
            <img
              src={asset("/images/logo-mark.png")}
              alt=""
              width={34}
              height={34}
            />
            <span>
              <span className="ad-brand-name">Study Hub BD</span>
              <span className="ad-brand-sub">Content admin</span>
            </span>
          </Link>

          {NAV.map(section => (
            <div key={section.group}>
              <p className="ad-navgroup">{section.group}</p>
              <nav className="ad-nav" aria-label={section.group}>
                {section.items.map(item => {
                  const Icon = item.icon;
                  const n = counts[item.href] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="ad-nav-item"
                      aria-current={location === item.href ? "page" : undefined}
                    >
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      {item.label}
                      {n > 0 && (
                        <span className="ad-nav-count">
                          {n}
                          <span className="sr-only"> need attention</span>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="ad-side-foot">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="ad-nav-item"
            >
              <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
              View the site
            </a>
            <button
              type="button"
              className="ad-nav-item"
              style={{
                width: "100%",
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
              onClick={() => {
                signOut();
                navigate("/admin");
              }}
            >
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="ad-main">
          <header className="ad-top">
            <div className="ad-search">
              <Search size={17} aria-hidden="true" />
              <label className="sr-only" htmlFor="ad-q">
                Search the content
              </label>
              <input
                id="ad-q"
                type="search"
                placeholder="Search content…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="ad-top-actions">
              {dirty && (
                <span className="ad-tag ad-tag-warn">Unsaved changes</span>
              )}
              <span className="ad-avatar" aria-hidden="true">
                SH
              </span>
            </div>
          </header>

          <main className="ad-body">
            <div className="ad-wrap">
              {error && (
                <p
                  className="ad-note ad-note-bad"
                  style={{ marginBottom: 16 }}
                  role="alert"
                >
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
              {notice && (
                <p className="ad-note" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} aria-hidden="true" color="#04603a" />
                  <span style={{ flex: 1 }}>{notice}</span>
                  <button
                    type="button"
                    className="ad-btn ad-btn-sm"
                    onClick={() => setNotice(null)}
                  >
                    Dismiss
                  </button>
                </p>
              )}

              {children}

              {dirty && (
                <div className="ad-savebar">
                  <span className="ad-sub" style={{ margin: 0 }}>
                    {stories > 0
                      ? "Changes are not published yet."
                      : "Changes are not published yet."}
                  </span>
                  <span style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="ad-btn"
                      onClick={() => window.location.reload()}
                      disabled={saving}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn-primary"
                      onClick={() => save()}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save and publish"}
                    </button>
                  </span>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
