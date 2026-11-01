import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  FileText,
  Megaphone,
  MessageSquare,
  Milestone,
} from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { unreadNotifications, type Notification } from "@/lib/studentData";

/* ====================================================================== *
 *  The bell and its panel.                                               *
 *                                                                        *
 *  A panel rather than a page jump: a student checking whether anything  *
 *  changed should not lose the screen they were working on.              *
 *                                                                        *
 *  Opening it does NOT mark everything read. That was the old            *
 *  behaviour and it made the Unread tab meaningless: by the time you     *
 *  could press it, nothing was unread any more. Reading is now an        *
 *  explicit act, either "Mark all as read" or opening the full page.     *
 * ====================================================================== */

const ICON = {
  document: FileText,
  stage: Milestone,
  message: MessageSquare,
  announcement: Megaphone,
} as const;

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const KIND_LABEL = {
  document: "Document",
  stage: "Stage",
  message: "Message",
  announcement: "Announcement",
} as const;

export default function NotificationBell() {
  const { student, notesLastRead, markNotificationsRead } = useStudent();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Escape closes and hands focus back. A click outside closes without
   * swallowing that click's effect elsewhere. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!student) return null;

  const notes = student.notifications;
  const unread = unreadNotifications(notes, notesLastRead);
  const isUnread = (n: Notification) => !notesLastRead || n.at > notesLastRead;
  const shown = tab === "unread" ? notes.filter(isUnread) : notes;

  return (
    <div className="sp-bellwrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="sp-bell"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        {unread > 0 && (
          <span className="sp-bell-count" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="sp-pop"
          role="dialog"
          aria-label="Notifications"
          ref={panelRef}
        >
          <div className="sp-pop-head">
            <span className="sp-pop-title">Notifications</span>
            <button
              type="button"
              className="sp-pop-mark"
              onClick={markNotificationsRead}
              disabled={unread === 0}
            >
              Mark all as read
            </button>
          </div>

          <div
            className="sp-tabs"
            role="tablist"
            aria-label="Filter notifications"
          >
            {(["all", "unread"] as const).map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className="sp-tab"
                onClick={() => setTab(t)}
              >
                {t === "all" ? "All" : "Unread"}
                {t === "unread" && unread > 0 && (
                  <span className="sp-tab-n">{unread}</span>
                )}
              </button>
            ))}
          </div>

          <div className="sp-pop-list">
            {shown.length === 0 ? (
              <p className="sp-pop-empty">
                {tab === "unread"
                  ? "Nothing new. You are up to date."
                  : "Nothing yet. Updates on your file will appear here."}
              </p>
            ) : (
              <ul>
                {shown.slice(0, 12).map(n => {
                  const Icon = ICON[n.kind];
                  const body = (
                    <>
                      <span
                        className={`sp-note-icon sp-note-${n.kind}`}
                        aria-hidden="true"
                      >
                        <Icon size={15} strokeWidth={1.75} />
                      </span>
                      <span className="sp-pop-main">
                        <span className="sp-pop-t">
                          {n.title}
                          {isUnread(n) && (
                            <span className="sp-note-dot" aria-label="unread" />
                          )}
                        </span>
                        {n.body && <span className="sp-pop-b">{n.body}</span>}
                        <span className="sp-pop-m">
                          {ago(n.at)} · {KIND_LABEL[n.kind]}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          className="sp-pop-item"
                          onClick={() => setOpen(false)}
                        >
                          {body}
                        </Link>
                      ) : (
                        <span className="sp-pop-item">{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="sp-pop-foot">
            <Link
              href="/student/notifications"
              className="sp-pop-all"
              onClick={() => setOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
