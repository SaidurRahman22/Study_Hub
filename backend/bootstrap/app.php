<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'staff' => \App\Http\Middleware\EnsureStaff::class,
        ]);

        // Every API response carries the same hardening headers, so a new
        // route cannot forget them.
        // Global, not group-scoped: an unauthenticated request is turned
        // into a 401 by the exception handler, which sits outside the route
        // pipeline. A group middleware never sees that response, so the error
        // replies, the ones most likely to be probed, would go out bare.
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        /* Behind a tunnel or a load balancer every request arrives from the
         * proxy, so $request->ip() returns the proxy unless it is trusted.
         * That silently inverts the rate limits: throttle:login stops being
         * 10 sign-ins per minute per visitor and becomes 10 for the whole
         * world, and the per-account lockout key collapses to one bucket.
         *
         * TRUSTED_PROXIES is a comma-separated list, empty by default so a
         * directly-reachable host trusts nobody. Never set it to * on a host
         * that can be reached without going through the proxy: that lets
         * anyone spoof X-Forwarded-For and step around every limit. With
         * cloudflared on the same machine, 127.0.0.1,::1 is right. */
        $proxies = array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))));
        $middleware->trustProxies(
            at: $proxies === ['*'] ? '*' : $proxies,
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Without this an unauthenticated API request that does not ask for
        // JSON is redirected to a "login" route that does not exist, which
        // surfaces as a 500 instead of an honest 401.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return null;
        });
    })->create();
