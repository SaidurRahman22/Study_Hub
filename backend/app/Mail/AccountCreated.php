<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/*
 * To a new student: your file is open and here is how to watch it.
 *
 * The first password is in this email because the office sets it when it
 * creates the account, and the student has no other way to learn it. It is
 * therefore a one-time secret in a mailbox: the message says to change it,
 * and it is never sent again.
 */
class AccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $student,
        public string $password,
        public string $portalUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Study Hub BD student portal');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.account-created',
            with: [
                'student' => $this->student,
                'password' => $this->password,
                'portalUrl' => $this->portalUrl,
            ],
        );
    }
}
