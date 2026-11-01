/* The one place the React app talks to the Laravel API.
 *
 * The base URL is VITE_API_URL at build time, falling back to the local dev
 * API (php artisan serve on :8000). On the VPS, set VITE_API_URL to the real
 * API origin before building. */

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

/* ---- auth token (kept per browser) ---- */

const TOKEN_KEY = "shb_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* a session that cannot be remembered still works for this visit */
  }
}

/** fetch against the API with JSON headers and the bearer token attached. */
export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body?.message) return body.message;
  } catch {
    /* non-JSON */
  }
  return fallback;
}

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
};

/** Sign in; stores the token on success. */
export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(
      await errorMessage(res, "That email and password do not match an account.")
    );
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

/** Sign out; clears the token even if the server call fails. */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    /* clear locally regardless */
  }
  setToken(null);
}

/** The signed-in student's own application (the tracker). */
export async function getMyApplication(): Promise<unknown> {
  const res = await apiFetch("/my/application");
  if (!res.ok) throw new Error(await errorMessage(res, "Could not load your application."));
  return res.json();
}

export { API_URL };

export type EnquiryInput = {
  name: string;
  email: string;
  phone?: string;
  destination?: string;
  need?: string;
  subject?: string;
  message?: string;
  source?: string;
};

/** Submit a website enquiry (the contact form). Throws with a readable message
 *  on failure, including Laravel's 422 validation message. */
export async function submitEnquiry(
  data: EnquiryInput
): Promise<{ ok: boolean; id?: number }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(
      "We could not reach the server. Check your connection and try again."
    );
  }

  if (!res.ok) {
    let msg = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      /* non-JSON error */
    }
    throw new Error(msg);
  }

  return res.json();
}
