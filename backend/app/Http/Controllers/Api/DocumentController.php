<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/*
 * Student documents.
 *
 * Files go to the private disk (storage/app/private), never the web root, and
 * are only released through the download routes below, which check who is
 * asking. The stored filename is generated here; the name the student chose is
 * kept separately and never used as a path.
 */
class DocumentController extends Controller
{
    /** What the browser may send. Deliberately narrow. */
    private const FILE_RULES = [
        'file',
        'mimes:pdf,jpg,jpeg,png,webp',
        'max:10240', // 10 MB
    ];

    /* ---- staff ---- */

    /** Add a document to a student's file, with or without a file attached.
     *  Without one it reads as "the office is asking for this". */
    public function store(Request $request, User $student): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'group' => ['required', 'in:application,visa'],
            'status' => ['nullable', 'in:accepted,review,needed,rejected,later'],
            'note' => ['nullable', 'string', 'max:2000'],
            'file' => array_merge(['nullable'], self::FILE_RULES),
        ]);

        $doc = new Document([
            'user_id' => $student->id,
            'name' => $data['name'],
            'group' => $data['group'],
            'status' => $data['status'] ?? ($request->hasFile('file') ? 'review' : 'needed'),
            'note' => $data['note'] ?? null,
        ]);

        if ($request->hasFile('file')) {
            $this->attach($doc, $request, $student->id);
        }

        $doc->save();

        return response()->json($this->present($doc), 201);
    }

    /** Set the status, write feedback, or replace the file. */
    public function update(Request $request, User $student, Document $document): JsonResponse
    {
        abort_unless($document->user_id === $student->id, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'group' => ['sometimes', 'in:application,visa'],
            'status' => ['sometimes', 'in:accepted,review,needed,rejected,later'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'file' => array_merge(['nullable'], self::FILE_RULES),
        ]);

        foreach (['name', 'group', 'status', 'note'] as $field) {
            if (array_key_exists($field, $data)) {
                $document->{$field} = $data[$field];
            }
        }

        if ($request->hasFile('file')) {
            $this->attach($document, $request, $student->id);
        }

        $document->save();

        return response()->json($this->present($document));
    }

    public function destroy(User $student, Document $document): JsonResponse
    {
        abort_unless($document->user_id === $student->id, 404);
        $this->deleteFile($document);
        $document->delete();

        return response()->json(['ok' => true]);
    }

    public function download(User $student, Document $document): StreamedResponse
    {
        abort_unless($document->user_id === $student->id, 404);

        return $this->stream($document);
    }

    /* ---- student (self) ---- */

    public function mine(Request $request): JsonResponse
    {
        $docs = $request->user()->documents->map(fn (Document $d) => $this->present($d));

        return response()->json($docs->values());
    }

    /** The student sends in a file for something the office asked for. */
    public function upload(Request $request, Document $document): JsonResponse
    {
        abort_unless($document->user_id === $request->user()->id, 404);

        $request->validate(['file' => array_merge(['required'], self::FILE_RULES)]);

        $this->attach($document, $request, $request->user()->id);
        // Back to the office to look at, whatever it was before.
        $document->status = 'review';
        $document->save();

        return response()->json($this->present($document));
    }

    public function myDownload(Request $request, Document $document): StreamedResponse
    {
        abort_unless($document->user_id === $request->user()->id, 404);

        return $this->stream($document);
    }

    /* ---- internals ---- */

    /** Store the upload under a generated name and drop the previous file. */
    private function attach(Document $doc, Request $request, int $ownerId): void
    {
        $file = $request->file('file');
        $this->deleteFile($doc);

        $stored = "documents/{$ownerId}/".Str::uuid().'.'.$file->getClientOriginalExtension();
        Storage::disk('local')->putFileAs(
            dirname($stored),
            $file,
            basename($stored)
        );

        $doc->path = $stored;
        $doc->original_name = $file->getClientOriginalName();
        $doc->size = $file->getSize();
        $doc->mime = $file->getMimeType();
        $doc->uploaded_by = $request->user()?->id;
    }

    private function deleteFile(Document $doc): void
    {
        if ($doc->path && Storage::disk('local')->exists($doc->path)) {
            Storage::disk('local')->delete($doc->path);
        }
    }

    private function stream(Document $document): StreamedResponse
    {
        abort_if(! $document->path || ! Storage::disk('local')->exists($document->path), 404, 'No file on this document.');

        return Storage::disk('local')->download(
            $document->path,
            $document->original_name ?: $document->name
        );
    }

    /** The shape the screens expect. `path` is never exposed. */
    private function present(Document $d): array
    {
        return [
            'id' => (string) $d->id,
            'name' => $d->name,
            'group' => $d->group,
            'status' => $d->status,
            'file' => $d->original_name,
            'size' => $d->humanSize(),
            'updated' => $d->updated_at?->toDateString(),
            'note' => $d->note,
            'hasFile' => (bool) $d->path,
        ];
    }
}
