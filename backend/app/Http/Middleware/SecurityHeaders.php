<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/* Response headers for the API.
 *
 * This is a JSON API: no page of its own is ever meant to be rendered, framed
 * or treated as a script. So the policy here can be far stricter than the one
 * the website gets, and it is the website's own headers (client/public/_headers
 * and client/public/.htaccess) that do the equivalent job for the pages people
 * actually look at. Both are needed; neither covers the other.
 *
 * Registered globally in bootstrap/app.php rather than on the `api` group, so
 * it also covers the 401/403/404/429 replies the exception handler builds
 * outside the route pipeline. Those are exactly the responses that someone
 * probing the API sees most of, and as a group middleware they went out bare.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // A JSON API needs nothing at all: no scripts, no styles, no images,
        // and it must never be put in a frame. "default-src 'none'" says that
        // in one line; frame-ancestors is spelled out separately because
        // X-Frame-Options is the only one some older browsers read.
        $response->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $response->headers->set('X-Frame-Options', 'DENY');

        // Stop a browser guessing that a JSON body is really HTML, which is
        // how a stored string turns into a script someone else runs.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // An API URL can carry a student id; do not hand it to anywhere else.
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        // Nothing this API returns is public, and several responses carry a
        // token or a student's own file. Laravel's default is "no-cache,
        // private", which still allows a copy to be written to disk and only
        // asks that it be revalidated. Overwrite it: no-store is the one that
        // means do not keep it at all.
        if ($request->is('api/*')) {
            $response->headers->set('Cache-Control', 'no-store, private');
            $response->headers->remove('Pragma');
        }

        // Only meaningful over HTTPS, and only promise it when the request
        // actually arrived that way: sending it from a plain-HTTP dev server
        // would teach a browser to refuse http://localhost later.
        if ($request->secure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        return $response;
    }
}
