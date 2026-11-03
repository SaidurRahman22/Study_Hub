<?php

namespace Tests\Feature\Security;

use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\MakesPortalUsers;
use Tests\TestCase;

/*
 * Signing in, staying signed in, and stopping being signed in.
 *
 * The four properties under test, in the order they matter:
 *
 *  1. A wrong password never gets in, and a wrong EMAIL fails in exactly the
 *     same words — otherwise the endpoint is a list of who has an account.
 *  2. Guessing is bounded from both directions: per account and per IP.
 *  3. A token identifies one person and stops working when they say so.
 *  4. The development door — sign-in with no password check at all — cannot
 *     be opened in production, whatever is in the .env file.
 *
 * Point 4 is the one that would be most expensive to get wrong and the only
 * one nobody would notice: everything keeps working.
 */
class AuthenticationTest extends TestCase
{
    use MakesPortalUsers, RefreshDatabase;

    /* ---------------------------------------------------------------- *
     *  Who gets in                                                      *
     * ---------------------------------------------------------------- */

    public function test_the_right_password_returns_a_working_token(): void
    {
        $student = $this->student(['email' => 'rafi@example.net']);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $student->id)
            ->assertJsonPath('user.role', 'student')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role', 'studentId']]);

        // Nothing about the password, hashed or otherwise, comes back out.
        $this->assertArrayNotHasKey('password', $response->json('user'));

