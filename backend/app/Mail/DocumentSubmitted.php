<?php

namespace App\Mail;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To the office: a student has sent a file in and it is waiting to be
 *  checked. The file itself is not attached; it stays on the private disk. */
class DocumentSubmitted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Document $document) {}

    public function envelope(): Envelope
    {
        $who = $this->document->user?->name ?? 'A student';

        return new Envelope(subject: "{$who} sent in: {$this->document->name}");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.document-submitted',
            with: ['document' => $this->document, 'student' => $this->document->user],
        );
    }
}
