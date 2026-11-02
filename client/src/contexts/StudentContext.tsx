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
  type Message,
  type Notification,
  type StudentDoc,
  type StudentRecord,
} from "@/lib/studentData";
import {
  downloadMyDocument,
  getMyApplication,
  getToken,
  login,
  logout,
  postMyMessage,
  setToken,
  uploadMyDocument,
} from "@/lib/api";

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
 *  STUDENT SESSION                                                       *
 *                                                                        *
 *  The sign-in is real. The password is checked on the server against a  *
 *  bcrypt hash and never reaches the browser; what comes back is a       *
 *  Sanctum token. Every read is scoped to the signed-in student, so      *
 *  student A cannot fetch student B's file by changing an id, and        *
 *  documents live on the server's private disk and are only released     *
 *  through a download route that checks who is asking.                   *
 *                                                                        *
 *  What is still owed before this carries real students:                  *
 *   - the token is in localStorage, which any injected script can read.  *
 *     An HttpOnly, Secure, SameSite cookie is the safer home for it;     *
 *   - rate limiting on sign-in, and a real password reset;                *
 *   - the API must be served over HTTPS from the same site, not over     *
 *     plain HTTP as it is in local development.                           *
 *                                                                        *
 *  Student documents must never go into the GitHub repo. They are on the *
 *  server's private disk, outside the web root, and nothing in the build *
 *  copies them.                                                           *
 * ====================================================================== */

/** The seeded development account, shown on the sign-in screen while the
 *  site has no real students. Remove the hint before launch. */
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
  /** Send a real file in for a document the office asked for. It goes to the
   *  server's private disk; the promise rejects with a readable message if the
   *  server refuses it (wrong type, too large, not your document). */
  attachDocument: (docId: string, file: File) => Promise<void>;
  /** Fetch one of your own documents back through the authorised route. */
  downloadDocument: (docId: string, fileName: string) => Promise<void>;
  /** Write to the office. Text only: files belong on the documents screen,
   *  where they get a status and are kept properly. */
  sendMessage: (body: string) => Promise<void>;
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

  const attachDocument = useCallback(async (docId: string, file: File) => {
    // The server has the last word on type and size; it answers with the row
    // as it now stands, which is what the screen then shows.
    const saved = (await uploadMyDocument(docId, file)) as Record<string, unknown>;

    setStudent(prev => {
      if (!prev) return prev;
      const documents: StudentDoc[] = prev.documents.map(d =>
        d.id === docId
          ? {
              ...d,
              status: (saved.status as StudentDoc["status"]) ?? "review",
              file: (saved.file as string) ?? file.name,
              size: (saved.size as string) ?? formatSize(file.size),
              updated:
                (saved.updated as string) ?? new Date().toISOString().slice(0, 10),
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
  }, []);

  const downloadDocument = useCallback(
    (docId: string, fileName: string) => downloadMyDocument(docId, fileName),
    []
  );

  const sendMessage = useCallback(async (body: string) => {
    const text = body.trim();
    if (!text) return;

    const saved = (await postMyMessage(text)) as Record<string, unknown>;
    setStudent(prev => {
      if (!prev) return prev;
      const message: Message = {
        id: String(saved.id ?? `m-${Date.now()}`),
        from: "student",
        author: String(saved.author ?? prev.name),
        at: String(saved.at ?? new Date().toISOString()),
        body: String(saved.body ?? text),
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
      downloadDocument,
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
      downloadDocument,
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
