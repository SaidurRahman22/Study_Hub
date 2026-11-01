import { Link } from "wouter";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import NotificationBell from "@/components/NotificationBell";
import { TaskCard } from "@/components/DocumentRow";
import { useStudent } from "@/contexts/StudentContext";
import { fileProgress, openItems, STAGE_STATE } from "@/lib/studentData";

/* ====================================================================== *
 *  OVERVIEW                                                              *
 *                                                                        *
 *  One question: where has my application got to, and what is the        *
 *  office waiting on me for?                                             *
 *                                                                        *
 *  So the biggest figure is how much of the visa file is accepted, the   *
 *  blocking item sits under the title where it is read first, and the    *
 *  things waiting on the student get the full width as cards instead of  *
 *  being crushed into a narrow column.                                   *
 * ====================================================================== */

const LEGEND = [
  { key: "accepted", label: "accepted" },
  { key: "review", label: "with Study Hub" },
  { key: "needed", label: "we need this" },
  { key: "rejected", label: "to send again" },
] as const;

export default function StudentPortal() {
  const { student } = useStudent();
  if (!student) return <StudentShell>{null}</StudentShell>;

  const visaDocs = student.documents.filter(d => d.group === "visa");
  const progress = fileProgress(visaDocs);
  const open = openItems(student.documents);
  const blocker = open[0];
  const current = student.stages.find(s => s.state === "now");
  const lastFromAgency = [...student.messages]
    .reverse()
    .find(m => m.from === "agency");

  /* Only documents that are due get a block, so neither the strip nor
   * the figure can read as worse than the file really is. */
  const units = visaDocs.filter(d => d.status !== "later");
  const firstName = student.name.split(" ")[0];

  return (
    <StudentShell>
      <div className="sp-title-row sp-rise">
        <div>
          <h1 className="sp-title">Hello, {firstName}</h1>
          <p className="sp-sub">
            {student.course} · {student.university} · {student.intake} intake
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NotificationBell />
          <Link href="/student/documents" className="sp-btn sp-btn-primary">
            Go to documents
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <DemoNotice />

      {blocker && (
        <p className="sp-finding sp-rise" style={{ marginBottom: 18 }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            <span className="sp-finding-title">
              {blocker.name} is holding up the visa file
            </span>
            <span className="sp-finding-text">{blocker.note}</span>
          </span>
        </p>
      )}

      {open.length > 0 && (
        <section
          className="sp-rise"
          aria-labelledby="waiting-on-you"
          style={
            { "--sp-delay": "60ms", marginBottom: 18 } as React.CSSProperties
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h2 className="sp-panel-title" id="waiting-on-you">
              Waiting on you
            </h2>
            <span className="sp-hint">
              {open.length} item{open.length > 1 ? "s" : ""} waiting
            </span>
          </div>
          <ul className="sp-grid sp-grid-cards">
            {open.map(doc => (
              <TaskCard key={doc.id} doc={doc} />
            ))}
          </ul>
        </section>
      )}

      <div
        className="sp-grid sp-grid-2 sp-rise"
        style={{ "--sp-delay": "120ms" } as React.CSSProperties}
      >
        <div className="sp-grid">
          <section className="sp-panel" aria-labelledby="visa-file">
            <div className="sp-panel-head">
              <div>
                <h2 className="sp-panel-title" id="visa-file">
                  The visa file
                </h2>
                <p className="sp-panel-note">
                  Every block is one document the embassy looks for
                </p>
              </div>
              <span className="sp-hint" style={{ flex: "none" }}>
                {student.country}
              </span>
            </div>
            <div className="sp-panel-body">
              {/* The gap between figure and unit is a margin, so the text
                  node has no space in it. The label spells it out for a
                  screen reader. */}
              <p
                className="sp-lead-figure"
                aria-label={`${progress.accepted} of ${progress.due} documents accepted`}
              >
                <span aria-hidden="true">{progress.accepted}</span>
                <span className="sp-lead-unit" aria-hidden="true">
                  of {progress.due} accepted
                </span>
              </p>

              <ul
                className="sp-units"
                aria-hidden="true"
                style={{ marginTop: 18 }}
              >
                {units.map(d => (
                  <li
                    key={d.id}
                    className={`sp-unit sp-unit-${d.status}`}
                    title={d.name}
                  />
                ))}
              </ul>

              <ul className="sp-legend">
                {LEGEND.map(({ key, label }) => {
                  const n = units.filter(d => d.status === key).length;
                  if (!n) return null;
                  return (
                    <li key={key}>
                      <span
                        className={`sp-unit sp-unit-${key}`}
                        aria-hidden="true"
                      />
                      {n} {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="sp-panel" aria-labelledby="where-you-are">
            <div className="sp-panel-head">
              <h2 className="sp-panel-title" id="where-you-are">
                Where you are
              </h2>
              {current && (
                <span className="sp-hint" style={{ flex: "none" }}>
                  {current.when}
                </span>
              )}
            </div>
            <div className="sp-panel-body">
              <ol className="sp-stages">
                {student.stages.map(stage => (
                  <li
                    key={stage.name}
                    className={`sp-stage sp-stage-${stage.state}`}
                  >
                    <span className="sp-stage-mark" aria-hidden="true">
                      {stage.state === "done" && (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </span>
                    <span>
                      <span className="sp-stage-head">
                        <span className="sp-stage-name">
                          {stage.name}
                          <span className="sr-only">
                            , {STAGE_STATE[stage.state]}
                          </span>
                        </span>
                        <span className="sp-stage-when">{stage.when}</span>
                      </span>
                      {stage.note && (
                        <span className="sp-stage-note">{stage.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <div className="sp-grid">
          {lastFromAgency && (
            <section className="sp-panel" aria-labelledby="latest-message">
              <div className="sp-panel-head">
                <h2 className="sp-panel-title" id="latest-message">
                  Latest message
                </h2>
                <Link
                  href="/student/messages"
                  className="sp-hint"
                  style={{ flex: "none" }}
                >
                  See all
                </Link>
              </div>
              <div className="sp-panel-body">
                <p className="sp-msg-head" style={{ marginBottom: 8 }}>
                  <span className="sp-msg-who">{lastFromAgency.author}</span>
                  <span className="sp-msg-at">
                    {new Date(lastFromAgency.at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </p>
                <p
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: "var(--sp-mute)",
                  }}
                >
                  {lastFromAgency.body}
                </p>
              </div>
            </section>
          )}

          <section className="sp-panel" aria-labelledby="your-counsellor">
            <div className="sp-panel-head">
              <h2 className="sp-panel-title" id="your-counsellor">
                Your counsellor
              </h2>
            </div>
            <div className="sp-panel-body">
              <p style={{ fontSize: 15, fontWeight: 500 }}>
                {student.counsellor}
              </p>
              <p className="sp-kpi-label" style={{ marginTop: 2 }}>
                Study Hub BD, Tangail
              </p>
              <Link
                href="/student/messages"
                className="sp-btn sp-btn-sm"
                style={{ marginTop: 16 }}
              >
                Ask a question
              </Link>
            </div>
          </section>
        </div>
      </div>
    </StudentShell>
  );
}
