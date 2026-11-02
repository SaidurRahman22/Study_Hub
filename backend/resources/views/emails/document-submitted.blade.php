<x-mail::message>
# Waiting to be checked

**{{ $student?->name ?? 'A student' }}**@if ($student?->student_code) ({{ $student->student_code }})@endif sent in **{{ $document->name }}**@if ($document->humanSize()), {{ $document->humanSize() }}@endif.

It is in the {{ $document->group === 'visa' ? 'visa file' : 'university file' }}, marked as with Study Hub.

The file is not attached. Open it from the Documents screen in the admin, which is the only place it is released from.
</x-mail::message>
