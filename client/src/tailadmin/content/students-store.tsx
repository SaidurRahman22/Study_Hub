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
  Notification,
  StudentDoc,
  StudentRecord,
} from '@/lib/studentData';
import type { Booking, BookingStatus } from './students';
import {
  createCaseNote,
  createEnquiry,
  createStudent,
  deleteStudent as apiDeleteStudent,
  getAdminToken,
  listEnquiries,
  listStudents,
  patchCaseNote,
  patchEnquiryStatus,
  patchStage,
  removeCaseNote,
  setStudentPassword,
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
 *  Documents, messages and announcements have no API yet (those are the next
 *  phases), so they stay empty rather than showing invented data on a real
 *  student's record.
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
    documents: [],
    messages: [],
    notifications: [],
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
  addDocument: (studentId: string, doc: Omit<StudentDoc, 'id'>) => void;

  addCaseNote: (studentId: string, note: NewNoteInput) => void;
  updateCaseNote: (
    studentId: string,
    noteId: string,
    patch: Partial<Pick<CaseNote, 'title' | 'body' | 'status' | 'date'>>
  ) => void;
  deleteCaseNote: (studentId: string, noteId: string) => void;

  sendMessage: (studentId: string, body: string) => void;
  postAnnouncement: (audience: string, title: string, body: string) => void;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Pending debounced writes, keyed so repeated typing in one field
   *  collapses into a single request. */
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const reload = useCallback(async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([listStudents(), listEnquiries()]);
      setStudents(s.map(toAdminStudent));
      setBookings(e.map(toBooking));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  /* ---- documents, messages, announcements: local only until their APIs
         exist (the next phases). Kept so the screens still work. ---- */

  const setDocStatus = useCallback(
    (studentId: string, docId: string, status: DocStatus) =>
      patchLocal(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === docId ? { ...d, status } : d)),
      })),
    [patchLocal]
  );

  const setDocNote = useCallback(
    (studentId: string, docId: string, note: string) =>
      patchLocal(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === docId ? { ...d, note } : d)),
      })),
    [patchLocal]
  );

  const addDocument = useCallback(
    (studentId: string, doc: Omit<StudentDoc, 'id'>) =>
      patchLocal(studentId, (s) => ({
        ...s,
        documents: [...s.documents, { ...doc, id: uid() }],
      })),
    [patchLocal]
  );

  const sendMessage = useCallback(
    (studentId: string, body: string) =>
      patchLocal(studentId, (s) => {
        const msg: Message = {
          id: uid(),
          from: 'agency',
          author: 'Study Hub BD',
          at: new Date().toISOString(),
          body,
        };
        return { ...s, messages: [...s.messages, msg] };
      }),
    [patchLocal]
  );

  const postAnnouncement = useCallback(
    (audience: string, title: string, body: string) => {
      const note = (): Notification => ({
        id: uid(),
        kind: 'announcement',
        title,
        body: body || undefined,
        at: new Date().toISOString(),
      });
      setStudents((prev) =>
        prev.map((s) =>
          audience === 'all' || s.studentId === audience
            ? { ...s, notifications: [note(), ...s.notifications] }
            : s
        )
      );
    },
    []
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
      addDocument,
      addCaseNote,
      updateCaseNote,
      deleteCaseNote,
      sendMessage,
      postAnnouncement,
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
      addDocument,
      addCaseNote,
      updateCaseNote,
      deleteCaseNote,
      sendMessage,
      postAnnouncement,
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
