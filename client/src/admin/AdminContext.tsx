import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { adminApi, getToken, setToken, type SiteContent } from "./api";

/* ====================================================================== *
 *  One place that owns the content document while it is being edited.    *
 *                                                                        *
 *  The whole site is one JSON file, so every editor screen is a view     *
 *  onto the same object. Keeping it here means a half-finished edit on   *
 *  one screen survives a move to another, and one Save writes the lot.   *
 *                                                                        *
 *  The sha from the last read is carried back on save. GitHub rejects    *
 *  the write if the file moved underneath us, which is what stops two    *
 *  people silently overwriting each other.                               *
 * ====================================================================== */

type AdminState = {
  ready: boolean;
  signedIn: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  notice: string | null;
  content: SiteContent | null;
  dirty: boolean;
  signIn: (password: string) => Promise<boolean>;
  signOut: () => void;
  reload: () => Promise<void>;
  /** Replace a top-level section of the content document. */
  patch: (key: string, value: unknown) => void;
  save: (message?: string) => Promise<boolean>;
  setNotice: (text: string | null) => void;
};

const Ctx = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const shaRef = useRef<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { content: doc, sha } = await adminApi.getContent();
      setContent(doc);
      shaRef.current = sha;
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    setSignedIn(true);
    load().finally(() => setReady(true));
  }, [load]);

  /* A half-written edit is easy to lose by closing the tab. */
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const signIn = useCallback(
    async (password: string) => {
      setError(null);
      try {
        const { token } = await adminApi.login(password);
        setToken(token);
        setSignedIn(true);
        await load();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not sign in");
        return false;
      }
    },
    [load]
  );

  const signOut = useCallback(() => {
    setToken("");
    setSignedIn(false);
    setContent(null);
    setDirty(false);
    shaRef.current = "";
  }, []);

  const patch = useCallback((key: string, value: unknown) => {
    setContent(prev => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  }, []);

  const save = useCallback(
    async (message?: string) => {
      if (!content) return false;
      setSaving(true);
      setError(null);
      setNotice(null);
      try {
        const res = await adminApi.saveContent(
          content,
          shaRef.current,
          message
        );
        if (res.newSha) shaRef.current = res.newSha;
        setDirty(false);
        setNotice(
          "Saved. The site rebuilds from this commit, so the change appears publicly in about a minute."
        );
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not save";
        // A stale sha means someone else saved since this page loaded.
        setError(
          /sha|conflict|409/i.test(msg)
            ? "Someone else saved while this page was open. Reload to get their version, then redo your change."
            : msg
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [content]
  );

  const value = useMemo(
    () => ({
      ready,
      signedIn,
      loading,
      saving,
      error,
      notice,
      content,
      dirty,
      signIn,
      signOut,
      reload: load,
      patch,
      save,
      setNotice,
    }),
    [
      ready,
      signedIn,
      loading,
      saving,
      error,
      notice,
      content,
      dirty,
      signIn,
      signOut,
      load,
      patch,
      save,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}
