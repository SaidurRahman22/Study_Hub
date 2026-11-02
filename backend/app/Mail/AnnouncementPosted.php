<?php

namespace App\Mail;

use App\Models\Announcement;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To a student: something the office wants them to know, either addressed
 *  to them or posted to everyone. */
class AnnouncementPosted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Announcement $announcement, public string $portalUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->announcement->title);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.announcement-posted',
            with: ['announcement' => $this->announcement, 'portalUrl' => $this->portalUrl],
        );
    }
}
