import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  DocStatus,
  Message,
  StudentRecord,
} from '@/lib/studentData';
import type { Booking, BookingStatus } from './students';
import {
  createAnnouncement,
  createCaseNote,
  createDocument,
  createEnquiry,
  createStudent,
  deleteAnnouncement as apiDeleteAnnouncement,
  deleteDocument as apiDeleteDocument,
  deleteStudent as apiDeleteStudent,
  downloadDocument as apiDownloadDocument,
  getAdminToken,
  patchDocument,
  listAnnouncements,
  listEnquiries,
  listStudents,
  patchCaseNote,
  patchEnquiryStatus,
  patchStage,
  postMessage,
  removeCaseNote,
  setStudentPassword,
  type ApiAnnouncement,
  type ApiEnquiry,
  type ApiStudent,
} from './admin-api';

/* ======================================================================= *
 *  Students + enquiries, backed by the Laravel API.
 *
 *  The method names and arguments are unchanged from the earlier in-memory
 *  version, so every admin screen works without edits. What changed is where
 *  the data lives: students, their stages and case notes, and the enquiry
 *  list all come from MySQL now and survive a reload.
 *
 *  Edits apply locally first so typing stays responsive, then go to the API.
 *  Text fields are debounced, otherwise every keystroke in a date box would
 *  be its own request. If a write fails the error is surfaced and the data is
 *  reloaded from the server, so the screen never quietly disagrees with the
 *  database.
 *
 *  Documents are real files: they are uploaded to the private disk through the
 *  API and downloaded back through it, never from a public URL. Messages and
 *  announcements have no API yet (the next phase), so they stay empty rather
 *  than showing invented data on a real student's record.
 * ======================================================================= */

export type NoteStatus = 'done' | 'now' | 'todo';

export type CaseNote = {
  id: string;
  title: string;
  body: string;
  status: NoteStatus;
  date: string;
  at: string;
};

export type NewNoteInput = {
  title: string;
  body: string;
  status: NoteStatus;
  date: string;
};

/** An announcement as the admin's feed shows it: one row, saying who it went
 *  to, rather than one copy per student who can see it. */
export type AdminAnnouncement = {
  id: string;
  kind: 'document' | 'stage' | 'message' | 'announcement';
  title: string;
  body: string;
  at: string;
  /** "all", or the student's database id as a string */
  audience: string;
  audienceName: string;
};

/** A student as the admin holds it: the portal record plus the database id,
 *  the ids of its stages, and the admin's case notes. */
export type AdminStudent = StudentRecord & {
  apiId: number;
  stageIds: number[];
  password?: string;
  caseNotes?: CaseNote[];
};

export type NewStudentInput = {
  name: string;
  email: string;
  studentId: string;
  password: string;
  counsellor: string;
  country: string;
  university: string;
  course: string;
  intake: string;
};

export type NewBookingInput = {
  name: string;
  phone: string;
  email?: string;
  destination: string;
  need: string;
  message?: string;
  date: string;
  online: boolean;
};

function toAdminStudent(a: ApiStudent): AdminStudent {
  return {
    apiId: a.id,
    stageIds: a.stages.map((s) => s.id),
    studentId: a.studentId || `#${a.id}`,
    name: a.name,
    email: a.email,
    counsellor: a.counsellor ?? '',
    country: a.country ?? '',
    university: a.university ?? '',
    course: a.course ?? '',
    intake: a.intake ?? '',
    stages: a.stages.map((s) => ({
      name: s.name,
      state: s.state,
      when: s.when ?? '',
      note: s.note ?? undefined,
    })),
    caseNotes: a.caseNotes.map((n) => ({
      id: String(n.id),
      title: n.title,
      body: n.body ?? '',
      status: n.status,
      date: n.date ?? '',
      at: n.at ?? new Date().toISOString(),
    })),
    documents: (a.documents ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      group: d.group,
      status: d.status as DocStatus,
      file: d.file ?? undefined,
      size: d.size ?? undefined,
      updated: d.updated ?? undefined,
      note: d.note ?? undefined,
    })),
    messages: (a.messages ?? []).map((m) => ({
      id: m.id,
      from: m.from,
      author: m.author,
      at: m.at ?? new Date().toISOString(),
      body: m.body,
    })),
    // What this student can see in their bell. The admin's own feed comes
    // from the announcements list, so an "all" notice is not counted twice.
    notifications: [],
  };
}

