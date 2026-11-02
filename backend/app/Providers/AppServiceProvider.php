<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->defineRateLimits();
        $this->bindStudentRoutes();
    }

    /* Every staff route spelled {student} means a student, not "any row in
     * the users table". Without this the binding happily resolves the admin,
     * and a staff account could PATCH /api/students/1/password to take the
     * admin over, or DELETE it and lock the organisation out. Scoping the
     * binding closes all of those at once, and returns 404 rather than 403 so
     * the staff routes do not confirm which ids belong to staff.
     *
     * Managing colleagues, if it is ever wanted, belongs on its own route
     * gated on the admin role, not on the screens that manage applicants. */
    private function bindStudentRoutes(): void
    {
        Route::bind('student', fn ($value) => User::where('role', 'student')
            ->where('id', $value)
            ->firstOrFail());
    }

    /* Rate limits, by what the endpoint costs and what abusing it would buy.
     *
     * These are per IP. The per-account lockout that stops someone grinding
     * one student's password lives in AuthController, because it has to key
     * on the email being tried, not on where the request came from. Both are
     * needed: a lockout alone is walked around by spraying one guess across
     * many emails, and an IP limit alone is walked around by a botnet. */
    private function defineRateLimits(): void
    {
        // Signing in. Low, because a person signs in once and a script does
        // not. Keyed by IP so email-spraying is caught even when no single
        // account reaches its own lockout.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip())
            ->response(fn () => response()->json([
                'message' => 'Too many sign-in attempts from this connection. Wait a minute and try again.',
            ], 429)));

        // The public contact form. It writes a row and sends two emails, so
        // it is the cheapest thing here to abuse and the most expensive to
        // serve.
        /* Two limits, because they stop different things. The per-IP one
         * stops a flood. The per-recipient one stops someone using our
         * domain to post mail at a person they have chosen: the endpoint
         * auto-replies to whatever address it is handed, so without this a
         * few dozen IPs could point a stream of our email at one inbox. */
        RateLimiter::for('enquiries', fn (Request $request) => [
            Limit::perMinute(5)
                ->by($request->ip())
                ->response(fn () => response()->json([
                    'message' => 'That is a lot of enquiries at once. Wait a minute, then send the next one.',
                ], 429)),
            Limit::perHour(3)
                ->by(Str::lower((string) $request->input('email')))
                ->response(fn () => response()->json([
                    'message' => 'We already have your enquiry. Someone will be in touch shortly.',
                ], 429)),
        ]);

        // Everything else, as a backstop against a signed-in token being used
        // to hammer the API. High enough that ordinary use never notices.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
