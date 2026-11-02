<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\MessageFromOffice;
use App\Mail\MessageFromStudent;
use App\Models\Message;
use App\Models\User;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * The one thread between a student and the office.
 *
 * There is no thread id anywhere: a student has exactly one conversation, so
 * the student is the thread. Staff read and write it through
 * /students/{student}/messages; the student reads and writes their own
 * through /my/messages and can reach no other.
 *
 * Nothing is attached to a message. Files belong on the documents screen,
 * where they are checked, given a status and kept on the private disk.
 */
class MessageController extends Controller
{
    private const BODY_RULES = ['required', 'string', 'max:5000'];

    /* ---- staff ---- */

    public function index(User $student): JsonResponse
    {
        return response()->json(
            $student->messages->map(fn (Message $m) => $this->present($m))->values()
        );
    }

    public function store(Request $request, User $student): JsonResponse
    {
        $data = $request->validate(['body' => self::BODY_RULES]);
        $staff = $request->user();

        $message = $student->messages()->create([
            'sender' => 'agency',
            'author' => $staff->name ?: 'Study Hub BD',
            'body' => $data['body'],
            'staff_id' => $staff->id,
        ]);

        Notify::mail(
            $student->email,
            new MessageFromOffice($message, config('app.portal_url').'/student/messages')
        );

        return response()->json($this->present($message), 201);
    }

    /* ---- student (self) ---- */

    public function mine(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->messages->map(fn (Message $m) => $this->present($m))->values()
        );
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate(['body' => self::BODY_RULES]);
        $student = $request->user();

        $message = $student->messages()->create([
            'sender' => 'student',
            'author' => $student->name,
            'body' => $data['body'],
        ]);

        // The office is told there is something to answer.
        Notify::office(new MessageFromStudent(
            $message->load('user'),
            config('app.portal_url').'/admin/students/messages'
        ));

        return response()->json($this->present($message), 201);
    }

    /* ---- shaping ---- */

    private function present(Message $m): array
    {
        return [
            'id' => (string) $m->id,
            'from' => $m->sender,
            'author' => $m->author,
            'at' => $m->created_at?->toISOString(),
            'body' => $m->body,
        ];
    }
}
