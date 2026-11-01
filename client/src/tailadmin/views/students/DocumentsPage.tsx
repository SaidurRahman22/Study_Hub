import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Textarea } from 'src/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table';
import { Caveat, ScreenHead } from 'src/content/ui';
import { DOC_STATUS } from 'src/content/students';
import { useStudents, type AdminStudent } from 'src/content/students-store';
import { useListSearch } from 'src/content/search';
import type { DocStatus, StudentDoc } from '@/lib/studentData';

/* Documents, the review screen. The admin sets each document's status, writes
 * feedback, and uploads files on a student's behalf (students send files by
 * WhatsApp, email or in person; the student only sees the status and the
 * download once the admin has acted). Store-backed, in-memory for now. */

/** The five statuses, in the order the office reads them. */
const STATUS_OPTIONS: DocStatus[] = ['accepted', 'review', 'needed', 'rejected', 'later'];

/** What each file group is called on screen. */
const GROUP_LABEL: Record<StudentDoc['group'], string> = {
  application: 'University file',
  visa: 'Visa file',
};

type UploadForm = {
  studentId: string;
  name: string;
  group: StudentDoc['group'];
  status: DocStatus;
  fileName: string;
};

const BLANK_UPLOAD: UploadForm = {
  studentId: '',
  name: '',
  group: 'application',
  status: 'review',
  fileName: '',
};

type DocRow = { student: AdminStudent; doc: StudentDoc };

export default function DocumentsPage() {
  const { students, setDocStatus, setDocNote, addDocument } = useStudents();
  const q = useListSearch('Search documents');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState<UploadForm>(BLANK_UPLOAD);

  const [noteFor, setNoteFor] = useState<DocRow | null>(null);
  const [noteText, setNoteText] = useState('');

  const rows = useMemo<DocRow[]>(() => {
    const all = students.flatMap((student) =>
      student.documents.map((doc) => ({ student, doc }))
    );
    if (!q) return all;
    return all.filter(({ student, doc }) =>
      `${student.name} ${doc.name}`.toLowerCase().includes(q)
    );
  }, [students, q]);

  const setUp = (k: keyof UploadForm) => (v: string) =>
    setUpload((f) => ({ ...f, [k]: v }));

  const canUpload = upload.studentId.trim() && upload.name.trim();

  function openUpload() {
    setUpload(BLANK_UPLOAD);
    setUploadOpen(true);
  }

  function doUpload() {
    if (!canUpload) return;
    addDocument(upload.studentId, {
      name: upload.name.trim(),
      group: upload.group,
      status: upload.status,
      file: upload.fileName.trim() || undefined,
      updated: new Date().toISOString().slice(0, 10),
    });
    setUpload(BLANK_UPLOAD);
    setUploadOpen(false);
  }

  function openNote(row: DocRow) {
    setNoteFor(row);
    setNoteText(row.doc.note ?? '');
  }

  function saveNote() {
    if (noteFor) setDocNote(noteFor.student.studentId, noteFor.doc.id, noteText.trim());
    setNoteFor(null);
  }

  return (
    <>
      <ScreenHead
        title="Documents"
        subtitle="Set each document's status, leave feedback, and upload files for a student."
        action={
          <Button onClick={openUpload}>
            <Icon icon="solar:upload-linear" width={18} className="mr-1.5" />
            Upload document
          </Button>
        }
      />

      <Caveat>
        Documents like passport scans and bank statements must live in private, access-controlled
        storage, never the public repo. Nothing is really stored here yet; actually holding files
        is a backend job (see <code>Docs/ADMIN-CONTENT-MAP.md §5</code>).
      </Caveat>

      <CardBox>
        <div className="p-4 sm:p-6">
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Student</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Document</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">File</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Feedback</TableHead>
                  <TableHead className="text-sm font-semibold py-3 text-end whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ student, doc }) => (
                  <TableRow key={`${student.studentId}-${doc.id}`}>
                    <TableCell className="py-3">
                      <div className="font-medium text-foreground">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.studentId}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-foreground">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">{GROUP_LABEL[doc.group]}</div>
                    </TableCell>
                    <TableCell className="py-3 whitespace-nowrap text-foreground/90">
                      {doc.file ?? 'Not uploaded'}
                    </TableCell>
                    <TableCell className="py-3">
                      <Select
                        value={doc.status}
                        onValueChange={(v) => setDocStatus(student.studentId, doc.id, v as DocStatus)}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {DOC_STATUS[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`block max-w-[200px] lg:max-w-[260px] truncate text-sm ${
                          doc.note ? 'text-muted-foreground' : 'text-muted-foreground/60'
                        }`}
                      >
                        {doc.note || 'No feedback yet'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-end">
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => openNote({ student, doc })}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden flex flex-col gap-3">
            {rows.map(({ student, doc }) => (
              <div
                key={`${student.studentId}-${doc.id}`}
                className="rounded-lg border border-ld p-4"
              >
                <div className="font-medium text-foreground">{doc.name}</div>
                <div className="text-xs text-muted-foreground">{GROUP_LABEL[doc.group]}</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Student</dt>
                    <dd className="text-foreground">{student.name}</dd>
                    <dd className="text-xs text-muted-foreground">{student.studentId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">File</dt>
                    <dd className="text-foreground break-words">{doc.file ?? 'Not uploaded'}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <Select
                    value={doc.status}
                    onValueChange={(v) => setDocStatus(student.studentId, doc.id, v as DocStatus)}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DOC_STATUS[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Feedback</div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`flex-1 min-w-0 truncate text-sm ${
                        doc.note ? 'text-muted-foreground' : 'text-muted-foreground/60'
                      }`}
                    >
                      {doc.note || 'No feedback yet'}
                    </span>
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs shrink-0"
                      onClick={() => openNote({ student, doc })}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents match your search.
            </p>
          )}
        </div>
      </CardBox>

      {/* Upload a document on the student's behalf */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload a document</DialogTitle>
            <DialogDescription>
              Add a document to a student's file. The student sees the status and the download once
              you have acted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Student</Label>
              <Select value={upload.studentId} onValueChange={setUp('studentId')}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      {s.name} ({s.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Document name</Label>
                <Input
                  className="mt-1.5"
                  value={upload.name}
                  onChange={(e) => setUp('name')(e.target.value)}
                  placeholder="e.g. Bank statement, 28 days"
                />
              </div>
              <div>
                <Label>File name</Label>
                <Input
                  className="mt-1.5"
                  value={upload.fileName}
                  onChange={(e) => setUp('fileName')(e.target.value)}
                  placeholder="e.g. bank-statement.pdf"
                />
              </div>
              <div>
                <Label>File group</Label>
                <Select
                  value={upload.group}
                  onValueChange={(v) => setUp('group')(v as StudentDoc['group'])}
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application">University file</SelectItem>
                    <SelectItem value="visa">Visa file</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={upload.status} onValueChange={(v) => setUp('status')(v as DocStatus)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {DOC_STATUS[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              There is no real storage here, so this captures a file name only. Actually uploading
              and holding the file is a backend job.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doUpload} disabled={!canUpload}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit feedback */}
      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback</DialogTitle>
            <DialogDescription>
              {noteFor ? `${noteFor.doc.name} for ${noteFor.student.name}.` : ''} Say what is wrong
              or what is wanted. The student reads this against the document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Note</Label>
            <Textarea
              className="mt-1.5 min-h-28"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. The background is cream. UKVI needs plain light grey or white."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote}>Save feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
