import React, { createContext, useContext, useEffect, useState } from "react";
import defaultContent from "../../../content/site-content.json";

export type SiteContent = typeof defaultContent;

interface CmsContextValue {
  content: SiteContent;
  loading: boolean;
}

const CmsContext = createContext<CmsContextValue>({
  content: defaultContent,
  loading: false,
});

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SiteContent) => {
        if (!cancelled) setContent(data);
      })
      .catch(() => {
        // Silently fall back to build-time default content
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CmsContext.Provider value={{ content, loading }}>
      {children}
    </CmsContext.Provider>
  );
}

export function useCms() {
  return useContext(CmsContext);
}
