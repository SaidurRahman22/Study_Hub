import { next } from "@vercel/functions";

/* ======================================================================= *
 *  A password wall in front of the admin.
 *
 *  The admin is part of the site's own bundle, so without this every
 *  /admin path would be a plain static file that anyone could open. The
 *  shared password on /api/admin/* is what actually protects the content;
 *  this wall sits in front of the interface so the admin is not
 *  enumerable and so a guessing attempt never reaches the application.
 *
 *  It deliberately covers the sub-routes too. An earlier version of this
 *  site guarded only /admin, and a second copy of the panel at
 *  /admin.html walked straight around it.
 *
 *  /api/* is left out on purpose. Those routes carry their own token
 *  check, and a browser does not reliably attach Basic credentials to a
 *  fetch(), so guarding them here would break the admin's own requests.
 * ======================================================================= */

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

/** Compares without returning early, so the time taken does not describe
 *  how much of the password was right. */
function sameSecret(given, expected) {
  const encoder = new TextEncoder();
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function askForPassword() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Study Hub Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export default function middleware(request) {
  const user = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  // Refuse rather than fall open: a missing variable must not publish the
  // admin to everyone.
  if (!user || !password) {
    return new Response(
      "The admin is unavailable: ADMIN_USERNAME and ADMIN_PASSWORD are not set on this deployment.",
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return askForPassword();

  let decoded = "";
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return askForPassword();
  }

  // Split on the first colon only: a password may contain one.
  const colon = decoded.indexOf(":");
  if (colon === -1) return askForPassword();

  const givenUser = decoded.slice(0, colon);
  const givenPassword = decoded.slice(colon + 1);

  // Both are always compared, so a wrong username and a wrong password
  // take the same time.
  const userOk = sameSecret(givenUser, user);
  const passwordOk = sameSecret(givenPassword, password);
  if (!userOk || !passwordOk) return askForPassword();

  return next({
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}
