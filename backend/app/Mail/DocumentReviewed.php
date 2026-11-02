<?php

namespace App\Mail;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To the student: the office has looked at a document. Only sent when the
 *  verdict is one the student has to act on or will be glad to read. */
class DocumentReviewed extends Mailable
{
    use Queueable, SerializesModels;

    /** How each status reads in a subject line. */
    private const HEADLINE = [
        'accepted' => 'accepted',
        'rejected' => 'sent back',
        'needed' => 'still needed',
    ];

    public function __construct(public Document $document, public string $portalUrl) {}

    public function envelope(): Envelope
    {
        $verdict = self::HEADLINE[$this->document->status] ?? 'updated';

        return new Envelope(subject: "{$this->document->name}: {$verdict}");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.document-reviewed',
            with: [
                'document' => $this->document,
                'portalUrl' => $this->portalUrl,
                'accepted' => $this->document->status === 'accepted',
            ],
        );
    }
}
