import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { get, set } from 'lodash';
import defaultContent from '../../../../content/site-content.json';

/* ======================================================================= *
 *  Website content store (frontend phase)
 *
 *  Holds the marketing site's content while it is edited. Loads it the way
 *  the public site does, fetch /api/content, fall back to the bundled copy -
 *  and keeps an editable copy in state.
 *
 *  Saving is not wired yet: this phase builds the editing UI; the
 *  commit-to-the-repo step is the next phase (see ADMIN-CONTENT-MAP.md §6).
 * ======================================================================= */

export type SiteContent = typeof defaultContent;

type Store = {
  content: SiteContent;
  loading: boolean;
  dirty: boolean;
  read: (path: string) => unknown;
  update: (path: string, value: unknown) => void;
  reset: () => void;
  save: () => void;
};

const Ctx = createContext<Store | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(
    () => structuredClone(defaultContent) as SiteContent
  );
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/content')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: SiteContent) => {
        setContent(structuredClone(data));
        setDirty(false);
      })
      .catch(() => {
        /* keep the bundled copy already in state */
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback((path: string, value: unknown) => {
    setContent((prev) => {
      const next = structuredClone(prev);
      set(next as object, path, value);
      return next;
    });
    setDirty(true);
  }, []);

  const read = useCallback((path: string) => get(content, path), [content]);
  const reset = useCallback(() => load(), [load]);
  const save = useCallback(() => {
    window.alert(
      'Saving is not wired yet. This is the editing UI; the save-to-site step is the next phase.'
    );
  }, []);

  const value: Store = { content, loading, dirty, read, update, reset, save };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContentStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useContentStore must be used inside <ContentProvider>');
  return ctx;
}
