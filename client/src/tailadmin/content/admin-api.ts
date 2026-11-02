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

/* Without VITE_API_URL this points at the machine that built it, which only
 * works locally: a published HTTPS page cannot reach a loopback address, and
 * the browser reports that as "Failed to fetch". Say what is really wrong. */
const API_IS_LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(API_URL);

function unreachable(): Error {
  const pageIsLocal =
    typeof location !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  if (API_IS_LOOPBACK && !pageIsLocal) {
    return new Error(
      'This published copy has no backend connected, so the admin cannot sign in here. Open it on the machine running the API, or rebuild with VITE_API_URL set to a public API.'
    );
  }
  return new Error(`Could not reach the API at ${API_URL}. Check that it is running.`);
}

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
  try {
    return await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
  } catch {
    throw unreachable();
  }
}

/** Multipart must not carry a JSON content-type: the browser sets the
 *  boundary itself. */
async function callForm(path: string, form: FormData): Promise<Response> {
  const token = getAdminToken();
  try {
    return await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: form,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw unreachable();
  }
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
  documents: ApiDocument[];
  messages: ApiMessage[];
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
    // context=staff matters only while DEV_OPEN_LOGIN is on: it tells the API
    // that an unrecognised sign-in here should resolve to a staff account, not
    // a student, because a student token is refused by RequireStaff anyway.
    // With the real password check on, it is ignored.
    { method: 'POST', body: JSON.stringify({ email, password, context: 'staff' }) },
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

/* ---- documents ---- */

export type ApiDocument = {
  id: string;
  name: string;
  group: 'application' | 'visa';
  status: string;
  file: string | null;
  size: string | null;
  updated: string | null;
  note: string | null;
  hasFile: boolean;
};

/** Add a document to a student's file, with an optional real file attached. */
export async function createDocument(
  studentId: number,
  meta: { name: string; group: string; status?: string; note?: string },
  file?: File | null
): Promise<ApiDocument> {
  const form = new FormData();
  form.append('name', meta.name);
  form.append('group', meta.group);
  if (meta.status) form.append('status', meta.status);
  if (meta.note) form.append('note', meta.note);
  if (file) form.append('file', file);

  let res: Response;
  try {
    res = await callForm(`/students/${studentId}/documents`, form);
  } catch {
    throw new Error('Could not reach the server. Is the API running?');
  }
  if (!res.ok) await fail(res, 'Could not upload the document.');
  return res.json();
}

export async function patchDocument(
  studentId: number,
  documentId: string,
  patch: { status?: string; note?: string; name?: string; group?: string }
): Promise<ApiDocument> {
  return send<ApiDocument>(
    `/students/${studentId}/documents/${documentId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    'Could not update the document.'
  );
}

export async function deleteDocument(
  studentId: number,
  documentId: string
): Promise<void> {
  await send(
    `/students/${studentId}/documents/${documentId}`,
    { method: 'DELETE' },
    'Could not delete the document.'
  );
}

/** Download through the authorised route, then hand the browser a blob. The
 *  file is never on a public URL, so it cannot be linked to directly. */
export async function downloadDocument(
  studentId: number,
  documentId: string,
  filename: string
): Promise<void> {
  const res = await call(`/students/${studentId}/documents/${documentId}/download`);
  if (!res.ok) await fail(res, 'Could not download the file.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Same reasoning as the portal's download: this string decides the name of
  // a file written to the staff member's own machine.
  a.download = (filename || 'document').replace(/[\/:*?"<>|]+/g, '_').slice(0, 120);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---- messages: one thread per student ---- */

export type ApiMessage = {
  id: string;
  from: 'student' | 'agency';
  author: string;
  at: string | null;
  body: string;
};

export async function listMessages(studentId: number): Promise<ApiMessage[]> {
  return send<ApiMessage[]>(`/students/${studentId}/messages`, {}, 'Could not load the thread.');
}

export async function postMessage(studentId: number, body: string): Promise<ApiMessage> {
  return send<ApiMessage>(
    `/students/${studentId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
    'Could not send the message.'
  );
}

/* ---- announcements ---- */

export type ApiAnnouncement = {
  id: string;
  kind: 'document' | 'stage' | 'message' | 'announcement';
  title: string;
  body: string | null;
  at: string | null;
  href: string | null;
  /** "all", or the student's numeric id as a string. Staff list only. */
  audience?: string;
  audienceName?: string;
};

export async function listAnnouncements(): Promise<ApiAnnouncement[]> {
  return send<ApiAnnouncement[]>('/announcements', {}, 'Could not load announcements.');
}

export async function createAnnouncement(body: {
  audience: string;
  title: string;
  body?: string;
  kind?: string;
}): Promise<ApiAnnouncement> {
  return send<ApiAnnouncement>(
    '/announcements',
    { method: 'POST', body: JSON.stringify(body) },
    'Could not post the announcement.'
  );
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await send(`/announcements/${id}`, { method: 'DELETE' }, 'Could not delete the announcement.');
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
