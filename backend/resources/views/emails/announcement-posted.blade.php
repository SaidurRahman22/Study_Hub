<x-mail::message>
# {{ $announcement->title }}

@if ($announcement->body)
{{ $announcement->body }}
@endif

<x-mail::button :url="$portalUrl">Open the portal</x-mail::button>

Study Hub BD
</x-mail::message>
