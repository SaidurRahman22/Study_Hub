import { useState, type FormEvent } from "react";
import { Route, Switch } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Images,
  Quote,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { AdminProvider, useAdmin } from "./AdminContext";
import AdminShell from "./AdminShell";
import Dashboard from "./pages/Dashboard";
import Stories from "./pages/Stories";
import Services from "./pages/Services";
import Settings from "./pages/Settings";
import Media from "./pages/Media";
import { asset } from "@/lib/asset";
import "@/styles/admin.css";

/* The admin entry. Everything under /admin is lazily loaded through this
 * one module, so a visitor who never opens the admin never downloads it. */

function SignIn() {
  const { signIn, error } = useAdmin();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    await signIn(password);
    setBusy(false);
  }

  return (
    <div className="ad">
      <div className="ad-login">
        <div className="ad-login-card">
          <img
            src={asset("/images/logo-mark.png")}
            alt=""
            width={40}
            height={40}
          />
          <h1 className="ad-title" style={{ marginTop: 16 }}>
            Content admin
          </h1>
          <p className="ad-sub" style={{ marginBottom: 22 }}>
            Sign in to edit the Study Hub BD website.
          </p>

          {error && (
            <p
              className="ad-note ad-note-bad"
              style={{ marginBottom: 16 }}
              role="alert"
            >
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <form onSubmit={onSubmit}>
            <div className="ad-field">
              <label className="ad-label" htmlFor="ad-pwd">
                Password
              </label>
              <input
                id="ad-pwd"
                className="ad-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="ad-btn ad-btn-primary"
              style={{ width: "100%" }}
              disabled={busy || !password}
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>

          <p className="ad-note ad-note-warn" style={{ marginTop: 22 }}>
            <ShieldAlert size={16} aria-hidden="true" />
            <span>
              This is one shared password for everyone who edits the site, and
              it authorises commits to the live repository. Do not reuse it
              anywhere, and change it if anyone who knew it leaves.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Routes() {
  const { ready, signedIn, loading } = useAdmin();

  if (!ready) {
    return (
      <div className="ad">
        <div className="ad-body">
          <p className="ad-sub">Loading…</p>
        </div>
      </div>
    );
  }
  if (!signedIn) return <SignIn />;

  return (
    <AdminShell>
      {loading ? (
        <p className="ad-sub">Loading the content…</p>
      ) : (
        <Switch>
          <Route path="/admin" component={Dashboard} />
          <Route path="/admin/stories" component={Stories} />
          <Route path="/admin/services" component={Services} />
          <Route path="/admin/media" component={Media} />
          <Route path="/admin/settings" component={Settings} />
          <Route>
            <EmptyRoute />
          </Route>
        </Switch>
      )}
    </AdminShell>
  );
}

function EmptyRoute() {
  return (
    <div className="ad-card">
      <div className="ad-card-body">
        <h2 className="ad-card-title">Nothing here</h2>
        <p className="ad-sub">
          Pick a section from the left. Stories, services, media and settings
          are the parts wired up so far.
        </p>
        <div
          style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
        >
          <a className="ad-btn" href="/admin/stories">
            <Quote size={15} aria-hidden="true" /> Stories
          </a>
          <a className="ad-btn" href="/admin/services">
            <Wrench size={15} aria-hidden="true" /> Services
          </a>
          <a className="ad-btn" href="/admin/media">
            <Images size={15} aria-hidden="true" /> Media
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <Routes />
    </AdminProvider>
  );
}
