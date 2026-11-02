<x-mail::message>
# {{ $document->name }}

@if ($accepted)
We have checked this and it is accepted. Nothing more to do on it.
@elseif ($document->status === 'rejected')
We have looked at this and it needs doing again.
@else
We still need this one before the file can go forward.
@endif

@if ($document->note)
**What we need**

> {{ $document->note }}
@endif

<x-mail::button :url="$portalUrl">See it in the portal</x-mail::button>

If you are not sure what is wanted, write to us on the Messages screen and ask. It is quicker than sending the wrong thing twice.

Study Hub BD
</x-mail::message>
