import { useState } from "react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import NotificationBell from "@/components/NotificationBell";
import { DocumentRow } from "@/components/DocumentRow";
import { useStudent } from "@/contexts/StudentContext";
import { fileProgress, openItems, type DocStatus } from "@/lib/studentData";

/* ====================================================================== *
 *  DOCUMENTS                                                             *
 *                                                                        *
 *  What have I given them, what is still with them, what do they want?   *
 *                                                                        *
 *  Split the way the office works rather than alphabetically: the visa   *
 *  file is live so it leads, the university file is finished so it sits  *
 *  below. The filter starts on everything, because hiding the accepted   *
 *  items would hide the reassurance.                                     *
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
      note: "What the embassy reads. Nothing is submitted until every item is accepted.",
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
      <div className="sp-title-row sp-rise">
        <div>
          <h1 className="sp-title">Documents</h1>
          <p className="sp-sub">
            {open.length === 0
              ? "Nothing outstanding. The office has everything it asked for."
              : `${open.length} item${open.length > 1 ? "s" : ""} need${open.length > 1 ? "" : "s"} something from you.`}
          </p>
        </div>
        <NotificationBell />
      </div>

      <DemoNotice />

      <div
        role="group"
        aria-label="Filter documents by status"
        className="sp-rise"
        style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 18 }}
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
              className="sp-chip"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="sp-chip-n">{n}</span>
            </button>
          );
        })}
      </div>

      <div
        className="sp-grid sp-rise"
        style={{ "--sp-delay": "60ms" } as React.CSSProperties}
      >
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
                  <p className="sp-panel-note">{group.note}</p>
                </div>
                <span className="sp-hint" style={{ flex: "none" }}>
                  {group.count}
                </span>
              </div>

              {/* An empty section keeps its frame and says why it is empty. */}
              {docs.length === 0 ? (
                <div className="sp-panel-body">
                  <p className="sp-hint">
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

      <p className="sp-hint" style={{ marginTop: 20, maxWidth: "72ch" }}>
        Scans should be straight, in colour and readable corner to corner. PDF,
        JPG, PNG or WebP, up to 10 MB. If you are unsure whether something is
        right, send it and ask on the messages screen.
      </p>
    </StudentShell>
  );
}
