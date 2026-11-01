import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/* ======================================================================= *
 *  Global page search
 *
 *  One search box in the top bar drives the list on whatever page is open.
 *  A list page calls useListSearch("Search students") on mount: it gets the
 *  current query back, and sets the box's placeholder. The query clears when
 *  the page unmounts, so each page starts clean.
 * ======================================================================= */

type SearchStore = {
  query: string;
  setQuery: (q: string) => void;
  placeholder: string;
  setPlaceholder: (p: string) => void;
};

const Ctx = createContext<SearchStore | null>(null);

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('Search');
  const value = useMemo(
    () => ({ query, setQuery, placeholder, setPlaceholder }),
    [query, placeholder]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Read the raw search context (used by the top-bar input). */
export function usePageSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePageSearch must be used inside <PageSearchProvider>');
  return ctx;
}

/** For a list page: set the placeholder, read the live query, and clear it
 *  when the page leaves. Returns the current lowercased query for filtering. */
export function useListSearch(placeholder: string): string {
  const { query, setQuery, setPlaceholder } = usePageSearch();
  useEffect(() => {
    setPlaceholder(placeholder);
    return () => {
      setQuery('');
      setPlaceholder('Search');
    };
  }, [placeholder, setPlaceholder, setQuery]);
  return query.trim().toLowerCase();
}

/** A stable helper so pages can match a record against the query. */
export function useMatcher() {
  const { query } = usePageSearch();
  const q = query.trim().toLowerCase();
  return useCallback(
    (...fields: (string | undefined)[]) =>
      !q || fields.filter(Boolean).join(' ').toLowerCase().includes(q),
    [q]
  );
}
