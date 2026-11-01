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
  SAMPLE_STUDENT,
  type Message,
  type Notification,
  type StudentDoc,
  type StudentRecord,
} from "@/lib/studentData";

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
const DEMO_PASSWORD = "demo1234";

const SESSION_KEY = "shb_student_demo_session";
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
  signIn: (email: string, password: string) => SignInResult;
  signOut: () => void;
  /** Records the NAME of a chosen file. The file itself is never read,
   *  never stored and never uploaded. There is nowhere to put it. */
  attachDocument: (docId: string, fileName: string, sizeBytes: number) => void;
  sendMessage: (body: string) => void;
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

  useEffect(() => {
    if (readStore(SESSION_KEY) === DEMO_EMAIL) {
      setStudent(SAMPLE_STUDENT);
      setLastRead(readStore(READ_KEY));
      setNotesLastRead(readStore(NOTES_KEY));
    }
    setRestoring(false);
  }, []);

  const signIn = useCallback(
    (email: string, password: string): SignInResult => {
      const given = email.trim().toLowerCase();
      if (given !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        // One message for both cases, so the form does not say which half
        // was wrong, the habit a real sign-in needs.
        return {
          ok: false,
          error: "That email and password do not match an account.",
        };
      }
      writeStore(SESSION_KEY, DEMO_EMAIL);
      setStudent(SAMPLE_STUDENT);
      setLastRead(readStore(READ_KEY));
      setNotesLastRead(readStore(NOTES_KEY));
      return { ok: true };
    },
    []
  );

  const signOut = useCallback(() => {
    writeStore(SESSION_KEY, null);
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

  const sendMessage = useCallback((body: string) => {
    const text = body.trim();
    if (!text) return;
    setStudent(prev => {
      if (!prev) return prev;
      const message: Message = {
        id: `m${prev.messages.length + 1}-${Date.now()}`,
        from: "student",
        author: prev.name,
        at: new Date().toISOString(),
        body: text,
      };
      return { ...prev, messages: [...prev.messages, message] };
    });
  }, []);

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
