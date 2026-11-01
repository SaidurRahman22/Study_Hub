import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
import { STUDENTS, BOOKINGS, type Booking, type BookingStatus } from './students';

/* ======================================================================= *
 *  Mutable students + bookings store (frontend phase)
 *
 *  The portal has no backend, so this holds everything in memory, seeded
 *  from the fixtures. Edits (new students, status changes, feedback, uploads,
 *  announcements, bookings) work and show immediately, but reset on reload.
 *  The real version is a database and a private file store (ADMIN-CONTENT-MAP
 *  §5); these methods are the shape that backend will implement.
 * ======================================================================= */

/** A note the admin adds to a student's file: a title, a comment, a progress
 *  status the admin sets, and a date the admin sets. `at` is the automatic
 *  created-at used only for ordering. */
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

/** A student as the admin holds it: the portal record plus a login password
 *  and the admin's own case notes. */
export type AdminStudent = StudentRecord & {
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
  /** ISO date (date picker value) */
  date: string;
  online: boolean;
};

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const nowIso = () => new Date().toISOString();

/** The six empty stages a new student starts with. */
function freshStages(): StudentRecord['stages'] {
  return [
    { name: 'Counselling', state: 'now', when: 'Just started' },
    { name: 'Documents', state: 'todo', when: '' },
    { name: 'Application sent', state: 'todo', when: '' },
    { name: 'Offer received', state: 'todo', when: '' },
    { name: 'Visa file', state: 'todo', when: '' },
    { name: 'Departure', state: 'todo', when: '' },
  ];
}

type Store = {
  students: AdminStudent[];
  bookings: Booking[];

  addStudent: (input: NewStudentInput) => void;
  updateStudent: (studentId: string, patch: Partial<StudentRecord>) => void;
  deleteStudent: (studentId: string) => void;
  setPassword: (studentId: string, password: string) => void;

  /** Set a stage's progress: its state, date and note. */
  updateStage: (
    studentId: string,
    index: number,
    patch: Partial<StudentRecord['stages'][number]>
  ) => void;

  setDocStatus: (studentId: string, docId: string, status: DocStatus) => void;
  setDocNote: (studentId: string, docId: string, note: string) => void;
  /** Admin uploads a document on the student's behalf. */
  addDocument: (studentId: string, doc: Omit<StudentDoc, 'id'>) => void;

  addCaseNote: (studentId: string, note: NewNoteInput) => void;
  updateCaseNote: (
    studentId: string,
    noteId: string,
    patch: Partial<Pick<CaseNote, 'title' | 'body' | 'status' | 'date'>>
  ) => void;
  deleteCaseNote: (studentId: string, noteId: string) => void;

  sendMessage: (studentId: string, body: string) => void;

  /** audience is a studentId, or "all" for everyone. */
  postAnnouncement: (audience: string, title: string, body: string) => void;

  addBooking: (input: NewBookingInput) => void;
  setBookingStatus: (bookingId: string, status: BookingStatus) => void;

  getStudent: (studentId: string) => AdminStudent | undefined;
};

const Ctx = createContext<Store | null>(null);

