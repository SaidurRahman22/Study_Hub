import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table';
import { Caveat, ScreenHead, StatusTag } from 'src/content/ui';
import { activeStage, openItems } from 'src/content/students';
import {
  useStudents,
  type AdminStudent,
  type NewStudentInput,
} from 'src/content/students-store';
import { useListSearch } from 'src/content/search';

/* Students: the interactive exemplar for the operations screens. A store-backed
 * list (a table on desktop, stacked cards on phones), a create dialog, row
 * actions (change password, delete), and the global top-bar search. All held in
 * memory for now (no backend). The desktop table and the mobile cards render the
 * same rows, so the two stay in step. */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const BLANK: NewStudentInput = {
  name: '',
  email: '',
  studentId: '',
  password: '',
  counsellor: '',
  country: '',
  university: '',
  course: '',
  intake: '',
};

export default function StudentsPage() {
  const { students, addStudent, deleteStudent, setPassword } = useStudents();
  const q = useListSearch('Search students');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewStudentInput>(BLANK);
  const [pwFor, setPwFor] = useState<AdminStudent | null>(null);
  const [newPw, setNewPw] = useState('');
  const [toDelete, setToDelete] = useState<AdminStudent | null>(null);

  const rows = useMemo(
    () =>
      students.filter((s) =>
        [s.name, s.studentId, s.country, s.university, s.counsellor]
          .join(' ')
          .toLowerCase()
          .includes(q)
      ),
    [students, q]
  );

  const set = (k: keyof NewStudentInput) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canCreate =
    form.name.trim() && form.email.trim() && form.studentId.trim() && form.password.trim();

  function create() {
    if (!canCreate) return;
    addStudent(form);
    setForm(BLANK);
    setAddOpen(false);
  }

  const stageTag = (s: AdminStudent) => {
    const stage = activeStage(s);
    return stage ? (
      <StatusTag tone="info">{stage.name}</StatusTag>
    ) : (
      <StatusTag tone="success">Complete</StatusTag>
    );
  };

  const todoTag = (s: AdminStudent) => {
    const todo = openItems(s.documents).length;
    return todo > 0 ? (
      <StatusTag tone="warn">{todo} to do</StatusTag>
    ) : (
      <span className="text-sm text-muted-foreground">None</span>
    );
  };

  const rowActions = (s: AdminStudent) => (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        className="h-8 px-3 text-xs"
        onClick={() => {
          setPwFor(s);
          setNewPw('');
        }}
      >
        Password
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0 text-error"
        aria-label={`Delete ${s.name}`}
        onClick={() => setToDelete(s)}
      >
        <Icon icon="solar:trash-bin-trash-linear" width={16} />
      </Button>
    </div>
  );

  const avatar = (s: AdminStudent) => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lightprimary text-primary text-xs font-semibold">
      {initials(s.name)}
    </span>
  );

  return (
    <>
      <ScreenHead
        title="Students"
        subtitle={`${students.length} student files.`}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Icon icon="solar:add-circle-linear" width={18} className="mr-1.5" />
            Add student
          </Button>
        }
      />

      <Caveat>
        The admin creates the student's account here; the student only logs in from the
        website. This is in-memory sample data. Real files need a private, access-controlled
        store, not the public content repo (see <code>Docs/ADMIN-CONTENT-MAP.md §5</code>).
      </Caveat>

      <CardBox>
        <div className="p-4 sm:p-6">
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Student</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Destination</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Counsellor</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Current stage</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">To do</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Intake</TableHead>
                  <TableHead className="text-sm font-semibold py-3 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        {avatar(s)}
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.studentId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-foreground">{s.country}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {s.university}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 whitespace-nowrap text-foreground/90">
                      {s.counsellor}
                    </TableCell>
                    <TableCell className="py-3">{stageTag(s)}</TableCell>
                    <TableCell className="py-3">{todoTag(s)}</TableCell>
                    <TableCell className="py-3 whitespace-nowrap text-foreground/90">
                      {s.intake}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex justify-end">{rowActions(s)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden flex flex-col gap-3">
            {rows.map((s) => (
              <div key={s.studentId} className="rounded-lg border border-ld p-4">
                <div className="flex items-center gap-3">
                  {avatar(s)}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.studentId}</div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Destination</dt>
                    <dd className="text-foreground">{s.country}</dd>
                    <dd className="text-xs text-muted-foreground">{s.university}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Counsellor</dt>
                    <dd className="text-foreground">{s.counsellor}</dd>
                    <dd className="text-xs text-muted-foreground">Intake: {s.intake}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Current stage</dt>
                    <dd>{stageTag(s)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">To do</dt>
                    <dd>{todoTag(s)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-end">{rowActions(s)}</div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No students match your search.
            </p>
          )}
        </div>
      </CardBox>

      {/* Add student */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>
              Create the account. The student signs in from the website with this email and
              password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 py-2">
            <Field label="Full name" value={form.name} onChange={set('name')} />
            <Field label="Student ID" value={form.studentId} onChange={set('studentId')} />
            <Field label="Email" value={form.email} onChange={set('email')} type="email" />
            <Field label="Password" value={form.password} onChange={set('password')} />
            <Field label="Counsellor" value={form.counsellor} onChange={set('counsellor')} />
            <Field label="Country" value={form.country} onChange={set('country')} />
            <Field label="University" value={form.university} onChange={set('university')} />
            <Field label="Course" value={form.course} onChange={set('course')} />
            <Field label="Intake" value={form.intake} onChange={set('intake')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!canCreate}>
              Create student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password */}
      <Dialog open={!!pwFor} onOpenChange={(o) => !o && setPwFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Set a new sign-in password for {pwFor?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Field label="New password" value={newPw} onChange={setNewPw} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!newPw.trim()}
              onClick={() => {
                if (pwFor) setPassword(pwFor.studentId, newPw.trim());
                setPwFor(null);
              }}
            >
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this student?</DialogTitle>
            <DialogDescription>
              {toDelete?.name} ({toDelete?.studentId}) and their file will be removed. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) deleteStudent(toDelete.studentId);
                setToDelete(null);
              }}
            >
              Delete student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A labelled text input used in the dialogs. */
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
