import { useState } from "react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import { DocumentRow } from "@/components/DocumentRow";
import { useStudent } from "@/contexts/StudentContext";
import { fileProgress, openItems, type DocStatus } from "@/lib/studentData";

/* ====================================================================== *
 *  DOCUMENTS                                                             *
 *                                                                        *
 *  The question: what have I given them, what is still with them, and    *
 *  what do they want from me?                                            *
 *                                                                        *
 *  Split the way the office works rather than alphabetically: the        *
 *  university file is finished and collapses into a quiet list, while    *
 *  the visa file is live and leads. The filter defaults to everything,   *
 *  because hiding the accepted items would hide the reassurance.         *
 * ====================================================================== */

const FILTERS: { key: "all" | DocStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needed", label: "We need this" },
  { key: "rejected", label: "Send again" },
  { key: "review", label: "With Study Hub" },
  { key: "accepted", label: "Accepted" },
];

export default function StudentDocuments() {
  const { student } = useStudent();
  const [filter, setFilter] = useState<"all" | DocStatus>("all");
  if (!student) return <StudentShell>{null}</StudentShell>;

  const open = openItems(student.documents);
  const visa = fileProgress(student.documents.filter(d => d.group === "visa"));

  const show = (group: "application" | "visa") =>
    student.documents.filter(
      d => d.group === group && (filter === "all" || d.status === filter)
    );

  const groups = [
    {
      key: "visa" as const,
      title: "The visa file",
      note: "What the embassy will read. Nothing is submitted until every item here is accepted.",
      count: `${visa.accepted} of ${visa.due} accepted`,
    },
    {
      key: "application" as const,
      title: "The university file",
      note: "Everything that went to the university with your application.",
      count: "Complete",
    },
  ];

  return (
    <StudentShell>
      <div className="sp-title-row">
        <div>
          <h1 className="sp-title">Documents</h1>
          <p className="sp-sub">
            {open.length === 0
              ? "Nothing outstanding — the office has everything it asked for."
              : `${open.length} item${open.length > 1 ? "s" : ""} need${open.length > 1 ? "" : "s"} something from you.`}
          </p>
        </div>
      </div>

      <DemoNotice />

      {/* The filter is a row of plain buttons, not a select: five options
          that the reader can see at once beat a menu they have to open. */}
      <div
        role="group"
        aria-label="Filter documents by status"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
      >
        {FILTERS.map(f => {
          const n =
            f.key === "all"
              ? student.documents.length
              : student.documents.filter(d => d.status === f.key).length;
          if (n === 0 && f.key !== "all") return null;
          return (
            <button
              key={f.key}
              type="button"
              className="sp-btn sp-btn-sm"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              style={
                filter === f.key
                  ? {
                      borderColor: "#15466b",
                      boxShadow: "inset 0 0 0 1px #15466b",
                    }
                  : undefined
              }
            >
              {f.label}
              <span style={{ color: "var(--sp-faint)" }}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="sp-grid">
        {groups.map(group => {
          const docs = show(group.key);
          return (
            <section
              className="sp-panel"
              key={group.key}
              aria-labelledby={`g-${group.key}`}
            >
              <div className="sp-panel-head">
                <div>
                  <h2 className="sp-panel-title" id={`g-${group.key}`}>
                    {group.title}
                  </h2>
                  <p className="sp-kpi-label" style={{ marginTop: 2 }}>
                    {group.note}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--sp-faint)",
                    flex: "none",
                  }}
                >
                  {group.count}
                </span>
              </div>

              {/* An empty section keeps its frame and says why it is empty,
                  rather than disappearing and leaving the reader guessing. */}
              {docs.length === 0 ? (
                <div className="sp-panel-body">
                  <p style={{ fontSize: 14, color: "var(--sp-mute)" }}>
                    No document in this file has that status.
                  </p>
                </div>
              ) : (
                <ul className="sp-rows">
                  {docs.map(doc => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="sp-hint" style={{ marginTop: 18, maxWidth: "76ch" }}>
        Scans should be straight, in colour, and readable corner to corner. PDF
        or JPG, under 5 MB. If you are unsure whether something is right, send
        it anyway and ask on the messages screen — it is quicker to check than
        to redo.
      </p>
    </StudentShell>
  );
}
