<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Sign in. Returns a Sanctum token and the user. Students and staff use
     *  the same endpoint; the role in the payload tells the app which it is. */
    public function login(Request $request): JsonResponse
    {
        if (config('auth.open_login')) {
            return $this->openLogin($request);
        }

        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $this->ensureNotLockedOut($request);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($this->throttleKey($request), self::LOCKOUT_SECONDS);

            // Logged so repeated failures against one account are visible.
            // The password itself is never written down, right or wrong.
            Log::warning('Failed sign-in', [
                'email' => $data['email'],
                'ip' => $request->ip(),
            ]);

            throw ValidationException::withMessages([
                'email' => 'Those details do not match our records.',
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user),
        ]);
    }

    /* How many wrong passwords for one account, from one place, before it
     * stops answering, and for how long. This is the per-account half of the
     * defence; the per-IP half is the throttle:login middleware on the route.
     * A lockout on its own is walked around by trying one password against a
     * thousand emails, and an IP limit on its own by using a thousand IPs. */
    private const MAX_ATTEMPTS = 5;

    private const LOCKOUT_SECONDS = 900; // 15 minutes

    /* Keyed on the email being tried AND where it is being tried from, so one
     * attacker cannot lock a real student out of their own account by failing
     * on purpose. That is the trade: this will not stop a distributed grind
     * against one account, which is what the IP throttle and, later, 2FA are
     * for, but it never lets an outsider deny a student their own sign-in. */
    private function throttleKey(Request $request): string
    {
        return 'login:'.Str::transliterate(
            Str::lower((string) $request->input('email')).'|'.$request->ip()
        );
    }

    private function ensureNotLockedOut(Request $request): void
    {
        $key = $this->throttleKey($request);

        if (! RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            return;
        }

        $seconds = RateLimiter::availableIn($key);
        $minutes = (int) ceil($seconds / 60);

        throw ValidationException::withMessages([
            'email' => "Too many failed attempts for this account. Try again in {$minutes} minute".($minutes === 1 ? '' : 's').'.',
        ])->status(429);
    }

    /* Development sign-in with the password check skipped, so any input gets
     * into the app. A real email signs in as that person; anything else, or
     * nothing at all, signs in as the demo student, because an account that
     * does not exist has no application, documents or messages for the portal
     * to show, and an empty portal would look broken rather than open.
     *
     * Reached only when config('auth.open_login') is true, which needs
     * DEV_OPEN_LOGIN in .env and a non-production APP_ENV. */
    private function openLogin(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email', ''));

        /* The admin sends context=staff, because the two apps need different
         * answers to "anything". Signing in to the admin as a student is not
         * open access, it is a 403 from EnsureStaff a moment later, so in that
         * case we resolve to a staff account whatever was typed. */
        $wantStaff = $request->input('context') === 'staff';

        $match = $email !== '' ? User::where('email', $email)->first() : null;

        if ($wantStaff && (! $match || ! $match->isStaff())) {
            $match = null;
        }

        $fallback = $wantStaff
            ? User::whereIn('role', ['admin', 'staff'])->oldest('id')->first()
            : User::where('role', 'student')->oldest('id')->first();

        $user = $match ?? $fallback ?? User::oldest('id')->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Open sign-in is on, but there are no accounts to sign in as. Run: php artisan db:seed',
            ]);
        }

        $token = $user->createToken('web-open')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user),
            'openLogin' => true,
        ]);
    }

    /* A student changing their own password.
     *
     * This existed nowhere until now, while the account-created email told
     * every new student to "change that password the first time you sign
     * in". The only password route in the API was the staff reset, so the
     * password the office typed was the password forever.
     *
     * The current one is required, so someone who walks up to an unlocked
     * browser cannot lock the owner out of their own account. */
    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current'], $user->password)) {
            throw ValidationException::withMessages([
                'current' => 'That is not your current password.',
            ]);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        /* Every other session is ended, this one kept. Changing a password is
         * usually how someone responds to thinking a device is compromised,
         * and it would be no use at all if the other device kept its token. */
        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current->id)->delete();

        return response()->json(['ok' => true]);
    }

    /** Sign out: revoke the token used for this request. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    /** The signed-in user. */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'studentId' => $user->student_code,
        ];
    }
}
