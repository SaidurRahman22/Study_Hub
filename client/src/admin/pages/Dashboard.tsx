import { Link } from "wouter";
import {
  ArrowRight,
  Globe2,
  ImageOff,
  Quote,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useAdmin } from "../AdminContext";

/* ====================================================================== *
 *  DASHBOARD                                                             *
 *                                                                        *
 *  The template this is modelled on opens with revenue, tickets and a    *
 *  donut chart. None of that exists here: this is a content admin, so    *
 *  the tiles count content and, more usefully, count the things that     *
 *  are unfinished. A number you cannot act on is decoration.             *
 * ====================================================================== */

type Story = { name?: string; image?: string };

/** Walks the whole document for placeholder tokens like
 *  [TRADE LICENCE NUMBER], which are facts the client still owes. */
function findPlaceholders(doc: unknown, path = ""): string[] {
  const out: string[] = [];
  const token = /\[[A-Z][A-Z0-9 /.-]+\]/g;
  const walk = (node: unknown, where: string) => {
    if (typeof node === "string") {
      const hits = node.match(token);
      if (hits) out.push(...hits.map(h => `${h}|${where}`));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${where}[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        walk(v, where ? `${where}.${k}` : k);
      }
    }
  };
  walk(doc, path);
  return out;
}

export default function Dashboard() {
  const { content } = useAdmin();

  const stories = (content?.successStories as Story[] | undefined) ?? [];
  const services = (content?.services as unknown[] | undefined) ?? [];
  const destinations = (content?.destinations as unknown[] | undefined) ?? [];

  const missingPhotos = stories.filter(s => !s.image).length;
  const placeholders = findPlaceholders(content?.legal);
  const uniquePlaceholders = Array.from(
    new Set(placeholders.map(p => p.split("|")[0]))
  );

  const tiles = [
    {
      label: "Success stories",
      value: stories.length,
      tone: "ad-stat-a",
      icon: Quote,
      href: "/admin/stories",
    },
    {
      label: "Services",
      value: services.length,
      tone: "ad-stat-b",
      icon: Wrench,
      href: "/admin/services",
    },
    {
      label: "Destinations",
      value: destinations.length,
      tone: "ad-stat-c",
      icon: Globe2,
      href: "/admin/settings",
    },
    {
      label: "Stories without a photo",
      value: missingPhotos,
      tone: "ad-stat-d",
      icon: ImageOff,
      href: "/admin/stories",
    },
  ];

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Dashboard</h1>
          <p className="ad-sub">
            What is on the site, and what is still waiting on you.
          </p>
        </div>
      </div>

      <div className="ad-stats">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <Link key={t.label} href={t.href} className={`ad-stat ${t.tone}`}>
              <span className="ad-stat-mark">
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="ad-stat-label">{t.label}</span>
              <span className="ad-stat-value">{t.value}</span>
            </Link>
          );
        })}
      </div>

      <div className="ad-grid ad-grid-2" style={{ marginTop: 18 }}>
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Still to fill in</h2>
              <p className="ad-card-note">
                Facts the legal pages are waiting for
              </p>
            </div>
            {uniquePlaceholders.length > 0 ? (
              <span className="ad-tag ad-tag-warn">
                {uniquePlaceholders.length}
              </span>
            ) : (
              <span className="ad-tag ad-tag-ok">All done</span>
            )}
          </div>
          <div className="ad-card-body">
            {uniquePlaceholders.length === 0 ? (
              <p className="ad-sub" style={{ margin: 0 }}>
                Nothing outstanding. Every legal field has a real value.
              </p>
            ) : (
              <>
                <ul style={{ display: "grid", gap: 8 }}>
                  {uniquePlaceholders.map(p => (
                    <li
                      key={p}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span className="ad-tag ad-tag-warn">{p}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/admin/settings"
                  className="ad-btn ad-btn-sm"
                  style={{ marginTop: 16 }}
                >
                  Fill these in
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Student photos</h2>
              <p className="ad-card-note">Shown on the success stories page</p>
            </div>
            {missingPhotos > 0 ? (
              <span className="ad-tag ad-tag-info">
                {missingPhotos} using initials
              </span>
            ) : (
              <span className="ad-tag ad-tag-ok">All have photos</span>
            )}
          </div>
          <div className="ad-card-body">
            <p className="ad-sub" style={{ marginTop: 0 }}>
              A student with no photo is shown as their initials, which is the
              honest default. Only upload a photo you took and that the student
              has agreed you can publish.
            </p>
            <Link href="/admin/stories" className="ad-btn ad-btn-sm">
              Open stories
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <p className="ad-note ad-note-warn" style={{ marginTop: 18 }}>
        <ShieldAlert size={16} aria-hidden="true" />
        <span>
          Saving here commits to the website's repository and triggers a
          rebuild, so anything you save goes public in about a minute. There is
          no draft state and no undo beyond the repository history.
        </span>
      </p>
    </>
  );
}
