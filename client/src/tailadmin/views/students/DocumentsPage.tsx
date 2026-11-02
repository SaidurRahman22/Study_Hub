import { useMemo, useRef, useState } from 'react';
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
 * download once the admin has acted).
 *
 * Files are real: they go to the API's private disk and come back through an
 * authorised download, never a public URL. */

/** The five statuses, in the order the office reads them. */
const STATUS_OPTIONS: DocStatus[] = ['accepted', 'review', 'needed', 'rejected', 'later'];

/** What each file group is called on screen. */
const GROUP_LABEL: Record<StudentDoc['group'], string> = {
  application: 'University file',
  visa: 'Visa file',
};

/** What the API will take. Anything else is refused server-side too. */
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const MAX_MB = 10;

/** Matches how the API words a size, so the chosen file and the saved row
 *  read the same. A small file says bytes rather than "0 KB". */
function readableSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

type UploadForm = {
  studentId: string;
  name: string;
  group: StudentDoc['group'];
  status: DocStatus;
};

const BLANK_UPLOAD: UploadForm = {
  studentId: '',
  name: '',
  group: 'application',
  status: 'needed',
};

type DocRow = { student: AdminStudent; doc: StudentDoc };

export default function DocumentsPage() {
  const {
    students,
    setDocStatus,
    setDocNote,
    uploadDocument,
    removeDocument,
    downloadDocument,
  } = useStudents();
  const q = useListSearch('Search documents');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState<UploadForm>(BLANK_UPLOAD);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

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
    clearFile();
    setUploadOpen(true);
  }

  function clearFile() {
    setFile(null);
    setFileError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  /** With a file the row is something to check; without one it is something
   *  the office is asking the student for. Changing the file sets the status
   *  to match; the admin can still override it afterwards. */
  function statusForFile(picked: File | null) {
    setUpload((f) => ({ ...f, status: picked ? 'review' : 'needed' }));
  }

  /** Catch an oversized file here so the office is told at once, rather than
   *  after the upload has crawled to the server and been refused. */
  function chooseFile(picked: File | null) {
    if (!picked) {
      clearFile();
      statusForFile(null);
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setFileError(`That file is ${(picked.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setFileError('');
    setFile(picked);
    // A document with no name yet takes the file's own, so the common case
    // needs no typing.
    setUpload((f) => ({
      ...f,
      status: 'review',
      name: f.name.trim() ? f.name : picked.name.replace(/\.[^.]+$/, ''),
    }));
  }

  function doUpload() {
    if (!canUpload) return;
    uploadDocument(
      upload.studentId,
      { name: upload.name.trim(), group: upload.group, status: upload.status },
      file
    );
    setUpload(BLANK_UPLOAD);
    clearFile();
    setUploadOpen(false);
  }

  function doDelete(row: DocRow) {
    const ok = window.confirm(
      `Delete "${row.doc.name}" from ${row.student.name}'s file? The uploaded file goes with it.`
    );
    if (ok) removeDocument(row.student.studentId, row.doc.id);
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
        Passport scans and bank statements are held on the server's private disk under generated
        names, and are only released through a download that checks who is asking. They are never
        on a public URL and never in the repo. PDF, JPG, PNG or WebP, up to {MAX_MB} MB.
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
                    <TableCell className="py-3">
                      {doc.file ? (
                        <>
                          <div className="max-w-[180px] truncate text-foreground/90" title={doc.file}>
                            {doc.file}
                          </div>
                          <div className="text-xs text-muted-foreground">{doc.size}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground/70">Not uploaded</span>
                      )}
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
                    <TableCell className="py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => openNote({ student, doc })}
                        >
                          Edit
                        </Button>
                        {/* The two icon actions are quiet by default. A column
                            of ten outlined red bins shouts louder than the
                            work on this screen, which is reading and
                            answering, not deleting. */}
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          disabled={!doc.file}
                          title={doc.file ? `Download ${doc.file}` : 'No file to download'}
                          aria-label={`Download ${doc.name}`}
                          onClick={() =>
                            downloadDocument(student.studentId, doc.id, doc.file ?? doc.name)
                          }
                        >
                          <Icon icon="solar:download-minimalistic-linear" width={17} />
                        </Button>
                        <Button
                          variant="ghosterror"
                          className="h-8 w-8 p-0"
                          title="Delete document"
                          aria-label={`Delete ${doc.name}`}
                          onClick={() => doDelete({ student, doc })}
                        >
                          <Icon icon="solar:trash-bin-minimalistic-linear" width={17} />
                        </Button>
                      </div>
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
                    <dd className="text-foreground break-words">
                      {doc.file ?? <span className="text-muted-foreground/70">Not uploaded</span>}
                    </dd>
                    {doc.size && <dd className="text-xs text-muted-foreground">{doc.size}</dd>}
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
                {/* With no file there is nothing to download, so the button is
                    left out rather than shown dead. */}
                <div className="mt-3 flex justify-end gap-2">
                  {doc.file && (
                    <Button
                      variant="outline"
                      className="h-11 flex-1 text-xs"
                      onClick={() =>
                        downloadDocument(student.studentId, doc.id, doc.file ?? doc.name)
                      }
                    >
                      <Icon
                        icon="solar:download-minimalistic-linear"
                        width={16}
                        className="mr-1.5"
                      />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="ghosterror"
                    className="h-11 w-11 p-0 shrink-0"
                    aria-label={`Delete ${doc.name}`}
                    onClick={() => doDelete({ student, doc })}
                  >
                    <Icon icon="solar:trash-bin-minimalistic-linear" width={18} />
                  </Button>
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

            <div>
              <Label htmlFor="doc-file">File</Label>
              <input
                id="doc-file"
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full cursor-pointer rounded-lg border border-ld bg-transparent text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-muted file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
              />
              {fileError ? (
                <p className="mt-1.5 text-xs text-destructive">{fileError}</p>
              ) : file ? (
                <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {file.name} ({readableSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="shrink-0 underline hover:text-foreground"
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PDF, JPG, PNG or WebP, up to {MAX_MB} MB. Leave it empty to ask the student for
                  this document instead.
                </p>
              )}
            </div>
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