export function StudentsProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<AdminStudent[]>(
    () => structuredClone(STUDENTS) as AdminStudent[]
  );
  const [bookings, setBookings] = useState<Booking[]>(
    () => structuredClone(BOOKINGS) as Booking[]
  );

  const patchStudent = useCallback(
    (studentId: string, fn: (s: AdminStudent) => AdminStudent) => {
      setStudents((prev) => prev.map((s) => (s.studentId === studentId ? fn(s) : s)));
    },
    []
  );

  const addStudent = useCallback((input: NewStudentInput) => {
    const s: AdminStudent = {
      name: input.name,
      email: input.email,
      studentId: input.studentId,
      password: input.password,
      counsellor: input.counsellor,
      country: input.country,
      university: input.university,
      course: input.course,
      intake: input.intake,
      stages: freshStages(),
      documents: [],
      messages: [],
      notifications: [
        {
          id: uid(),
          kind: 'announcement',
          title: 'Welcome to Study Hub BD',
          body: `Your counsellor is ${input.counsellor}.`,
          at: nowIso(),
        },
      ],
      caseNotes: [],
    };
    setStudents((prev) => [s, ...prev]);
  }, []);

  const updateStudent = useCallback(
    (studentId: string, patch: Partial<StudentRecord>) =>
      patchStudent(studentId, (s) => ({ ...s, ...patch })),
    [patchStudent]
  );

  const deleteStudent = useCallback((studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
  }, []);

  const setPassword = useCallback(
    (studentId: string, password: string) =>
      patchStudent(studentId, (s) => ({ ...s, password })),
    [patchStudent]
  );

  const updateStage = useCallback(
    (
      studentId: string,
      index: number,
      patch: Partial<StudentRecord['stages'][number]>
    ) =>
      patchStudent(studentId, (s) => ({
        ...s,
        stages: s.stages.map((st, i) => (i === index ? { ...st, ...patch } : st)),
      })),
    [patchStudent]
  );

  const setDocStatus = useCallback(
    (studentId: string, docId: string, status: DocStatus) =>
      patchStudent(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === docId ? { ...d, status, updated: nowIso().slice(0, 10) } : d
        ),
      })),
    [patchStudent]
  );

  const setDocNote = useCallback(
    (studentId: string, docId: string, note: string) =>
      patchStudent(studentId, (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === docId ? { ...d, note } : d)),
      })),
    [patchStudent]
  );

  const addDocument = useCallback(
    (studentId: string, doc: Omit<StudentDoc, 'id'>) =>
      patchStudent(studentId, (s) => ({
        ...s,
        documents: [...s.documents, { ...doc, id: uid() }],
      })),
    [patchStudent]
  );

  const addCaseNote = useCallback(
    (studentId: string, note: NewNoteInput) =>
      patchStudent(studentId, (s) => ({
        ...s,
        caseNotes: [
          {
            id: uid(),
            title: note.title,
            body: note.body,
            status: note.status,
            date: note.date,
            at: nowIso(),
          },
          ...(s.caseNotes ?? []),
        ],
      })),
    [patchStudent]
  );

  const updateCaseNote = useCallback(
    (
      studentId: string,
      noteId: string,
      patch: Partial<Pick<CaseNote, 'title' | 'body' | 'status' | 'date'>>
    ) =>
      patchStudent(studentId, (s) => ({
        ...s,
        caseNotes: (s.caseNotes ?? []).map((n) =>
          n.id === noteId ? { ...n, ...patch } : n
        ),
      })),
    [patchStudent]
  );

  const deleteCaseNote = useCallback(
    (studentId: string, noteId: string) =>
      patchStudent(studentId, (s) => ({
        ...s,
        caseNotes: (s.caseNotes ?? []).filter((n) => n.id !== noteId),
      })),
    [patchStudent]
  );

  const sendMessage = useCallback(
    (studentId: string, body: string) =>
      patchStudent(studentId, (s) => {
        const msg: Message = {
          id: uid(),
          from: 'agency',
          author: 'Study Hub BD',
          at: nowIso(),
          body,
        };
        return { ...s, messages: [...s.messages, msg] };
      }),
    [patchStudent]
  );

  const postAnnouncement = useCallback(
    (audience: string, title: string, body: string) => {
      const note = (): Notification => ({
        id: uid(),
        kind: 'announcement',
        title,
        body: body || undefined,
        at: nowIso(),
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

  const addBooking = useCallback((input: NewBookingInput) => {
    const b: Booking = {
      id: uid(),
      name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      destination: input.destination,
      need: input.need,
      message: input.message || undefined,
      at: input.date ? new Date(input.date).toISOString() : nowIso(),
      status: 'new',
    };
    setBookings((prev) => [b, ...prev]);
  }, []);

  const setBookingStatus = useCallback((bookingId: string, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
  }, []);

  const getStudent = useCallback(
    (studentId: string) => students.find((s) => s.studentId === studentId),
    [students]
  );

  const value = useMemo<Store>(
    () => ({
      students,
      bookings,
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
