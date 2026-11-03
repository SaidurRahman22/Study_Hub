<?php

namespace Tests\Feature\Security;

use App\Models\Announcement;
use App\Models\ApplicationStage;
use App\Models\CaseNote;
use App\Models\Document;
use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\MakesPortalUsers;
use Tests\TestCase;

/*
 * The line between the portal and the office.
 *
 * Behind the staff guard is every other student's file: their documents,
 * their messages, the notes written about them, and the power to reset a
 * password. One route defined outside the guarded group would open all of
 * it, and nothing about the response would look wrong.
 *
 * So this file does not pick a few routes to check. It reads the router,
 * finds every route that claims the guard, and holds each one to it — and
 * then reads it a second time from the other direction, asking whether any
 * route on the admin surface FAILED to claim it. The first catches a guard
 * that stopped working; only the second catches a route that never had one.
 *
 * The second subject here is subtler: {student} means a student, never "any
 * row in the users table". Without that, a staff account could reset the
 * admin's password through the ordinary applicant screens.
 */
class StaffGuardTest extends TestCase
{
    use MakesPortalUsers, RefreshDatabase;

    /** Routes that are meant to answer a stranger, and why. */
    private const PUBLIC_ON_PURPOSE = [
        'POST api/enquiries' => 'the contact form',
        'POST api/auth/login' => 'signing in',
    ];

    /* ---------------------------------------------------------------- *
     *  Every guarded route, held to the guard                           *
     * ---------------------------------------------------------------- */

    public function test_every_staff_route_turns_a_student_away(): void
    {
        $student = $this->student();
        $token = $this->tokenFor($student);
        $routes = $this->guardedRoutes();

        // An enumeration that found nothing passes every loop below it, so
        // the count is asserted before the loop and not after it.
        $this->assertGreaterThanOrEqual(20, count($routes), 'the route scan found almost nothing');

        foreach ($routes as [$method, $uri]) {
            $status = $this->withToken($token)->json($method, $uri)->status();

            $this->assertSame(403, $status, "{$method} {$uri} answered {$status} to a student");
        }
    }

    public function test_every_staff_route_turns_a_stranger_away(): void
    {
        $routes = $this->guardedRoutes();
        $this->assertGreaterThanOrEqual(20, count($routes), 'the route scan found almost nothing');

        foreach ($routes as [$method, $uri]) {
            $status = $this->json($method, $uri)->status();

            $this->assertSame(401, $status, "{$method} {$uri} answered {$status} with no token at all");
        }
    }

    public function test_staff_and_admin_both_pass_the_guard(): void
    {
        $this->student();

        // The control for the two tests above: the guard is not simply
        // refusing everyone.
        $this->as($this->staff())->getJson('/api/students')->assertOk();
        $this->as($this->admin())->getJson('/api/students')->assertOk();
    }

    /* ---------------------------------------------------------------- *
     *  Reading the router the other way round                           *
     * ---------------------------------------------------------------- */

    public function test_no_route_on_the_admin_surface_is_missing_the_guard(): void
    {
        $unguarded = [];

        foreach ($this->apiRoutes() as [$method, $uri, $route]) {
            if (! preg_match('#^api/(students|enquiries|announcements)#', $uri)) {
                continue;
            }
            if (array_key_exists("{$method} {$uri}", self::PUBLIC_ON_PURPOSE)) {
                continue;
            }
            if (! in_array('staff', $route->middleware(), true)) {
                $unguarded[] = "{$method} {$uri}";
            }
        }

        $this->assertSame([], $unguarded, 'these routes reach student records with no staff guard');
    }

    public function test_every_api_route_but_the_two_public_ones_requires_a_token(): void
    {
        $open = [];

        foreach ($this->apiRoutes() as [$method, $uri, $route]) {
            if (array_key_exists("{$method} {$uri}", self::PUBLIC_ON_PURPOSE)) {
                continue;
            }
            if (! in_array('auth:sanctum', $route->middleware(), true)) {
                $open[] = "{$method} {$uri}";
            }
        }

        $this->assertSame([], $open, 'these routes are open to the world');
    }

    public function test_the_two_public_routes_are_rate_limited(): void
    {
        // They are the only way in without a token, so the limiter is the
        // only thing between them and a script.
        foreach ($this->apiRoutes() as [$method, $uri, $route]) {
            if (! array_key_exists("{$method} {$uri}", self::PUBLIC_ON_PURPOSE)) {
                continue;
            }

            $throttles = array_filter(
                $route->middleware(),
                fn (string $middleware) => str_starts_with($middleware, 'throttle:')
            );

            $this->assertNotEmpty($throttles, "{$method} {$uri} is public and unthrottled");
        }
    }

    /* ---------------------------------------------------------------- *
     *  {student} means a student                                        *
     * ---------------------------------------------------------------- */

    public function test_staff_cannot_reach_a_colleague_through_the_applicant_routes(): void
    {
        $staff = $this->staff();
        $admin = $this->admin();
        $colleague = $this->staff();

        // 404 rather than 403, so the applicant screens do not double as a
        // way of finding out which ids belong to staff.
        $this->as($staff)->getJson("/api/students/{$admin->id}")->assertStatus(404);
        $this->as($staff)->getJson("/api/students/{$colleague->id}")->assertStatus(404);
    }

