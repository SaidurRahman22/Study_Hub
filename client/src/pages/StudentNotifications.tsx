import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FileText, Megaphone, MessageSquare, Milestone } from "lucide-react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import { useStudent } from "@/contexts/StudentContext";
import { unreadNotifications, type Notification } from "@/lib/studentData";
import { safeHref } from "@/lib/safe-url";

/* ====================================================================== *
 *  NOTIFICATIONS                                                         *
 *                                                                        *
 *  Everything that happened to the file without the student asking: a    *
 *  document checked, a stage reached, a reply, a word from the office.   *
 *                                                                        *
 *  A page rather than a drop-down. It reads the same on a phone, it can  *
 *  be linked to, it keeps the whole history instead of the last twelve,  *
 *  and it cannot fail to open.                                           *
 * ====================================================================== */

const ICON = {
  document: FileText,
  stage: Milestone,
  message: MessageSquare,
  announcement: Megaphone,
} as const;

const KIND_LABEL = {
  document: "Document",
  stage: "Stage",
  message: "Message",
  announcement: "Announcement",
} as const;

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentNotifications() {
  const { student, notesLastRead, markNotificationsRead } = useStudent();

  /* Opening the page is reading it. The count has to be frozen at mount:
   * marking them read re-renders this component, and a recomputed count
   * would be zero, wiping the "new" markers before anyone saw them. */
  const [wasUnread] = useState(() =>
    student ? unreadNotifications(student.notifications, notesLastRead) : 0
  );
  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  if (!student) return <StudentShell>{null}</StudentShell>;

  const notes = student.notifications;
  let lastDay = "";

  return (
    <StudentShell>
      <div className="sp-title-row sp-rise">
        <div>
          <h1 className="sp-title">Notifications</h1>
          <p className="sp-sub">
            {wasUnread > 0
              ? `${wasUnread} new since you last looked.`
              : "Everything that has happened on your file."}
          </p>
        </div>
      </div>

      <DemoNotice />

      <section
        className="sp-panel sp-rise"
        aria-label="All notifications"
        style={{ "--sp-delay": "60ms" } as React.CSSProperties}
      >
        {notes.length === 0 ? (
          <div className="sp-panel-body">
            <p className="sp-hint">
              Nothing yet. Updates on your file will appear here.
            </p>
          </div>
        ) : (
          <ul className="sp-rows">
            {notes.map((n, i) => {
              const day = dayOf(n.at);
              const newDay = day !== lastDay;
              lastDay = day;
              return (
                <NoteRow
                  key={n.id}
                  note={n}
                  isNew={i < wasUnread}
                  dayHeading={newDay ? day : null}
                />
              );
            })}
          </ul>
        )}
      </section>
    </StudentShell>
  );
}

function NoteRow({
  note,
  isNew,
  dayHeading,
}: {
  note: Notification;
  isNew: boolean;
  dayHeading: string | null;
}) {
  const Icon = ICON[note.kind];

  const body = (
    <>
      <span className={`sp-note-icon sp-note-${note.kind}`} aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="sp-row-main">
        <span className="sp-note-title">
          {note.title}
          {isNew && <span className="sp-note-dot" aria-label="new" />}
        </span>
        {note.body && <span className="sp-note-body">{note.body}</span>}
        <span className="sp-note-at">
          {KIND_LABEL[note.kind]} · {timeOf(note.at)}
        </span>
      </span>
    </>
  );

  return (
    <>
      {dayHeading && (
        <li className="sp-note-day" aria-hidden="true">
          {dayHeading}
        </li>
      )}
      <li className="sp-row">
        {note.href ? (
          <Link href={safeHref(note.href) ?? "#"} className="sp-note-link">
            {body}
          </Link>
        ) : (
          <span className="sp-note-link">{body}</span>
        )}
      </li>
    </>
  );
}
