<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AnnouncementPosted;
use App\Models\Announcement;
use App\Models\User;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * Things the office tells students about: a document checked, a stage
 * reached, or a word to everyone.
 *
 * A null user_id means everyone. The portal decides what counts as unread
 * from a timestamp it keeps on the reader's own device, so there is no read
 * table here: one row serves every student who can see it.
 */
class AnnouncementController extends Controller
{
    /* ---- staff ---- */

    /** Everything posted, newest first, for the admin's list. */
    public function index(): JsonResponse
    {
        $rows = Announcement::with('user')->latest()->limit(200)->get();

        return response()->json($rows->map(fn (Announcement $a) => $this->present($a, true))->values());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            // "all" or a student's id. Anything else is refused rather than
            // quietly posted to everyone.
            'audience' => ['required', 'string'],
            'kind' => ['nullable', 'in:document,stage,message,announcement'],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'href' => ['nullable', 'string', 'max:255'],
        ]);

        $toEveryone = $data['audience'] === 'all';
        $student = $toEveryone ? null : User::where('role', 'student')->findOrFail($data['audience']);

        $announcement = Announcement::create([
            'user_id' => $student?->id,
            'kind' => $data['kind'] ?? 'announcement',
            'title' => $data['title'],
            'body' => $data['body'] ?? null,
            'href' => $data['href'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $link = config('app.portal_url').'/student';
        if ($student) {
            Notify::mail($student->email, new AnnouncementPosted($announcement, $link));
        } else {
            // One email each. The list is small and the office posts to
            // everyone rarely; if that changes this belongs on a queue.
            User::where('role', 'student')->cursor()->each(
                fn (User $u) => Notify::mail($u->email, new AnnouncementPosted($announcement, $link))
            );
        }

        return response()->json($this->present($announcement->load('user'), true), 201);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['ok' => true]);
    }

    /* ---- student (self) ---- */

    public function mine(Request $request): JsonResponse
    {
        $rows = Announcement::visibleTo($request->user())->latest()->limit(100)->get();

        return response()->json($rows->map(fn (Announcement $a) => $this->present($a))->values());
    }

    /* ---- shaping ---- */

    private function present(Announcement $a, bool $forStaff = false): array
    {
        $shape = [
            'id' => (string) $a->id,
            'kind' => $a->kind,
            'title' => $a->title,
            'body' => $a->body,
            'at' => $a->created_at?->toISOString(),
            'href' => $a->href,
        ];

        if ($forStaff) {
            // The admin's list needs to say who it went to.
            $shape['audience'] = $a->user_id ? (string) $a->user_id : 'all';
            $shape['audienceName'] = $a->user?->name ?? 'Everyone';
        }

        return $shape;
    }
}
