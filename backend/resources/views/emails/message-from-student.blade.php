<x-mail::message>
# {{ $message->author }} has written

@if ($student?->student_code)
File {{ $student->student_code }}@if ($student->counsellor), counsellor {{ $student->counsellor }}@endif.
@endif

> {{ $message->body }}

<x-mail::button :url="$adminUrl">Answer in the admin</x-mail::button>
</x-mail::message>
