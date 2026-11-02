<?php

namespace App\Mail;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To the person who filled in the contact form: we have it, here is when
 *  you will hear back, and here is what you sent us. */
class EnquiryReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enquiry $enquiry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->enquiry->scheduled_at
                ? 'Your consultation with Study Hub BD'
                : 'We have your enquiry',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.enquiry-received',
            with: [
                'enquiry' => $this->enquiry,
                'when' => $this->enquiry->scheduled_at
                    ?->setTimezone($this->enquiry->timezone ?: config('app.office_timezone'))
                    ->format('l j F Y, g:ia'),
                'zone' => $this->enquiry->timezone ?: config('app.office_timezone'),
            ],
        );
    }
}
