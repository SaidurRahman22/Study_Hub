<x-mail::message>
# {{ $when ? 'Consultation booked' : 'New enquiry' }}

**{{ $enquiry->name }}**
{{ $enquiry->email }}
@if ($enquiry->phone)
{{ $enquiry->phone }}
@endif

@if ($when)
**When:** {{ $when }} ({{ config('app.office_timezone') }}){{ $enquiry->online ? ', online' : ', at the office' }}
@if ($enquiry->timezone && $enquiry->timezone !== config('app.office_timezone'))
**Their timezone:** {{ $enquiry->timezone }}
@endif
@endif

@if ($enquiry->destination)
**Destination:** {{ $enquiry->destination }}
@endif
@if ($enquiry->need)
**Needs:** {{ $enquiry->need }}
@endif
**Came from:** {{ $enquiry->source }}

@if ($enquiry->message)
> {{ $enquiry->message }}
@endif

It is already in the admin under Bookings, marked new.
</x-mail::message>
