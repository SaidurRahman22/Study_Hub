import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Attachment,
  type Message,
  type Notification,
  type StudentDoc,
  type StudentRecord,
} from "@/lib/studentData";
import { getMyApplication, getToken, login, logout, setToken } from "@/lib/api";

/** Map the API's /my/application payload to the portal's StudentRecord. */
function mapApplication(a: Record<string, unknown>): StudentRecord {
  const stages = Array.isArray(a.stages) ? (a.stages as Record<string, unknown>[]) : [];
  return {
    name: String(a.name ?? ""),
    email: String(a.email ?? ""),
    studentId: String(a.studentId ?? ""),
    counsellor: String(a.counsellor ?? ""),
    country: String(a.country ?? ""),
    university: String(a.university ?? ""),
    course: String(a.course ?? ""),
    intake: String(a.intake ?? ""),
    stages: stages.map((s) => ({
      name: String(s.name ?? ""),
      state: (s.state as StudentRecord["stages"][number]["state"]) ?? "todo",
      when: String(s.when ?? ""),
      note: s.note ? String(s.note) : undefined,
    })),
    documents: (Array.isArray(a.documents) ? a.documents : []) as StudentDoc[],
    messages: (Array.isArray(a.messages) ? a.messages : []) as Message[],
    notifications: (Array.isArray(a.notifications) ? a.notifications : []) as Notification[],
  };
}

/* ====================================================================== *
 *  STUDENT SESSION: DEMONSTRATION ONLY                                   *
 *                                                                        *
 *  Read this before wiring anything real to it.                           *
 *                                                                        *
 *  The sign-in below compares a password IN THE BROWSER. That protects    *
 *  nothing at all: the credential is in the JavaScript bundle, which      *
 *  anyone can read, and the "session" is a flag in localStorage that any  *
 *  visitor can set by hand. It exists so the screens can be walked        *
 *  through, and for no other purpose.                                     *
 *                                                                        *
 *  A real version needs, at minimum:                                      *
 *   - accounts and password hashing on a server (Argon2id or bcrypt),     *
 *     with the comparison never reaching the client;                      *
 *   - sessions in an HttpOnly, Secure, SameSite cookie, not localStorage, *
 *     which any injected script can read;                                 *
 *   - rate limiting on sign-in, and a real password reset;                *
 *   - per-student authorisation on every read, so student A cannot        *
 *     fetch student B's file by changing an id;                           *
 *   - documents in private object storage behind short-lived signed URLs. *
 *                                                                        *
 *  None of that can be done by this repository's current architecture:    *
 *  the site is a static bundle whose datastore is a JSON file in a        *
 *  PUBLIC GitHub repo. Student documents must never go there.             *
 * ====================================================================== */

/** The one demo account. Deliberately obvious, and shown on the sign-in
 *  screen so nobody mistakes the portal for a live service. */
const DEMO_EMAIL = "student@demo.studyhubbd.com";
const DEMO_PASSWORD = "password";

const READ_KEY = "shb_student_demo_last_read";
const NOTES_KEY = "shb_student_demo_notes_read";

/** localStorage throws in a private window and in some embedded views, and
 *  comes back empty after a clear. Every access is guarded and every
 *  failure is survivable: the portal simply signs the reader out. */
function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* a session that cannot be remembered still works for this visit */
  }
}

type SignInResult = { ok: true } | { ok: false; error: string };

type StudentContextValue = {
  student: StudentRecord | null;
  signedIn: boolean;
  /** true until the stored session has been looked at, so the portal does
   *  not flash the sign-in screen at a reader who is already signed in */
  restoring: boolean;
  lastRead: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => void;
  /** Records the NAME of a chosen file. The file itself is never read,
   *  never stored and never uploaded. There is nowhere to put it. */
  attachDocument: (docId: string, fileName: string, sizeBytes: number) => void;
  sendMessage: (body: string, attachments?: Attachment[]) => void;
  markMessagesRead: () => void;
  /** when the bell was last opened */
  notesLastRead: string | null;
  markNotificationsRead: () => void;
};

const StudentContext = createContext<StudentContextValue | null>(null);

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [notesLastRead, setNotesLastRead] = useState<string | null>(null);

  /* Restore a session from the stored token: ask the API who it belongs to.
   * A dead or missing token just lands on the sign-in screen. */
  useEffect(() => {
    if (!getToken()) {
      setRestoring(false);
      return;
    }
    getMyApplication()
      .then((app) => {
        setStudent(mapApplication(app as Record<string, unknown>));
        setLastRead(readStore(READ_KEY));
        setNotesLastRead(readStore(NOTES_KEY));
      })
      .catch(() => setToken(null))
      .finally(() => setRestoring(false));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        await login(email.trim(), password);
        const app = await getMyApplication();
        setStudent(mapApplication(app as Record<string, unknown>));
        setLastRead(readStore(READ_KEY));
        setNotesLastRead(readStore(NOTES_KEY));
        return { ok: true };
      } catch (e) {
        setToken(null);
        return {
          ok: false,
          error:
            e instanceof Error
              ? e.message
              : "That email and password do not match an account.",
        };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    void logout();
    setStudent(null);
  }, []);

  const attachDocument = useCallback(
    (docId: string, fileName: string, sizeBytes: number) => {
      setStudent(prev => {
        if (!prev) return prev;
        const documents: StudentDoc[] = prev.documents.map(d =>
          d.id === docId
            ? {
                ...d,
                status: "review",
                file: fileName,
                size: formatSize(sizeBytes),
                updated: new Date().toISOString().slice(0, 10),
                note: "Just sent. The office will check it and come back to you.",
              }
            : d
        );
        const doc = prev.documents.find(d => d.id === docId);
        const note: Notification = {
          id: `n-${docId}-${Date.now()}`,
          kind: "document",
          title: `${doc?.name ?? "Document"} sent to the office`,
          body: "We will check it and come back to you.",
          at: new Date().toISOString(),
          href: "/student/documents",
        };
        return {
          ...prev,
          documents,
          notifications: [note, ...prev.notifications],
        };
      });
    },
    []
  );

  const sendMessage = useCallback(
    (body: string, attachments: Attachment[] = []) => {
      const text = body.trim();
      if (!text && attachments.length === 0) return;
      setStudent(prev => {
        if (!prev) return prev;
        const message: Message = {
          id: `m${prev.messages.length + 1}-${Date.now()}`,
          from: "student",
          author: prev.name,
          at: new Date().toISOString(),
          body: text,
          attachments: attachments.length ? attachments : undefined,
        };
        return { ...prev, messages: [...prev.messages, message] };
      });
    },
    []
  );

  const markMessagesRead = useCallback(() => {
    const now = new Date().toISOString();
    writeStore(READ_KEY, now);
    setLastRead(now);
  }, []);

  const markNotificationsRead = useCallback(() => {
    const now = new Date().toISOString();
    writeStore(NOTES_KEY, now);
    setNotesLastRead(now);
  }, []);

  const value = useMemo(
    () => ({
      student,
      signedIn: student !== null,
      restoring,
      lastRead,
      signIn,
      signOut,
      attachDocument,
      sendMessage,
      markMessagesRead,
      notesLastRead,
      markNotificationsRead,
    }),
    [
      student,
      restoring,
      lastRead,
      signIn,
      signOut,
      attachDocument,
      sendMessage,
      markMessagesRead,
      notesLastRead,
      markNotificationsRead,
    ]
  );

  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used inside <StudentProvider>");
  return ctx;
}

export { DEMO_EMAIL, DEMO_PASSWORD };