function toAdminAnnouncement(a: ApiAnnouncement): AdminAnnouncement {
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    body: a.body ?? '',
    at: a.at ?? new Date().toISOString(),
    audience: a.audience ?? 'all',
    audienceName: a.audienceName ?? 'Everyone',
  };
}

function toBooking(e: ApiEnquiry): Booking {
  return {
    id: String(e.id),
    name: e.name,
    phone: e.phone ?? '',
    email: e.email || undefined,
    destination: e.destination ?? '',
    need: e.need ?? e.subject ?? '',
    message: e.message ?? undefined,
    at: e.scheduled_at ?? e.created_at,
    status: e.status,
  };
}

type Store = {
  students: AdminStudent[];
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;

  addStudent: (input: NewStudentInput) => void;
  updateStudent: (studentId: string, patch: Partial<StudentRecord>) => void;
  deleteStudent: (studentId: string) => void;
  setPassword: (studentId: string, password: string) => void;

  updateStage: (
    studentId: string,
    index: number,
    patch: Partial<StudentRecord['stages'][number]>
  ) => void;

  setDocStatus: (studentId: string, docId: string, status: DocStatus) => void;
  setDocNote: (studentId: string, docId: string, note: string) => void;
  /** Upload a document for a student. The file is optional: without one the
   *  row reads as the office asking the student for it. */
  uploadDocument: (
    studentId: string,
    meta: { name: string; group: string; status?: string; note?: string },
    file?: File | null
  ) => void;
  removeDocument: (studentId: string, docId: string) => void;
  downloadDocument: (studentId: string, docId: string, filename: string) => void;

  addCaseNote: (studentId: string, note: NewNoteInput) => void;
  updateCaseNote: (
    studentId: string,
    noteId: string,
    patch: Partial<Pick<CaseNote, 'title' | 'body' | 'status' | 'date'>>
  ) => void;
  deleteCaseNote: (studentId: string, noteId: string) => void;

  sendMessage: (studentId: string, body: string) => void;

  /** Every announcement posted, newest first, each row once whoever it went
   *  to. The per-student copies in `notifications` are what a student sees. */
  announcements: AdminAnnouncement[];
  /** `audience` is "all" or a student's studentId. */
  postAnnouncement: (audience: string, title: string, body: string) => void;
  removeAnnouncement: (id: string) => void;

  addBooking: (input: NewBookingInput) => void;
  setBookingStatus: (bookingId: string, status: BookingStatus) => void;

  getStudent: (studentId: string) => AdminStudent | undefined;
};

