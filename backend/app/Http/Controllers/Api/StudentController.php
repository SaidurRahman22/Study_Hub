<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AccountCreated;
use App\Models\Announcement;
use App\Models\ApplicationStage;
use App\Models\CaseNote;
use App\Models\User;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    /** The six stages a new student starts with. */
    private const DEFAULT_STAGES = [
        ['name' => 'Counselling', 'state' => 'now', 'date_label' => 'Just started'],
        ['name' => 'Documents', 'state' => 'todo', 'date_label' => ''],
        ['name' => 'Application sent', 'state' => 'todo', 'date_label' => ''],
        ['name' => 'Offer received', 'state' => 'todo', 'date_label' => ''],
        ['name' => 'Visa file', 'state' => 'todo', 'date_label' => ''],
        ['name' => 'Departure', 'state' => 'todo', 'date_label' => ''],
    ];

    /* ---- staff ---- */

    public function index(): JsonResponse
    {
        $students = User::where('role', 'student')
            ->with(['stages', 'caseNotes', 'documents', 'messages'])
            ->latest()
            ->get()
            ->map(fn (User $u) => $this->present($u));

        return response()->json($students);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'studentId' => ['nullable', 'string', 'max:255', 'unique:users,student_code'],
            'phone' => ['nullable', 'string', 'max:50'],
            'counsellor' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'university' => ['nullable', 'string', 'max:255'],
            'course' => ['nullable', 'string', 'max:255'],
            'intake' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'student',
            'student_code' => $data['studentId'] ?? null,
            'phone' => $data['phone'] ?? null,
            'counsellor' => $data['counsellor'] ?? null,
            'country' => $data['country'] ?? null,
            'university' => $data['university'] ?? null,
            'course' => $data['course'] ?? null,
            'intake' => $data['intake'] ?? null,
        ]);

        foreach (self::DEFAULT_STAGES as $i => $stage) {
            $user->stages()->create([...$stage, 'position' => $i]);
        }

        // The student is told their file is open and how to sign in. This is
        // the only time the first password is sent anywhere.
        Notify::mail($user->email, new AccountCreated(
            $user,
            $data['password'],
            config('app.portal_url').'/student/login'
        ));

        return response()->json($this->present($user->fresh(['stages', 'caseNotes', 'documents', 'messages'])), 201);
    }

    public function show(User $student): JsonResponse
    {
        return response()->json($this->present($student->load(['stages', 'caseNotes', 'documents', 'messages'])));
    }

    public function update(Request $request, User $student): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$student->id],
            'phone' => ['nullable', 'string', 'max:50'],
            'counsellor' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'university' => ['nullable', 'string', 'max:255'],
            'course' => ['nullable', 'string', 'max:255'],
            'intake' => ['nullable', 'string', 'max:255'],
        ]);

        $student->update($data);

        return response()->json($this->present($student->fresh(['stages', 'caseNotes', 'documents', 'messages'])));
    }

    public function destroy(User $student): JsonResponse
    {
        /* Take the files before the database takes the rows that point at
         * them. documents.user_id cascades on delete, so the moment the user
         * row goes the `path` column goes with it, and the passport scans and
         * bank statements are left on disk with nothing referencing them:
         * invisible to the admin, outside any retention process, and
         * impossible to prove deleted if anyone ever asks. */
        foreach ($student->documents as $document) {
            if ($document->path && Storage::disk('local')->exists($document->path)) {
                Storage::disk('local')->delete($document->path);
            }
        }
        Storage::disk('local')->deleteDirectory("documents/{$student->id}");

        // personal_access_tokens is a morph table with no foreign key, so the
        // cascade does not reach it. Clear it or the rows outlive the user.
        $student->tokens()->delete();

        $student->delete();

        return response()->json(['ok' => true]);
    }

    public function setPassword(Request $request, User $student): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:8']]);
        $student->update(['password' => Hash::make($data['password'])]);

        /* The whole point of an administrative reset is usually that someone
         * else has the account. Leaving the old tokens alive means the person
         * you are locking out keeps their session, and nothing in the app
         * would ever close it. */
        $student->tokens()->delete();

        return response()->json(['ok' => true]);
    }

    public function updateStage(Request $request, User $student, int $stage): JsonResponse
    {
        $row = $student->stages()->findOrFail($stage);
        $data = $request->validate([
            'state' => ['sometimes', 'in:todo,now,done'],
            'when' => ['sometimes', 'nullable', 'string', 'max:255'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('state', $data)) {
            $row->state = $data['state'];
        }
        if (array_key_exists('when', $data)) {
            $row->date_label = $data['when'];
        }
        if (array_key_exists('note', $data)) {
            $row->note = $data['note'];
        }
        $row->save();

        return response()->json($this->presentStage($row));
    }

    public function addCaseNote(Request $request, User $student): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'in:todo,now,done'],
            'date' => ['nullable', 'string', 'max:255'],
        ]);

        $note = $student->caseNotes()->create([
            'title' => $data['title'],
            'body' => $data['body'] ?? '',
            'status' => $data['status'] ?? 'todo',
            'date_label' => $data['date'] ?? '',
        ]);

        return response()->json($this->presentNote($note), 201);
    }

    public function updateCaseNote(Request $request, User $student, CaseNote $note): JsonResponse
    {
        abort_unless($note->user_id === $student->id, 404);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'in:todo,now,done'],
            'date' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('date', $data)) {
            $data['date_label'] = $data['date'];
            unset($data['date']);
        }
        $note->update($data);

        return response()->json($this->presentNote($note));
    }

    public function deleteCaseNote(User $student, CaseNote $note): JsonResponse
    {
        abort_unless($note->user_id === $student->id, 404);
        $note->delete();

        return response()->json(['ok' => true]);
    }

    /* ---- student (self) ---- */

    public function myApplication(Request $request): JsonResponse
    {
        // Deliberately does NOT load caseNotes. Those are the office's own
        // notes ABOUT this student, written on staff-only routes, and they
        // hold the things you would never read out to the applicant: a
        // refusal history, a judgement about their finances, a view of how
        // the case is going. They are not loaded rather than merely not
        // shown, so a later edit to the shape cannot leak them by accident.
        return response()->json($this->present(
            $request->user()->load(['stages', 'documents', 'messages']),
            forStaff: false
        ));
    }

    /* ---- shaping ---- */

    /* One shape for two very different audiences, so $forStaff decides what
     * the office can see and the student cannot. */
    private function present(User $u, bool $forStaff = true): array
    {
        $shape = [
            'id' => $u->id,
            'studentId' => $u->student_code,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'counsellor' => $u->counsellor,
            'country' => $u->country,
            'university' => $u->university,
            'course' => $u->course,
            'intake' => $u->intake,
            'stages' => $u->stages->map(fn ($s) => $this->presentStage($s))->values(),
            'documents' => $u->documents->map(fn ($d) => [
                'id' => (string) $d->id,
                'name' => $d->name,
                'group' => $d->group,
                'status' => $d->status,
                'file' => $d->original_name,
                'size' => $d->humanSize(),
                'updated' => $d->updated_at?->setTimezone(config('app.office_timezone'))->toDateString(),
                'note' => $d->note,
                'hasFile' => (bool) $d->path,
            ])->values(),
            'messages' => $u->messages->map(fn ($m) => [
                'id' => (string) $m->id,
                'from' => $m->sender,
                'author' => $m->author,
                'at' => $m->created_at?->toISOString(),
                'body' => $m->body,
            ])->values(),
            'notifications' => Announcement::visibleTo($u)->latest()->limit(50)->get()
                ->map(fn ($a) => [
                    'id' => (string) $a->id,
                    'kind' => $a->kind,
                    'title' => $a->title,
                    'body' => $a->body,
                    'at' => $a->created_at?->toISOString(),
                    'href' => $a->href,
                ])->values(),
        ];

        // Staff only. The student's own endpoint passes forStaff: false.
        if ($forStaff) {
            $shape['caseNotes'] = $u->caseNotes->map(fn ($n) => $this->presentNote($n))->values();
        }

        return $shape;
    }

    private function presentStage(ApplicationStage $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'state' => $s->state,
            'when' => $s->date_label,
            'note' => $s->note,
        ];
    }

    private function presentNote(CaseNote $n): array
    {
        return [
            'id' => $n->id,
            'title' => $n->title,
            'body' => $n->body,
            'status' => $n->status,
            'date' => $n->date_label,
            'at' => $n->created_at?->toISOString(),
        ];
    }
}
