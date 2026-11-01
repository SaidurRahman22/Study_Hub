import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import { Download, FileText, Paperclip, Send, X } from "lucide-react";
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
 *  The composer takes a document or image, from the attach button or     *
 *  pasted straight in (a screenshot, say). The portal has no storage, so  *
 *  an attachment is held as an in-browser object URL for this session     *
 *  only. Nothing is uploaded anywhere.                                    *
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

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

let seq = 0;
function toAttachment(file: File): Attachment {
  const kind = file.type.startsWith("image/") ? "image" : "file";
  return {
    id: `att-${Date.now()}-${seq++}`,
    name: file.name || (kind === "image" ? "pasted-image.png" : "file"),
    kind,
    mime: file.type || "application/octet-stream",
    size: humanSize(file.size),
    url: URL.createObjectURL(file),
  };
}

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
  const [pending, setPending] = useState<Attachment[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const count = student?.messages.length ?? 0;

  /* Opening the screen is reading it. */
  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [count, pending.length]);

  if (!student) return <StudentShell>{null}</StudentShell>;

  const addFiles = (files: FileList | File[]) => {
    const picked = Array.from(files).filter(Boolean).map(toAttachment);
    if (picked.length) setPending(prev => [...prev, ...picked]);
  };

  const removePending = (id: string) =>
    setPending(prev => prev.filter(a => a.id !== id));

  /* A pasted screenshot arrives as an image item on the clipboard. Text
   * paste is left to the textarea's own handling. */
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files || []);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() && pending.length === 0) return;
    sendMessage(draft, pending);
    setDraft("");
    setPending([]);
  }

  const canSend = draft.trim().length > 0 || pending.length > 0;
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
            onPaste={onPaste}
            placeholder="Write a message, attach a file, or paste an image."
          />

          {pending.length > 0 && (
            <ul className="sp-att-pending">
              {pending.map(a => (
                <li key={a.id} className="sp-att-chip">
                  {a.kind === "image" ? (
                    <img src={a.url} alt="" className="sp-att-thumb" />
                  ) : (
                    <FileText size={15} aria-hidden="true" />
                  )}
                  <span className="sp-att-chip-name">{a.name}</span>
                  <button
                    type="button"
                    className="sp-att-x"
                    onClick={() => removePending(a.id)}
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={e => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="sp-btn sp-btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={15} aria-hidden="true" />
              Attach
            </button>
            <button
              type="submit"
              className="sp-btn sp-btn-primary"
              disabled={!canSend}
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
