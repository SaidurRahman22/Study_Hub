import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { DOC_STATUS, type StudentDoc } from "@/lib/studentData";

/* ====================================================================== *
 *  One document, as a row.                                               *
 *                                                                        *
 *  Shared by the overview and the documents screen so a document looks   *
 *  and behaves the same in both. One status mark per row, never a tag    *
 *  and a badge saying the same thing.                                    *
 * ====================================================================== */

export function StatusTag({ status }: { status: StudentDoc["status"] }) {
  const meta = DOC_STATUS[status];
  return <span className={`sp-tag sp-tag-${meta.tone}`}>{meta.label}</span>;
}

/** Choosing a file records its NAME and SIZE and nothing else. The file is
 *  never read, never held in memory and never sent: there is no server to
 *  send it to, and this repository must never become one. */
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
          // let the same file be chosen again after a mistake
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

/** The portal has no file storage, so there is nothing real to hand back.
 *  Rather than a button that does nothing, this downloads a short note
 *  naming the document and saying plainly that it is a placeholder. */
function downloadPlaceholder(doc: StudentDoc) {
  const lines = [
    `${doc.name}`,
    `File on record: ${doc.file ?? "none"}`,
    `Status: ${DOC_STATUS[doc.status].label}`,
    doc.updated ? `Last updated: ${doc.updated}` : "",
    "",
    "This is a placeholder from the Study Hub BD student portal prototype.",
    "The portal has no document storage yet, so there is no real file to",
    "download. Once private storage is connected, this button will return",
    "the document itself.",
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

export function DocumentRow({ doc }: { doc: StudentDoc }) {
  const canAct = doc.status === "needed" || doc.status === "rejected";
  return (
    <li className="sp-row">
      <span className="sp-row-main">
        <span className="sp-row-name">{doc.name}</span>
        {doc.file ? (
          <span className="sp-row-meta">
            {doc.file}
            {doc.size ? ` · ${doc.size}` : ""}
            {doc.updated ? ` · ${doc.updated}` : ""}
          </span>
        ) : (
          <span className="sp-row-meta">Nothing uploaded yet</span>
        )}
        {doc.note && <span className="sp-row-note">{doc.note}</span>}
      </span>
      <span className="sp-row-side">
        <StatusTag status={doc.status} />
        {doc.file && <DownloadButton doc={doc} />}
        {canAct && (
          <UploadButton
            docId={doc.id}
            label={doc.file ? "Replace" : "Upload"}
          />
        )}
      </span>
    </li>
  );
}
