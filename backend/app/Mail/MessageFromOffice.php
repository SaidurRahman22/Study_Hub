<?php

namespace App\Mail;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/*
 * To the student: the office has written to you.
 *
 * The message body is included so the student can read it without signing
 * in. That is a deliberate choice: these are counselling messages, not
 * credentials, and an email the reader has to go somewhere else to read is an
 * email most people ignore. Anything confidential belongs in a document,
 * which is never attached to an email.
 */
class MessageFromOffice extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Message $message, public string $portalUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'A message from Study Hub BD');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.message-from-office',
            with: ['message' => $this->message, 'portalUrl' => $this->portalUrl],
        );
    }
}