const Ctx = createContext<Store | null>(null);

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function StudentsProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Pending debounced writes, keyed so repeated typing in one field
   *  collapses into a single request. */
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const reload = useCallback(async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    try {
      const [s, e, a] = await Promise.all([
        listStudents(),
        listEnquiries(),
        listAnnouncements(),
      ]);
      setStudents(s.map(toAdminStudent));
      setBookings(e.map(toBooking));
      setAnnouncements(a.map(toAdminAnnouncement));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* Deliberately NOT loading on mount.
   *
   * This provider has to sit above RequireStaff, because RequireStaff calls
   * useStudents() to refresh after a successful sign-in. That meant a reload
   * here fired GET /students, /enquiries and /announcements on every cold
   * load, before any check had run, carrying whatever token happened to be in
   * localStorage. The server refused them, so nothing ever leaked, but the
   * admin was asking for student records before it knew who was asking, and a
   * signed-out tab sat there calling the API on every refresh.
   *
   * RequireStaff calls reload() itself once it has confirmed a staff account
   * with the server, which is the only moment this data should be fetched. */

  /** Run a write. On failure show why and resync from the server. */
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That change did not save.');
        void reload();
      }
    },
    [reload]
  );

  /** Same as run(), but collapses rapid repeats of the same field. */
  const debounced = useCallback(
    (key: string, fn: () => Promise<unknown>, ms = 600) => {
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => void run(fn), ms);
    },
    [run]
  );

  const find = useCallback(
    (studentId: string) => students.find((s) => s.studentId === studentId),
    [students]
  );

  const patchLocal = useCallback(
    (studentId: string, fn: (s: AdminStudent) => AdminStudent) =>
      setStudents((prev) => prev.map((s) => (s.studentId === studentId ? fn(s) : s))),
    []
  );

  /* ---- students ---- */

  const addStudent = useCallback(
    (input: NewStudentInput) => {
      void run(async () => {
        await createStudent({
          name: input.name,
          email: input.email,
          password: input.password,
          studentId: input.studentId || undefined,
          counsellor: input.counsellor || undefined,
          country: input.country || undefined,
          university: input.university || undefined,
          course: input.course || undefined,
          intake: input.intake || undefined,
        });
        await reload();
      });
    },
    [run, reload]
  );

  const updateStudent = useCallback(
    (studentId: string, patch: Partial<StudentRecord>) =>
      patchLocal(studentId, (s) => ({ ...s, ...patch })),
    [patchLocal]
  );

  const deleteStudent = useCallback(
    (studentId: string) => {
      const target = find(studentId);
      setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
      if (target) void run(() => apiDeleteStudent(target.apiId));
    },
    [find, run]
  );

  const setPassword = useCallback(
    (studentId: string, password: string) => {
      const target = find(studentId);
      if (target) void run(() => setStudentPassword(target.apiId, password));
    },
    [find, run]
  );

  const updateStage = useCallback(
    (
      studentId: string,
      index: number,
      patch: Partial<StudentRecord['stages'][number]>
    ) => {
      patchLocal(studentId, (s) => ({
        ...s,
        stages: s.stages.map((st, i) => (i === index ? { ...st, ...patch } : st)),
      }));
      const target = find(studentId);
      const stageId = target?.stageIds[index];
      if (!target || stageId === undefined) return;

      const body: { state?: string; when?: string; note?: string } = {};
      if (patch.state !== undefined) body.state = patch.state;
      if (patch.when !== undefined) body.when = patch.when;
      if (patch.note !== undefined) body.note = patch.note;

      // A dropdown should save at once; typed text waits for a pause.
      const typed = patch.when !== undefined || patch.note !== undefined;
      const call = () => patchStage(target.apiId, stageId, body);
      if (typed) debounced(`stage:${studentId}:${index}`, call);
      else void run(call);
    },
    [patchLocal, find, run, debounced]
  );

  /* ---- case notes ---- */

  const addCaseNote = useCallback(
    (studentId: string, note: NewNoteInput) => {
      const target = find(studentId);
      if (!target) return;
      void run(async () => {
        const created = await createCaseNote(target.apiId, note);
        patchLocal(studentId, (s) => ({
          ...s,
          caseNotes: [
            {
              id: String(created.id),
              title: created.title,
              body: created.body ?? '',
              status: created.status,
              date: created.date ?? '',
              at: created.at ?? new Date().toISOString(),
            },
            ...(s.caseNotes ?? []),
          ],
        }));
      });
    },
    [find, run, patchLocal]
  );

  const updateCaseNote = useCallback(
    (
      studentId: string,
      noteId: string,
      patch: Partial<Pick<CaseNote, 'title' | 'body' | 'status' | 'date'>>
    ) => {
      patchLocal(studentId, (s) => ({
        ...s,
        caseNotes: (s.caseNotes ?? []).map((n) =>
          n.id === noteId ? { ...n, ...patch } : n
        ),
      }));
      const target = find(studentId);
      if (!target) return;
      const typed = patch.title !== undefined || patch.body !== undefined || patch.date !== undefined;
      const call = () => patchCaseNote(target.apiId, Number(noteId), patch);
      if (typed) debounced(`note:${studentId}:${noteId}`, call);
      else void run(call);
    },
    [patchLocal, find, run, debounced]
  );

  const deleteCaseNote = useCallback(
    (studentId: string, noteId: string) => {
      patchLocal(studentId, (s) => ({
        ...s,
        caseNotes: (s.caseNotes ?? []).filter((n) => n.id !== noteId),
      }));
      const target = find(studentId);
      if (target) void run(() => removeCaseNote(target.apiId, Number(noteId)));
    },
    [patchLocal, find, run]
  );

  /* ---- documents: real files on the private disk ---- */

  const setDocStatus = useCallback(
    (studentId: string, docId: string, status: DocStatus) => {
      patchLocal(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === docId ? { ...d, status } : d)),
      }));
      const target = find(studentId);
      if (target) void run(() => patchDocument(target.apiId, docId, { status }));
    },
    [patchLocal, find, run]
  );

  const setDocNote = useCallback(
    (studentId: string, docId: string, note: string) => {
      patchLocal(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === docId ? { ...d, note } : d)),
      }));
      const target = find(studentId);
      if (target) void run(() => patchDocument(target.apiId, docId, { note }));
    },
    [patchLocal, find, run]
  );

  const uploadDocument = useCallback(
    (
      studentId: string,
      meta: { name: string; group: string; status?: string; note?: string },
      file?: File | null
    ) => {
      const target = find(studentId);
      if (!target) return;
      void run(async () => {
        await createDocument(target.apiId, meta, file);
        await reload();
      });
    },
    [find, run, reload]
  );

  const removeDocument = useCallback(
    (studentId: string, docId: string) => {
      patchLocal(studentId, (s) => ({
        ...s,
        documents: s.documents.filter((d) => d.id !== docId),
      }));
      const target = find(studentId);
      if (target) void run(() => apiDeleteDocument(target.apiId, docId));
    },
    [patchLocal, find, run]
  );

  const downloadDocument = useCallback(
    (studentId: string, docId: string, filename: string) => {
      const target = find(studentId);
      if (target) void run(() => apiDownloadDocument(target.apiId, docId, filename));
    },
    [find, run]
  );

  /* ---- messages and announcements ---- */

  const sendMessage = useCallback(
    (studentId: string, body: string) => {
      const target = find(studentId);
      if (!target) return;

      // Show it at once so the thread does not stall while the request runs.
      // The id is provisional until the reply comes back.
      const pending: Message = {
        id: uid(),
        from: 'agency',
        author: 'Study Hub BD',
        at: new Date().toISOString(),
        body,
      };
      patchLocal(studentId, (s) => ({ ...s, messages: [...s.messages, pending] }));

      void run(async () => {
        const saved = await postMessage(target.apiId, body);
        patchLocal(studentId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === pending.id
              ? { ...m, id: saved.id, author: saved.author, at: saved.at ?? m.at }
              : m
          ),
        }));
      });
    },
    [find, patchLocal, run]
  );

  const postAnnouncement = useCallback(
    (audience: string, title: string, body: string) => {
      // The screens speak in studentIds; the API in database ids.
      const target = audience === 'all' ? null : find(audience);
      if (audience !== 'all' && !target) return;

      void run(async () => {
        await createAnnouncement({
          audience: target ? String(target.apiId) : 'all',
          title,
          body: body || undefined,
        });
        await reload();
      });
    },
    [find, run, reload]
  );

  const removeAnnouncement = useCallback(
    (id: string) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      void run(() => apiDeleteAnnouncement(id));
    },
    [run]
  );

  /* ---- enquiries / bookings ---- */

  const addBooking = useCallback(
    (input: NewBookingInput) => {
      void run(async () => {
        await createEnquiry({
          name: input.name,
          email: input.email || `${input.phone.replace(/\D/g, '')}@no-email.local`,
          phone: input.phone,
          destination: input.destination,
          need: input.need,
          message: input.message,
          source: 'consultation',
          scheduled_at: input.date || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          online: input.online,
        });
        await reload();
      });
    },
    [run, reload]
  );

  const setBookingStatus = useCallback(
    (bookingId: string, status: BookingStatus) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      void run(() => patchEnquiryStatus(Number(bookingId), status));
    },
    [run]
  );

  const getStudent = useCallback((studentId: string) => find(studentId), [find]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<Store>(
    () => ({
      students,
      bookings,
      loading,
      error,
      clearError,
      reload,
      addStudent,
      updateStudent,
      deleteStudent,
      setPassword,
      updateStage,
      setDocStatus,
      setDocNote,
      uploadDocument,
      removeDocument,
      downloadDocument,
      addCaseNote,
      updateCaseNote,
      deleteCaseNote,
      sendMessage,
      announcements,
      postAnnouncement,
      removeAnnouncement,
      addBooking,
      setBookingStatus,
      getStudent,
    }),
    [
      students,
      bookings,
      loading,
      error,
      clearError,
      reload,
      addStudent,
      updateStudent,
      deleteStudent,
      setPassword,
      updateStage,
      setDocStatus,
      setDocNote,
      uploadDocument,
      removeDocument,
      downloadDocument,
      addCaseNote,
      updateCaseNote,
      deleteCaseNote,
      sendMessage,
      announcements,
      postAnnouncement,
      removeAnnouncement,
      addBooking,
      setBookingStatus,
      getStudent,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudents() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudents must be used inside <StudentsProvider>');
  return ctx;
}
