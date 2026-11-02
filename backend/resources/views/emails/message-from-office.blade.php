<x-mail::message>
# {{ $message->author }} has written to you

> {{ $message->body }}

<x-mail::button :url="$portalUrl">Reply in the portal</x-mail::button>

Replying there keeps the whole conversation in one place, where your counsellor can see it.

Study Hub BD
</x-mail::message>
