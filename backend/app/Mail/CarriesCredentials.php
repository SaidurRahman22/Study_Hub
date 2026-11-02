<?php

namespace App\Mail;

/*
 * Marks a mailable whose body contains a credential.
 *
 * Notify refuses to send one of these through the `log` mailer, because that
 * mailer writes the fully rendered message into storage/logs/laravel.log. A
 * password in a log file outlives the email by years: it survives in backups,
 * in whatever a developer pastes into a bug report, and in any log shipper
 * added later. The log is not rotated here and LOG_LEVEL is debug, so nothing
 * ages out of it either.
 *
 * This is a guard, not the real answer. The real answer is to stop mailing
 * passwords at all and send a one-time setup link instead, at which point
 * this interface and its checks can go.
 */
interface CarriesCredentials
{
}
