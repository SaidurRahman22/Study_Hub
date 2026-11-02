import { useRef, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { DOC_STATUS, type StudentDoc } from "@/lib/studentData";

/* ====================================================================== *
 *  A document, as a row in a list or as a card in the task grid.         *
 *  Shared so it looks and behaves the same on every screen.              *
 *                                                                        *
 *  Files are real. An upload goes to the server's private disk and a     *
 *  download comes back through a route that checks it is your document.  *
 *  Nothing is ever on a public URL.                                      *
 * ====================================================================== */

/** What the API accepts. The server checks this again. */
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_MB = 10;

export function StatusTag({ status }: { status: StudentDoc["status"] }) {
  const meta = DOC_STATUS[status];
  return <span className={`sp-tag sp-tag-${meta.tone}`}>{meta.label}</span>;
}

/** Sends the chosen file to the office. Says so while it is going, and says
 *  why if the server turns it away. */
export function UploadButton({
  docId,
  label = "Upload",
  primary = false,
}: {
  docId: string;
  label?: string;
  primary?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { attachDocument } = useStudent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`
      );
      return;
    }
    setError("");
    setBusy(true);
    try {
      await attachDocument(docId, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ACCEPT}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void send(file);
        }}
      />
      <button
        type="button"
        className={`sp-btn sp-btn-sm${primary ? " sp-btn-primary" : ""}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Upload size={14} aria-hidden="true" />
        {busy ? "Sending…" : label}
      </button>
      {error && (
        <span className="sp-row-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export function DownloadButton({ doc }: { doc: StudentDoc }) {
  const { downloadDocument } = useStudent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function get() {
    setError("");
    setBusy(true);
    try {
      await downloadDocument(doc.id, doc.file ?? doc.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be downloaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="sp-btn sp-btn-sm"
        onClick={() => void get()}
        disabled={busy}
      >
        <Download size={14} aria-hidden="true" />
        {busy ? "Fetching…" : "Download"}
      </button>
      {error && (
        <span className="sp-row-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

/** A full row, for the documents list. */
export function DocumentRow({ doc }: { doc: StudentDoc }) {
  const canAct = doc.status === "needed" || doc.status === "rejected";
  return (
    <li className="sp-row">
      <span className="sp-row-icon" aria-hidden="true">
        <FileText size={17} strokeWidth={1.75} />
      </span>
      <span className="sp-row-main">
        <span className="sp-row-name">{doc.name}</span>
        <span className="sp-row-meta">
          {doc.file
            ? [doc.file, doc.size, doc.updated].filter(Boolean).join(" · ")
            : "Nothing uploaded yet"}
        </span>
        {doc.note && <span className="sp-row-note">{doc.note}</span>}
      </span>
      <span className="sp-row-side">
        <span className="sp-row-status">
          <StatusTag status={doc.status} />
        </span>
        <span className="sp-row-actions">
          {doc.file && <DownloadButton doc={doc} />}
          {canAct && (
            <UploadButton
              docId={doc.id}
              label={doc.file ? "Replace" : "Upload"}
            />
          )}
        </span>
      </span>
    </li>
  );
}

/** A card, for the few things actually waiting on the student. One ask
 *  per card, with its action at the foot where the eye finishes. */
export function TaskCard({ doc }: { doc: StudentDoc }) {
  return (
    <li className="sp-task">
      <span className="sp-task-top">
        <span className="sp-task-name">{doc.name}</span>
        <StatusTag status={doc.status} />
      </span>
      {doc.note && <span className="sp-task-note">{doc.note}</span>}
      <span className="sp-task-foot">
        <UploadButton
          docId={doc.id}
          label={doc.file ? "Replace file" : "Upload file"}
          primary
        />
        {doc.file && <DownloadButton doc={doc} />}
      </span>
    </li>
  );
}
