<?php

namespace App\Mail;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To the office: a student has written and is waiting for an answer. */
class MessageFromStudent extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Message $message, public string $adminUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "{$this->message->author} has written to you");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.message-from-student',
            with: [
                'message' => $this->message,
                'adminUrl' => $this->adminUrl,
                'student' => $this->message->user,
            ],
        );
    }
}
