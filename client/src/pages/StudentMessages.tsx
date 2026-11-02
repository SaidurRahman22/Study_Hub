import { useEffect, useRef, useState, type FormEvent } from "react";
import { Download, FileText, Send } from "lucide-react";
import { Link } from "wouter";
import StudentShell from "@/components/StudentShell";
import NotificationBell from "@/components/NotificationBell";
import { useStudent } from "@/contexts/StudentContext";
import { downloadChatPdf } from "@/lib/chatPdf";
import type { Attachment } from "@/lib/studentData";

/* ====================================================================== *
 *  MESSAGES                                                              *
 *                                                                        *
 *  Can I ask my counsellor something, and has anyone answered me?        *
 *                                                                        *
 *  Text only. Files go to the Documents screen instead, where the office  *
 *  gives each one a status and feedback, and where it is kept on the      *
 *  server's private disk. A file dropped into a chat would have neither.  *
 * ====================================================================== */

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("");
}

/** Older messages may still carry an attachment from before files moved to
 *  the Documents screen, so the thread can still show one. */
function AttachmentView({ a }: { a: Attachment }) {
  if (a.kind === "image") {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="sp-att-img"
        title={a.name}
      >
        <img src={a.url} alt={a.name} />
      </a>
    );
  }
  return (
    <a
      href={a.url}
      download={a.name}
      className="sp-att-file"
      title={`Download ${a.name}`}
    >
      <FileText size={16} aria-hidden="true" />
      <span className="sp-att-meta">
        <span className="sp-att-name">{a.name}</span>
        <span className="sp-att-size">{a.size}</span>
      </span>
      <Download size={14} aria-hidden="true" />
    </a>
  );
}

export default function StudentMessages() {
  const { student, sendMessage, markMessagesRead } = useStudent();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const count = student?.messages.length ?? 0;

  /* Opening the screen is reading it. */
  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  if (!student) return <StudentShell>{null}</StudentShell>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    try {
      await sendMessage(text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That message was not sent.");
    } finally {
      setSending(false);
    }
  }

  const canSend = draft.trim().length > 0 && !sending;
  let lastDay = "";

  return (
    <StudentShell>
      <div className="sp-title-row sp-rise">
        <div>
          <h1 className="sp-title">Messages</h1>
          <p className="sp-sub">
            With {student.counsellor} at the Tangail office.
          </p>
        </div>
        <NotificationBell />
      </div>

      <section
        className="sp-panel sp-msgs sp-rise"
        aria-labelledby="thread-title"
        style={{ "--sp-delay": "60ms" } as React.CSSProperties}
      >
        <div className="sp-panel-head">
          <div>
            <h2 className="sp-panel-title" id="thread-title">
              Your thread
            </h2>
            <p className="sp-panel-note">
              Replies usually come the next working day
            </p>
          </div>
          <button
            type="button"
            className="sp-btn sp-btn-sm"
            onClick={() => downloadChatPdf(student)}
          >
            <Download size={14} aria-hidden="true" />
            Download as PDF
          </button>
        </div>

        <div className="sp-thread">
          {student.messages.map(m => {
            const day = dayLabel(m.at);
            const newDay = day !== lastDay;
            lastDay = day;
            const mine = m.from === "student";
            return (
              <div key={m.id}>
                {newDay && (
                  <p className="sp-day" style={{ marginBottom: 18 }}>
                    {day}
                  </p>
                )}
                <article className={`sp-msg${mine ? " sp-msg-student" : ""}`}>
                  <span className="sp-msg-avatar" aria-hidden="true">
                    {initials(m.author)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p className="sp-msg-head">
                      <span className="sp-msg-who">
                        {mine ? "You" : m.author}
                      </span>
                      <span className="sp-msg-at">{timeLabel(m.at)}</span>
                    </p>
                    {m.body && <p className="sp-msg-body">{m.body}</p>}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="sp-att-row">
                        {m.attachments.map(a => (
                          <AttachmentView key={a.id} a={a} />
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={onSubmit}
          style={{ borderTop: "1px solid var(--sp-line-soft)", padding: 20 }}
        >
          <label className="sp-label" htmlFor="sp-draft">
            Write to {student.counsellor}
          </label>
          <textarea
            id="sp-draft"
            className="sp-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ask anything about your application."
          />

          {error && (
            <p className="sp-row-error" role="alert" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 12,
            }}
          >
            <p className="sp-hint" style={{ margin: 0, maxWidth: "46ch" }}>
              Sending a document? Put it on the{" "}
              <Link href="/student/documents" style={{ color: "var(--sp-ink)" }}>
                Documents
              </Link>{" "}
              screen so we can check it and tell you what it needs.
            </p>
            <button
              type="submit"
              className="sp-btn sp-btn-primary"
              disabled={!canSend}
            >
              <Send size={15} aria-hidden="true" />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </section>
    </StudentShell>
  );
}
