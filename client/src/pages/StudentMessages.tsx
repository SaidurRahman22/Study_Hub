import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import { useStudent } from "@/contexts/StudentContext";

/* ====================================================================== *
 *  MESSAGES                                                              *
 *                                                                        *
 *  Can I ask my counsellor something, and has anyone answered me?        *
 *                                                                        *
 *  One thread, oldest first, scrolling inside itself so arriving at the  *
 *  newest message does not drag the page about.                          *
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

export default function StudentMessages() {
  const { student, sendMessage, markMessagesRead } = useStudent();
  const [draft, setDraft] = useState("");
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

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
      </div>

      <DemoNotice />

      <section
        className="sp-panel sp-rise"
        aria-labelledby="thread-title"
        style={{ "--sp-delay": "60ms" } as React.CSSProperties}
      >
        <div className="sp-panel-head">
          <h2 className="sp-panel-title" id="thread-title">
            Your thread
          </h2>
          <span className="sp-hint" style={{ flex: "none" }}>
            Replies usually come the next working day
          </span>
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
                    <p className="sp-msg-body">{m.body}</p>
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
            placeholder="Ask about a document, a date, or anything you are unsure about."
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <p className="sp-hint" style={{ margin: 0 }}>
              Please do not send passwords, card numbers or full NID numbers
              here.
            </p>
            <button
              type="submit"
              className="sp-btn sp-btn-primary"
              disabled={draft.trim().length === 0}
            >
              <Send size={15} aria-hidden="true" />
              Send
            </button>
          </div>
        </form>
      </section>
    </StudentShell>
  );
}
