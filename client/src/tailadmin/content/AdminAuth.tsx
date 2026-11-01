import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Icon } from '@iconify/react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import {
  adminLogin,
  adminLogout,
  adminMe,
  getAdminToken,
  setAdminToken,
  type AdminUser,
} from './admin-api';
import { useStudents } from './students-store';

/* The admin is staff-only. Nothing renders until a staff account is signed in
 * and the API has confirmed the token, so the panel cannot be opened by
 * typing the URL. A student's token is rejected here too. */

type AuthState = { user: AdminUser; signOut: () => void };

const AuthCtx = createContext<AuthState | null>(null);

export function useAdminAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAdminAuth must be used inside <RequireStaff>');
  return ctx;
}

const isStaff = (u: AdminUser) => u.role === 'staff' || u.role === 'admin';

export function RequireStaff({ children }: { children: ReactNode }) {
  const { reload } = useStudents();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Confirm a stored token with the server before trusting it.
  useEffect(() => {
    if (!getAdminToken()) {
      setChecking(false);
      return;
    }
    adminMe()
      .then((u) => {
        if (isStaff(u)) setUser(u);
        else setAdminToken(null);
      })
      .catch(() => setAdminToken(null))
      .finally(() => setChecking(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const u = await adminLogin(email.trim(), password);
      if (!isStaff(u)) {
        setAdminToken(null);
        throw new Error('That account cannot open the admin.');
      }
      setUser(u);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  const signOut = useCallback(() => {
    void adminLogout();
    setUser(null);
    setEmail('');
    setPassword('');
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your sign-in...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-ld bg-card p-8">
          <div className="mb-6 flex items-center gap-3">
            <img src="/images/logo-mark.png" alt="" width={34} height={34} />
            <div>
              <div className="font-semibold text-foreground">Study Hub BD</div>
              <div className="text-xs text-muted-foreground">Content admin</div>
            </div>
          </div>

          <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Staff accounts only.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 flex gap-2 rounded-lg border border-error/40 bg-lighterror px-3 py-2 text-sm text-error"
            >
              <Icon icon="solar:danger-triangle-linear" width={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                className="mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                className="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={busy || !email.trim() || !password}>
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* DEVELOPMENT ONLY. Remove this block before the admin is used for
              anything real: it prints a working sign-in on the page. */}
          <div className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="text-xs font-semibold text-warning">
              Development sign-in
            </p>
            <p className="mt-1 text-xs text-foreground/80">
              Staff: <strong>admin@studyhub.test</strong> / <strong>password</strong>
              <br />
              Student portal: <strong>student@demo.studyhubbd.com</strong> /{' '}
              <strong>password</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@studyhub.test');
                setPassword('password');
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Fill the staff sign-in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthCtx.Provider value={{ user, signOut }}>{children}</AuthCtx.Provider>;
}