    public function test_staff_cannot_reset_the_admins_password_through_the_applicant_routes(): void
    {
        $staff = $this->staff();
        $admin = $this->admin(['email' => 'office@example.net']);

        $this->as($staff)
            ->patchJson("/api/students/{$admin->id}/password", ['password' => 'taken-over'])
            ->assertStatus(404);

        $this->postJson('/api/auth/login', [
            'email' => 'office@example.net',
            'password' => 'taken-over',
        ])->assertStatus(422);
    }

    public function test_staff_cannot_delete_the_admin_through_the_applicant_routes(): void
    {
        $staff = $this->staff();
        $admin = $this->admin();

        $this->as($staff)->deleteJson("/api/students/{$admin->id}")->assertStatus(404);

        $this->assertNotNull(User::find($admin->id));
    }

    public function test_the_student_list_carries_no_staff_rows(): void
    {
        $this->student();
        $staff = $this->staff();
        $admin = $this->admin();

        $listed = collect($this->as($staff)->getJson('/api/students')->assertOk()->json())
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        $this->assertNotContains($staff->id, $listed);
        $this->assertNotContains($admin->id, $listed);
    }

    /* ---------------------------------------------------------------- *
     *  No way to mint a colleague                                       *
     * ---------------------------------------------------------------- */

    public function test_creating_a_student_cannot_create_a_member_of_staff(): void
    {
        $staff = $this->staff();

        $this->as($staff)->postJson('/api/students', [
            'name' => 'Rafi Ahmed',
            'email' => 'rafi@example.net',
            'password' => 'first-password',
            'role' => 'admin',
        ])->assertStatus(201);

        $this->assertSame('student', User::where('email', 'rafi@example.net')->first()->role);
    }

    public function test_editing_a_student_cannot_promote_them(): void
    {
        $staff = $this->staff();
        $rafi = $this->student();

        $this->as($staff)
            ->patchJson("/api/students/{$rafi->id}", ['name' => 'Rafi Ahmed', 'role' => 'admin'])
            ->assertOk();

        $this->assertSame('student', $rafi->fresh()->role);
    }

    /* ---------------------------------------------------------------- *
     *  What a refusal looks like                                        *
     * ---------------------------------------------------------------- */

    public function test_a_refusal_carries_the_same_hardening_headers_as_a_success(): void
    {
        // The headers are appended globally rather than to the api group
        // precisely so that the 401s and 403s — the replies anyone probing
        // the API sees most of — do not go out bare.
        $refused = $this->getJson('/api/students')->assertStatus(401);
        $forbidden = $this->as($this->student())->getJson('/api/students')->assertStatus(403);

        foreach ([$refused, $forbidden] as $response) {
            $response->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
                ->assertHeader('X-Frame-Options', 'DENY')
                ->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('Referrer-Policy', 'no-referrer')
                ->assertHeader('Cache-Control', 'no-store, private');
        }
    }

    public function test_a_response_carrying_a_token_is_never_cached(): void
    {
        $student = $this->student(['email' => 'rafi@example.net']);

        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ])->assertOk()->assertHeader('Cache-Control', 'no-store, private');

        $this->as($student)->getJson('/api/me')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    /* ---------------------------------------------------------------- *
     *  Reading the router                                               *
     * ---------------------------------------------------------------- */

    /**
     * Every route that claims the staff guard, as [method, callable uri]
     * with real ids substituted, so model binding resolves and the guard is
     * what the response is actually about.
     *
     * @return list<array{0: string, 1: string}>
     */
    private function guardedRoutes(): array
    {
        $ids = $this->realIds();
        $routes = [];

        foreach ($this->apiRoutes() as [$method, $uri, $route]) {
            if (! in_array('staff', $route->middleware(), true)) {
                continue;
            }

            $routes[] = [$method, '/'.strtr($uri, $ids)];
        }

        return $routes;
    }

    /**
     * The API routes, one entry per method that is not HEAD.
     *
     * @return list<array{0: string, 1: string, 2: RouteDefinition}>
     */
    private function apiRoutes(): array
    {
        $routes = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/')) {
                continue;
            }

            foreach ($route->methods() as $method) {
                if ($method === 'HEAD') {
                    continue;
                }

                $routes[] = [$method, $route->uri(), $route];
            }
        }

        return $routes;
    }

    /** One of everything a route parameter can name. */
    private function realIds(): array
    {
        $student = $this->student();

        return [
            '{student}' => (string) $student->id,
            '{document}' => (string) Document::create([
                'user_id' => $student->id,
                'name' => 'Passport',
                'group' => 'application',
                'status' => 'needed',
            ])->id,
            '{stage}' => (string) ApplicationStage::create([
                'user_id' => $student->id,
                'name' => 'Counselling',
                'state' => 'now',
                'position' => 0,
            ])->id,
            '{note}' => (string) CaseNote::create([
                'user_id' => $student->id,
                'title' => 'First meeting',
                'body' => 'Wants September intake.',
            ])->id,
            '{enquiry}' => (string) Enquiry::create([
                'name' => 'Someone',
                'email' => 'someone@example.net',
                'message' => 'Tell me about IELTS.',
            ])->id,
            '{announcement}' => (string) Announcement::create([
                'kind' => 'announcement',
                'title' => 'Office closed Friday',
                'body' => 'Back on Saturday.',
            ])->id,
        ];
    }
}
