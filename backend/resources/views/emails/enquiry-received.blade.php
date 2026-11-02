<x-mail::message>
# Thank you, {{ $enquiry->name }}

@if ($when)
Your consultation is booked for **{{ $when }}** ({{ $zone }}){{ $enquiry->online ? ', online' : ', at our office' }}.

We will send the joining details, or the office address, before then. If that time no longer suits you, reply to this email and we will move it.
@else
We have your enquiry and a counsellor will come back to you within one working day.
@endif

@if ($enquiry->destination || $enquiry->need)
**What you told us**

@if ($enquiry->destination)
- Where you want to study: {{ $enquiry->destination }}
@endif
@if ($enquiry->need)
- What you need help with: {{ $enquiry->need }}
@endif
@endif

@if ($enquiry->message)
> {{ $enquiry->message }}
@endif

If anything above is wrong, just reply and tell us.

Study Hub BD
</x-mail::message>