        // And the token is not decoration: it signs the request.
        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('id', $student->id);
    }

    public function test_the_wrong_password_is_refused(): void
    {
        $this->student(['email' => 'rafi@example.net']);

        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'not-the-password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_a_wrong_password_and_an_unknown_account_are_indistinguishable(): void
    {
        $this->student(['email' => 'rafi@example.net']);

        $wrongPassword = $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'not-the-password',
        ]);

        $noSuchAccount = $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.net',
            'password' => 'not-the-password',
        ]);

        // Same status, same words. Anything else turns the sign-in form into
        // a way of asking "does this person have a file with you?".
        $this->assertSame($wrongPassword->status(), $noSuchAccount->status());
        $this->assertSame($wrongPassword->json(), $noSuchAccount->json());
    }

    public function test_login_requires_an_email_and_a_password(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    /* ---------------------------------------------------------------- *
     *  How many guesses                                                 *
     * ---------------------------------------------------------------- */

    public function test_five_wrong_passwords_lock_the_account_out(): void
    {
        $this->student(['email' => 'rafi@example.net']);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => 'rafi@example.net',
                'password' => "guess-{$attempt}",
            ])->assertStatus(422);
        }

        // The sixth is refused before the password is even looked at, so the
        // RIGHT password is refused too. That is the point: a lockout that
        // lets the correct guess through has not bounded anything.
        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ])->assertStatus(429);
    }

    public function test_a_stranger_cannot_lock_a_student_out_of_their_own_account(): void
    {
        $this->student(['email' => 'rafi@example.net']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5']);
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => 'rafi@example.net',
                'password' => "guess-{$attempt}",
            ])->assertStatus(422);
        }
        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ])->assertStatus(429);

        // The real student, at home, is unaffected: the lockout is keyed on
        // the account AND the place, so failing on purpose from somewhere
        // else is not a way to shut someone out of their own file.
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.22']);
        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ])->assertOk();
    }

    public function test_a_forged_forwarded_for_header_does_not_move_the_lockout(): void
    {
        $this->student(['email' => 'rafi@example.net']);

        // No proxy is trusted by default, so X-Forwarded-For is a string a
        // stranger wrote and nothing more. If it were read, every attempt
        // below would land in its own bucket and nothing would ever lock.
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withHeader('X-Forwarded-For', "192.0.2.{$attempt}")
                ->postJson('/api/auth/login', [
                    'email' => 'rafi@example.net',
                    'password' => "guess-{$attempt}",
                ])->assertStatus(422);
        }

        $this->withHeader('X-Forwarded-For', '192.0.2.99')
            ->postJson('/api/auth/login', [
                'email' => 'rafi@example.net',
                'password' => 'student-password',
            ])->assertStatus(429);
    }

    public function test_spraying_one_guess_across_many_accounts_is_stopped_by_the_ip_limit(): void
    {
        // Ten different emails never reach any single account's lockout, so
        // the per-IP throttle is the only thing standing in the way.
        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => "student{$attempt}@example.net",
                'password' => 'Password123',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'student11@example.net',
            'password' => 'Password123',
        ])->assertStatus(429);
    }

    /* ---------------------------------------------------------------- *
     *  Staying signed in, and stopping                                  *
     * ---------------------------------------------------------------- */

    public function test_an_unauthenticated_api_request_is_a_401_in_json(): void
    {
        $this->getJson('/api/me')->assertStatus(401)->assertJson(['message' => 'Unauthenticated.']);

        // Without an Accept header too: the default redirect to a login route
        // that does not exist would surface as a 500, not an honest 401.
        $this->get('/api/me')->assertStatus(401);
    }

    public function test_a_discarded_token_is_rejected(): void
    {
        $student = $this->student();
        $token = $this->tokenFor($student);

        $this->withToken($token)->getJson('/api/me')->assertOk();

        $student->tokens()->delete();

        $this->withToken($token)->getJson('/api/me')->assertStatus(401);
    }

    public function test_a_made_up_token_is_rejected(): void
    {
        $this->withToken('1|thisisnotarealtoken')->getJson('/api/me')->assertStatus(401);
    }

    public function test_signing_out_revokes_only_the_token_that_was_used(): void
    {
        $student = $this->student();
        $phone = $this->tokenFor($student, 'phone');
        $laptop = $this->tokenFor($student, 'laptop');

        $this->withToken($phone)->postJson('/api/auth/logout')->assertOk();

        $this->withToken($phone)->getJson('/api/me')->assertStatus(401);
        $this->withToken($laptop)->getJson('/api/me')->assertOk();
    }

    /* ---------------------------------------------------------------- *
     *  Changing a password                                              *
     * ---------------------------------------------------------------- */

    public function test_changing_a_password_requires_the_current_one(): void
    {
        $student = $this->student();

        $this->as($student)->patchJson('/api/my/password', [
            'current' => 'not-the-password',
            'password' => 'a-brand-new-one',
            'password_confirmation' => 'a-brand-new-one',
        ])->assertStatus(422)->assertJsonValidationErrors('current');

        // Someone who walked up to an unlocked browser changed nothing.
        $this->assertTrue(Hash::check('student-password', $student->fresh()->password));
    }

    public function test_a_new_password_must_be_long_enough_and_confirmed(): void
    {
        $student = $this->student();

        $this->as($student)->patchJson('/api/my/password', [
            'current' => 'student-password',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->as($student)->patchJson('/api/my/password', [
            'current' => 'student-password',
            'password' => 'a-brand-new-one',
            'password_confirmation' => 'mistyped-the-second-time',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('student-password', $student->fresh()->password));
    }

    public function test_changing_a_password_ends_every_other_session_but_not_this_one(): void
    {
        $student = $this->student(['email' => 'rafi@example.net']);
        $thisDevice = $this->tokenFor($student, 'this-device');
        $otherDevice = $this->tokenFor($student, 'other-device');

        $this->withToken($thisDevice)->patchJson('/api/my/password', [
            'current' => 'student-password',
            'password' => 'a-brand-new-one',
            'password_confirmation' => 'a-brand-new-one',
        ])->assertOk();

        // Changing a password is how someone answers "I think that other
        // device is compromised". It would be no use at all if the other
        // device kept its token.
        $this->withToken($otherDevice)->getJson('/api/me')->assertStatus(401);
        $this->withToken($thisDevice)->getJson('/api/me')->assertOk();

        $this->assertTrue(Hash::check('a-brand-new-one', $student->fresh()->password));

        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'student-password',
        ])->assertStatus(422);

        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'a-brand-new-one',
        ])->assertOk();
    }

    public function test_a_password_cannot_be_changed_without_signing_in(): void
    {
        $this->patchJson('/api/my/password', [
            'current' => 'student-password',
            'password' => 'a-brand-new-one',
            'password_confirmation' => 'a-brand-new-one',
        ])->assertStatus(401);
    }

    /* ---------------------------------------------------------------- *
     *  The development door                                             *
     * ---------------------------------------------------------------- */

    public function test_open_sign_in_is_off_while_the_tests_run(): void
    {
        $this->assertFalse(config('auth.open_login'));
    }

    public function test_open_sign_in_can_never_be_switched_on_in_production(): void
    {
        // The switch itself, re-read with the environment it guards against.
        // DEV_OPEN_LOGIN=true is deliberate here: the point is that being
        // deliberate is not enough once APP_ENV says production.
        $inProduction = $this->withEnv(
            ['APP_ENV' => 'production', 'DEV_OPEN_LOGIN' => 'true'],
            fn () => require config_path('auth.php')
        );
        $this->assertFalse($inProduction['open_login'], 'DEV_OPEN_LOGIN opened the door in production.');

        // The control: without this, the assertion above would also pass if
        // the setting had been deleted and the test were measuring nothing.
        $inDevelopment = $this->withEnv(
            ['APP_ENV' => 'local', 'DEV_OPEN_LOGIN' => 'true'],
            fn () => require config_path('auth.php')
        );
        $this->assertTrue($inDevelopment['open_login']);
    }

    public function test_open_sign_in_when_on_takes_any_password(): void
    {
        // Documenting the development door rather than approving of it: if
        // this ever stops being true the behaviour changed, and if it starts
        // being true with the config off, something far worse happened.
        config(['auth.open_login' => true]);
        $student = $this->student(['email' => 'rafi@example.net']);

        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'nonsense',
        ])->assertOk()
            ->assertJsonPath('openLogin', true)
            ->assertJsonPath('user.id', $student->id);
    }

    public function test_open_sign_in_to_the_admin_never_resolves_a_student(): void
    {
        config(['auth.open_login' => true]);
        $staff = $this->staff();
        $this->student(['email' => 'rafi@example.net']);

        // The admin app asks for staff. Handing it a student would not be
        // open access, it would be a 403 from EnsureStaff a moment later.
        $this->postJson('/api/auth/login', [
            'email' => 'rafi@example.net',
            'password' => 'nonsense',
            'context' => 'staff',
        ])->assertOk()->assertJsonPath('user.id', $staff->id);
    }

    /* ---------------------------------------------------------------- *
     *  Helpers                                                          *
     * ---------------------------------------------------------------- */

    /**
     * Run $work with these environment variables in place, then put the
     * environment back exactly as it was, whatever $work did.
     */
    private function withEnv(array $variables, Closure $work): mixed
    {
        $saved = [];

        foreach ($variables as $key => $value) {
            $saved[$key] = [
                array_key_exists($key, $_ENV) ? $_ENV[$key] : null,
                array_key_exists($key, $_SERVER) ? $_SERVER[$key] : null,
                getenv($key),
            ];
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv("{$key}={$value}");
        }

        try {
            return $work();
        } finally {
            foreach ($saved as $key => [$env, $server, $put]) {
                if ($env === null) {
                    unset($_ENV[$key]);
                } else {
                    $_ENV[$key] = $env;
                }

                if ($server === null) {
                    unset($_SERVER[$key]);
                } else {
                    $_SERVER[$key] = $server;
                }

                if ($put === false) {
                    putenv($key);
                } else {
                    putenv("{$key}={$put}");
                }
            }
        }
    }
}
