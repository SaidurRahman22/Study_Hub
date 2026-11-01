import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import { useStudent } from "@/contexts/StudentContext";

/* ====================================================================== *
 *  MESSAGES                                                              *
 *                                                                        *
 *  The question: can I ask my counsellor something without waiting for   *
 *  office hours, and has anyone answered me?                             *
 *                                                                        *
 *  One thread, oldest first, so the conversation reads the way it        *
 *  happened. The composer sits under it rather than floating, and the    *
 *  newest message is scrolled to on arrival.                             *
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
      <div className="sp-title-row">
        <div>
          <h1 className="sp-title">Messages</h1>
          <p className="sp-sub">
            With {student.counsellor}, your counsellor at the Tangail office.
          </p>
        </div>
      </div>

      <DemoNotice />

      <section className="sp-panel" aria-labelledby="thread-title">
        <div className="sp-panel-head">
          <h2 className="sp-panel-title" id="thread-title">
            Your thread
          </h2>
          <span style={{ fontSize: 13, color: "var(--sp-faint)" }}>
            Replies usually come the next working day
          </span>
        </div>

        <div className="sp-thread">
          {student.messages.map(m => {
            const day = dayLabel(m.at);
            const newDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {newDay && (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--sp-faint)",
                      margin: "4px 0 14px",
                    }}
                  >
                    {day}
                  </p>
                )}
                <article
                  className={`sp-msg${m.from === "student" ? " sp-msg-student" : ""}`}
                >
                  <p className="sp-msg-head">
                    <span className="sp-msg-who">
                      {m.from === "student" ? "You" : m.author}
                    </span>
                    <span className="sp-msg-at">{timeLabel(m.at)}</span>
                  </p>
                  <p className="sp-msg-body">{m.body}</p>
                </article>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={onSubmit}
          style={{ borderTop: "1px solid var(--sp-line-soft)", padding: 16 }}
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
              gap: 12,
              marginTop: 10,
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
              <Send size={14} aria-hidden="true" />
              Send
            </button>
          </div>
        </form>
      </section>
    </StudentShell>
  );
}
