<x-mail::message>
# Your file is open, {{ $student->name }}

@if ($student->student_code)
Your file number is **{{ $student->student_code }}**. Quote it whenever you write or call.
@endif

The portal shows where your application has got to, which documents we still need, and anything we have said about them.

**Sign in with**

- Email: {{ $student->email }}
- Password: {{ $password }}

<x-mail::button :url="$portalUrl">Open the portal</x-mail::button>

Please change that password the first time you sign in. We will never ask you for it, by email or on the phone.

@if ($student->counsellor)
Your counsellor is {{ $student->counsellor }}. Write to them from the Messages screen and they will see it.
@endif

Study Hub BD
</x-mail::message>
