/* The admin's calls to the Laravel API.
 *
 * The admin keeps its own token, separate from the student portal's, so a
 * student signed in on the public site and a staff member signed into the
 * admin in the same browser do not overwrite each other.
 *
 * VITE_API_URL points this at the real API; without it the local dev API is
 * used (php artisan serve on :8000). */

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000/api';

const TOKEN_KEY = 'shb_admin_token';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* a session that cannot be remembered still works for this visit */
  }
}

async function call(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

async function fail(res: Response, fallback: string): Promise<never> {
  let msg = fallback;
  try {
    const body = await res.json();
    if (body?.message) msg = body.message;
  } catch {
    /* non-JSON */
  }
  throw new Error(msg);
}

async function send<T>(path: string, opts: RequestInit = {}, fallback = 'Request failed'): Promise<T> {
  let res: Response;
  try {
    res = await call(path, opts);
  } catch {
    throw new Error('Could not reach the server. Is the API running?');
  }
  if (!res.ok) await fail(res, fallback);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ---- shapes the API returns ---- */

export type ApiStage = {
  id: number;
  name: string;
  state: 'todo' | 'now' | 'done';
  when: string | null;
  note: string | null;
};

export type ApiNote = {
  id: number;
  title: string;
  body: string | null;
  status: 'todo' | 'now' | 'done';
  date: string | null;
  at: string | null;
};

export type ApiStudent = {
  id: number;
  studentId: string | null;
  name: string;
  email: string;
  phone: string | null;
  counsellor: string | null;
  country: string | null;
  university: string | null;
  course: string | null;
  intake: string | null;
  stages: ApiStage[];
  caseNotes: ApiNote[];
};

export type ApiEnquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  destination: string | null;
  need: string | null;
  subject: string | null;
  message: string | null;
  source: string;
  status: 'new' | 'contacted' | 'booked' | 'closed';
  scheduled_at: string | null;
  timezone: string | null;
  online: boolean;
  created_at: string;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
};

/* ---- auth ---- */

export async function adminLogin(email: string, password: string): Promise<AdminUser> {
  const data = await send<{ token: string; user: AdminUser }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    'Those details do not match our records.'
  );
  setAdminToken(data.token);
  return data.user;
}

export async function adminLogout(): Promise<void> {
  try {
    await call('/auth/logout', { method: 'POST' });
  } catch {
    /* clear locally regardless */
  }
  setAdminToken(null);
}

export async function adminMe(): Promise<AdminUser> {
  return send<AdminUser>('/me', {}, 'Could not confirm your sign-in.');
}

/* ---- students ---- */

export async function listStudents(): Promise<ApiStudent[]> {
  return send<ApiStudent[]>('/students', {}, 'Could not load students.');
}

export type CreateStudentBody = {
  name: string;
  email: string;
  password: string;
  studentId?: string;
  counsellor?: string;
  country?: string;
  university?: string;
  course?: string;
  intake?: string;
};

export async function createStudent(body: CreateStudentBody): Promise<ApiStudent> {
  return send<ApiStudent>(
    '/students',
    { method: 'POST', body: JSON.stringify(body) },
    'Could not create the student.'
  );
}

export async function deleteStudent(id: number): Promise<void> {
  await send(`/students/${id}`, { method: 'DELETE' }, 'Could not delete the student.');
}

export async function setStudentPassword(id: number, password: string): Promise<void> {
  await send(
    `/students/${id}/password`,
    { method: 'PATCH', body: JSON.stringify({ password }) },
    'Could not change the password.'
  );
}

export async function patchStage(
  studentId: number,
  stageId: number,
  patch: { state?: string; when?: string; note?: string }
): Promise<ApiStage> {
  return send<ApiStage>(
    `/students/${studentId}/stages/${stageId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    'Could not update the stage.'
  );
}

export async function createCaseNote(
  studentId: number,
  note: { title: string; body: string; status: string; date: string }
): Promise<ApiNote> {
  return send<ApiNote>(
    `/students/${studentId}/case-notes`,
    { method: 'POST', body: JSON.stringify(note) },
    'Could not add the note.'
  );
}

export async function patchCaseNote(
  studentId: number,
  noteId: number,
  patch: { title?: string; body?: string; status?: string; date?: string }
): Promise<ApiNote> {
  return send<ApiNote>(
    `/students/${studentId}/case-notes/${noteId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    'Could not update the note.'
  );
}

export async function removeCaseNote(studentId: number, noteId: number): Promise<void> {
  await send(
    `/students/${studentId}/case-notes/${noteId}`,
    { method: 'DELETE' },
    'Could not delete the note.'
  );
}

/* ---- enquiries (the leads list, and booked consultations) ---- */

export async function listEnquiries(): Promise<ApiEnquiry[]> {
  return send<ApiEnquiry[]>('/enquiries', {}, 'Could not load enquiries.');
}

export type CreateEnquiryBody = {
  name: string;
  email: string;
  phone?: string;
  destination?: string;
  need?: string;
  message?: string;
  source?: string;
  scheduled_at?: string;
  timezone?: string;
  online?: boolean;
};

export async function createEnquiry(body: CreateEnquiryBody): Promise<ApiEnquiry> {
  return send<ApiEnquiry>(
    '/enquiries',
    { method: 'POST', body: JSON.stringify(body) },
    'Could not save the booking.'
  );
}

export async function patchEnquiryStatus(
  id: number,
  status: string
): Promise<ApiEnquiry> {
  return send<ApiEnquiry>(
    `/enquiries/${id}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    'Could not update the status.'
  );
}
