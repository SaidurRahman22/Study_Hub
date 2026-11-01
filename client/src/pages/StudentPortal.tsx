import { Link } from "wouter";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import StudentShell, { DemoNotice } from "@/components/StudentShell";
import { DocumentRow } from "@/components/DocumentRow";
import { useStudent } from "@/contexts/StudentContext";
import { fileProgress, openItems, STAGE_STATE } from "@/lib/studentData";

/* ====================================================================== *
 *  OVERVIEW                                                              *
 *                                                                        *
 *  The one question this screen answers: where has my application got    *
 *  to, and what is the office waiting on me for?                         *
 *                                                                        *
 *  So the largest figure on the screen is how much of the visa file is   *
 *  accepted, the finding sits directly under the title where it is read  *
 *  first, and the most frequent job — sending in the document that is    *
 *  holding everything up — is one click from here.                       *
 * ====================================================================== */

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

  /* Only documents that are actually due get a block. An item marked
   * "not needed yet" is left out of both the strip and the figure, so
   * neither can read as worse than the file really is. */
  const units = visaDocs.filter(d => d.status !== "later");

  return (
    <StudentShell>
      <div className="sp-title-row">
        <div>
          <h1 className="sp-title">Your application</h1>
          <p className="sp-sub">
            {student.course} · {student.university} · {student.intake} intake
          </p>
        </div>
        <Link href="/student/documents" className="sp-btn sp-btn-primary">
          Go to documents
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <DemoNotice />

      {blocker && (
        <p className="sp-finding" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span className="sp-finding-text">
            <strong style={{ fontWeight: 600 }}>{blocker.name}</strong> is
            holding up the visa file. {blocker.note}
          </span>
        </p>
      )}

      <div className="sp-grid sp-grid-2">
        {/* ---------- left: the file, then the route through it ---------- */}
        <div className="sp-grid">
          <section className="sp-panel" aria-labelledby="visa-file">
            <div className="sp-panel-head">
              <h2 className="sp-panel-title" id="visa-file">
                The visa file
              </h2>
              <span style={{ fontSize: 13, color: "var(--sp-faint)" }}>
                {student.country}
              </span>
            </div>
            <div className="sp-panel-body">
              <p className="sp-lead-figure">
                {progress.accepted}
                <span className="sp-lead-unit">
                  {" "}
                  of {progress.due} accepted
                </span>
              </p>
              <p
                className="sp-kpi-label"
                style={{ marginTop: 4, marginBottom: 14 }}
              >
                Every block is one document the embassy will look for.
              </p>

              <ul className="sp-units" aria-hidden="true">
                {units.map(d => (
                  <li
                    key={d.id}
                    className={`sp-unit sp-unit-${d.status}`}
                    title={d.name}
                  />
                ))}
              </ul>

              <ul
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px 18px",
                  marginTop: 14,
                  fontSize: 13,
                  color: "var(--sp-mute)",
                }}
              >
                {(
                  [
                    ["accepted", "accepted"],
                    ["review", "with Study Hub"],
                    ["needed", "we need this"],
                    ["rejected", "to send again"],
                  ] as const
                ).map(([key, label]) => {
                  const n = units.filter(d => d.status === key).length;
                  if (!n) return null;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span
                        className={`sp-unit sp-unit-${key}`}
                        aria-hidden="true"
                        style={{ width: 14 }}
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
                <span style={{ fontSize: 13, color: "var(--sp-faint)" }}>
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
                        <Check size={11} strokeWidth={3} />
                      )}
                    </span>
                    <span>
                      <span className="sp-stage-name">
                        {stage.name}
                        <span className="sr-only">
                          {" "}
                          — {STAGE_STATE[stage.state]}
                        </span>
                      </span>
                      <span className="sp-stage-when"> · {stage.when}</span>
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

        {/* ---------- right: what you have to do, and the last word ------ */}
        <div className="sp-grid">
          <section className="sp-panel" aria-labelledby="waiting-on-you">
            <div className="sp-panel-head">
              <h2 className="sp-panel-title" id="waiting-on-you">
                Waiting on you
              </h2>
              <span style={{ fontSize: 13, color: "var(--sp-faint)" }}>
                {open.length === 0
                  ? "Nothing"
                  : `${open.length} item${open.length > 1 ? "s" : ""}`}
              </span>
            </div>
            {open.length === 0 ? (
              <div className="sp-panel-body">
                <p style={{ fontSize: 14, color: "var(--sp-mute)" }}>
                  Nothing for you to do. The office has everything it asked for.
                </p>
              </div>
            ) : (
              <ul className="sp-rows">
                {open.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </ul>
            )}
          </section>

          {lastFromAgency && (
            <section className="sp-panel" aria-labelledby="latest-message">
              <div className="sp-panel-head">
                <h2 className="sp-panel-title" id="latest-message">
                  Latest from the office
                </h2>
                <Link
                  href="/student/messages"
                  style={{ fontSize: 13, color: "var(--sp-ink)" }}
                >
                  All messages
                </Link>
              </div>
              <div className="sp-panel-body">
                <p className="sp-msg-head" style={{ marginBottom: 6 }}>
                  <span className="sp-msg-who">{lastFromAgency.author}</span>
                  <span className="sp-msg-at">
                    {new Date(lastFromAgency.at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </p>
                <p style={{ fontSize: 14, color: "var(--sp-mute)" }}>
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
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {student.counsellor}
              </p>
              <p className="sp-kpi-label" style={{ marginTop: 2 }}>
                Study Hub BD, Tangail · file {student.studentId}
              </p>
              <Link
                href="/student/messages"
                className="sp-btn sp-btn-sm"
                style={{ marginTop: 12 }}
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
