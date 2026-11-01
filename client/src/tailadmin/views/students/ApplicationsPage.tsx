import { useState } from 'react';
import { Icon } from '@iconify/react';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Textarea } from 'src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { Caveat, ScreenHead, StatusTag } from 'src/content/ui';
import { activeStage } from 'src/content/students';
import { useStudents } from 'src/content/students-store';
import { useListSearch } from 'src/content/search';

/* Applications & visa, each student's six-stage progress as collapsible cards,
 * the admin sets each stage's progress and date, plus the admin's own case
 * notes. Store-backed, so edits show at once and reset on reload (no backend). */

type StageState = 'done' | 'now' | 'todo';

const STATE_OPTIONS: { value: StageState; label: string }[] = [
  { value: 'todo', label: 'Not started' },
  { value: 'now', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export default function ApplicationsPage() {
  const { students, updateStage, addCaseNote, updateCaseNote, deleteCaseNote } =
    useStudents();
  const q = useListSearch('Search students');

  // All cards start collapsed; the record only holds the ones toggled open.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const rows = students.filter((s) =>
    [s.name, s.studentId, s.country, s.university]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );

  return (
    <>
      <ScreenHead
        title="Applications & visa"
        subtitle="Where each student stands, with your notes."
      />

      <Caveat>
        Sample data, no backend yet. Real student records need a private, access-controlled
        store, not the public content repo. See <code>Docs/ADMIN-CONTENT-MAP.md §5</code>.
      </Caveat>

      {rows.map((s) => {
        const stage = activeStage(s);
        const open = !!expanded[s.studentId];
        const notes = s.caseNotes ?? [];
        return (
          <CardBox key={s.studentId} className="mb-6">
            <button
              type="button"
              onClick={() => toggle(s.studentId)}
              className="flex w-full items-start justify-between gap-3 p-4 sm:p-6 text-left"
              aria-expanded={open}
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  {s.name}
                </h2>
                <span className="block text-xs text-muted-foreground">{s.studentId}</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {s.country} · {s.university}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                {stage ? (
                  <StatusTag tone="info">{stage.name}</StatusTag>
                ) : (
                  <StatusTag tone="success">Complete</StatusTag>
                )}
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  width={20}
                  className={`text-muted-foreground transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {open && (
              <div className="px-6 pb-6">
                {/* The six stages: set each one's progress and date here. */}
                <ul className="divide-y divide-ld border-t border-ld">
                  {s.stages.map((st, i) => (
                    <li
                      key={st.name}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">{st.name}</div>
                        {st.note && (
                          <p className="text-sm text-muted-foreground mt-0.5">{st.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={st.state}
                          onValueChange={(v) =>
                            updateStage(s.studentId, i, { state: v as StageState })
                          }
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={st.when ?? ''}
                          onChange={(e) =>
                            updateStage(s.studentId, i, { when: e.target.value })
                          }
                          placeholder="Date or note, e.g. 12 Feb 2026"
                          className="h-8 w-44 text-xs"
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Notes and feedback, rendered as the same divided rows as
                    the stages above, so the two read as one list. */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes and feedback
                    </h3>
                    {notes.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                      </span>
                    )}
                  </div>

                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 border-t border-ld">
                      No notes yet. Add the first one below.
                    </p>
                  ) : (
                    <ul className="divide-y divide-ld border-t border-ld">
                      {notes.map((n) => (
                        <li
                          key={n.id}
                          className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground">{n.title}</div>
                            <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">
                              {n.body}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Select
                              value={n.status}
                              onValueChange={(v) =>
                                updateCaseNote(s.studentId, n.id, { status: v as StageState })
                              }
                            >
                              <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={n.date}
                              onChange={(e) =>
                                updateCaseNote(s.studentId, n.id, { date: e.target.value })
                              }
                              placeholder="Date"
                              className="h-8 w-44 text-xs"
                            />
                            <button
                              type="button"
                              aria-label={`Delete note ${n.title}`}
                              onClick={() => deleteCaseNote(s.studentId, n.id)}
                              className="text-muted-foreground hover:text-error transition-colors shrink-0"
                            >
                              <Icon icon="solar:trash-bin-trash-linear" width={18} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <AddNote studentId={s.studentId} onAdd={addCaseNote} />
                </div>
              </div>
            )}
          </CardBox>
        );
      })}

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No students match your search.</p>
      )}
    </>
  );
}

/** The add-a-note form: title, comment, a status and a date, so a note carries
 *  the same progress and date a stage does. Its own state keeps each card's
 *  draft clean. */
function AddNote({
  studentId,
  onAdd,
}: {
  studentId: string;
  onAdd: (
    studentId: string,
    note: { title: string; body: string; status: StageState; date: string }
  ) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<StageState>('todo');
  const [date, setDate] = useState('');

  const canAdd = title.trim() && body.trim();

  function add() {
    if (!canAdd) return;
    onAdd(studentId, {
      title: title.trim(),
      body: body.trim(),
      status,
      date: date.trim(),
    });
    setTitle('');
    setBody('');
    setStatus('todo');
    setDate('');
  }

  return (
    <div className="mt-4 rounded-lg border border-ld p-4">
      <Label>Add a note</Label>
      <Input
        className="mt-1.5"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        className="mt-2"
        rows={3}
        placeholder="What should the file say?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as StageState)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="Date, e.g. 12 Feb 2026"
            className="h-9 w-48 text-sm"
          />
        </div>
        <Button onClick={add} disabled={!canAdd}>
          Add note
        </Button>
      </div>
    </div>
  );
}
