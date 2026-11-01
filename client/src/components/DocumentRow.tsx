import { useRef } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { DOC_STATUS, type StudentDoc } from "@/lib/studentData";

/* ====================================================================== *
 *  A document, as a row in a list or as a card in the task grid.         *
 *  Shared so it looks and behaves the same on every screen.              *
 * ====================================================================== */

export function StatusTag({ status }: { status: StudentDoc["status"] }) {
  const meta = DOC_STATUS[status];
  return <span className={`sp-tag sp-tag-${meta.tone}`}>{meta.label}</span>;
}

/** Choosing a file records its name and size, nothing else. The file is
 *  never read and never sent: there is nowhere to send it, and this
 *  repository must never become that place. */
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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) attachDocument(docId, file.name, file.size);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={`sp-btn sp-btn-sm${primary ? " sp-btn-primary" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} aria-hidden="true" />
        {label}
      </button>
    </>
  );
}

/** No file storage yet, so rather than a button that does nothing this
 *  hands back a short note naming the document and saying so. */
function downloadPlaceholder(doc: StudentDoc) {
  const lines = [
    doc.name,
    `File on record: ${doc.file ?? "none"}`,
    `Status: ${DOC_STATUS[doc.status].label}`,
    doc.updated ? `Last updated: ${doc.updated}` : "",
    "",
    "This is a placeholder from the Study Hub BD student portal prototype.",
    "There is no document storage yet, so there is no real file to return.",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name.replace(/[^\w\d -]+/g, "")} (placeholder).txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DownloadButton({ doc }: { doc: StudentDoc }) {
  return (
    <button
      type="button"
      className="sp-btn sp-btn-sm"
      onClick={() => downloadPlaceholder(doc)}
    >
      <Download size={14} aria-hidden="true" />
      Download
    </button>
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
