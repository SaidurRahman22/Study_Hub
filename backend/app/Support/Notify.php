<?php

namespace App\Support;

use App\Mail\CarriesCredentials;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/*
 * Every automated email goes out through here.
 *
 * Two rules it exists to keep:
 *
 *  1. An email must never break the thing that caused it. A student whose
 *     account was created does not care that the mail server was down; the
 *     account is still created and the failure goes to the log instead of
 *     coming back as a 500.
 *  2. Nothing is sent to an address the office invented. `enquiries` lets a
 *     caller leave an email out, and we fill a placeholder so the row can be
 *     saved; those placeholders must not be mailed.
 *
 * In development MAIL_MAILER=log, so every message lands in
 * storage/logs/laravel.log and nothing leaves the machine. On the VPS, set
 * real SMTP credentials and switch the send below to queue() with a worker
 * running, so SMTP latency is off the request.
 */
class Notify
{
    /** Addresses we generate ourselves when a form left the field empty. */
    private const PLACEHOLDER_DOMAINS = ['no-email.local', 'example.com', 'example.test'];

    public static function mail(?string $to, object $mailable): void
    {
        if (! self::sendable($to)) {
            return;
        }

        /* The log mailer writes the whole rendered body to
         * storage/logs/laravel.log. That is fine for an announcement and not
         * fine for a password, which would then sit in an unrotated file, in
         * every backup of it, and in anything that ships those logs onward.
         * Refuse rather than quietly leak, and say so loudly enough that the
         * missing email is not a mystery. */
        if ($mailable instanceof CarriesCredentials && config('mail.default') === 'log') {
            Log::warning('Credential email NOT sent: the log mailer would write the password to disk.', [
                'to' => $to,
                'mailable' => $mailable::class,
                'fix' => 'Set a real MAIL_MAILER, or hand the password over in person.',
            ]);

            return;
        }

        try {
            Mail::to($to)->send($mailable);
        } catch (\Throwable $e) {
            // The caller's work is already done and must not be undone.
            Log::warning('Notification email failed', [
                'to' => $to,
                'mailable' => $mailable::class,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /** The office's own inbox, for "someone has enquired" style mail. */
    public static function office(object $mailable): void
    {
        self::mail(config('mail.office_address'), $mailable);
    }

    private static function sendable(?string $to): bool
    {
        if (! $to || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $domain = strtolower(substr(strrchr($to, '@') ?: '', 1));

        return ! in_array($domain, self::PLACEHOLDER_DOMAINS, true);
    }
}
