/* ====================================================================== *
 *  ADMIN API CLIENT                                                      *
 *                                                                        *
 *  Thin typed wrapper over the existing serverless endpoints. Those have *
 *  not changed: this is the same contract the old single-file panel      *
 *  used, so both can coexist while the new panel is finished.            *
 *                                                                        *
 *  SECURITY, stated plainly because the next person needs to know:       *
 *  the whole admin rests on one shared password that mints a JWT, and    *
 *  that JWT is kept in localStorage where any injected script can read   *
 *  it. The token authorises commits to the GitHub repository that the    *
 *  site is built from, so a stolen token is a deploy, not just an edit.  *
 *  Fixing that means per-user accounts, an HttpOnly cookie and a         *
 *  narrower repository token. None of it is fixed here, and a nicer      *
 *  interface does not make it safer. See Docs/ASSESSMENT.md.             *
 * ====================================================================== */

export type SiteContent = Record<string, unknown>;

export type ImageRecord = {
  path: string;
  name: string;
  sha: string;
  size?: number;
  url?: string;
};

const TOKEN_KEY = "cms_token";

export function getToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token: string) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* a session that cannot be remembered still works for this visit */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    // No endpoint at all is the common case on a static host, so say so
    // rather than leaving the reader staring at "failed to fetch".
    throw new ApiError(
      "Could not reach the server. The admin needs the API, which only runs on a deployment that supports serverless functions.",
      0
    );
  }

  if (res.status === 404) {
    throw new ApiError(
      "The admin API is not available on this deployment. It only runs where the serverless functions are deployed.",
      404
    );
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const adminApi = {
  login: (password: string) =>
    request<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  getContent: () =>
    request<{ content: SiteContent; sha: string }>("/api/admin/content"),

  saveContent: (content: SiteContent, sha: string, message?: string) =>
    request<{ newSha?: string; message?: string }>("/api/admin/content", {
      method: "PUT",
      body: JSON.stringify({ content, sha, message }),
    }),

  listImages: () => request<{ images: ImageRecord[] }>("/api/admin/images"),

  deleteImage: (path: string, sha: string) =>
    request<{ message: string }>("/api/admin/images", {
      method: "DELETE",
      body: JSON.stringify({ path, sha }),
    }),

  /** Commits the image to the repository and returns the path the site
   *  will serve it from once it rebuilds. */
  uploadImage: async (file: File, folder: string) => {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.readAsDataURL(file);
    });
    return request<{ path: string; filename: string }>("/api/admin/upload", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        data,
        folder,
      }),
    });
  },
};
