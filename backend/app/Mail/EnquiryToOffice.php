<?php

namespace App\Mail;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** To the office: a new lead, with everything needed to ring them back
 *  without opening the admin. */
class EnquiryToOffice extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enquiry $enquiry) {}

    public function envelope(): Envelope
    {
        $what = $this->enquiry->scheduled_at ? 'Consultation booked' : 'New enquiry';

        return new Envelope(
            subject: "{$what}: {$this->enquiry->name}",
            replyTo: filter_var($this->enquiry->email, FILTER_VALIDATE_EMAIL)
                ? [$this->enquiry->email]
                : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.enquiry-to-office',
            with: [
                'enquiry' => $this->enquiry,
                'when' => $this->enquiry->scheduled_at
                    ?->setTimezone(config('app.office_timezone'))
                    ->format('l j F Y, g:ia'),
            ],
        );
    }
}
