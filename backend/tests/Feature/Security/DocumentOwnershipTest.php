<?php

namespace Tests\Feature\Security;

use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Monolog\Handler\TestHandler;
use Tests\Concerns\MakesPortalUsers;
use Tests\TestCase;

/*
 * Whose file is this?
 *
 * The documents here are passport scans, bank statements and medical
 * certificates. They sit on a disk outside the web root and are only ever
 * released by a controller that checks who is asking, so every route that
 * touches one has to answer the ownership question itself — there is no
 * policy class doing it in one place, which is exactly why it is worth
 * holding each route to it separately.
 *
 * Four properties:
 *
 *  1. A student reaches their own documents and no others, and the answer
 *     for someone else's is 404, not 403 — a 403 confirms the id exists.
 *  2. A staff URL names both the student and the document, and the two have
 *     to agree, so swapping one id in the address bar reaches nothing.
 *  3. What gets written to disk is decided here, not by the uploader: the
 *     folder, the filename and the extension.
 *  4. Every touch of a file is recorded, because "who has opened mine?" has
 *     to have an answer and after the fact is too late to start collecting.
 */
class DocumentOwnershipTest extends TestCase
{
    use MakesPortalUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /* ---------------------------------------------------------------- *
     *  A student and their own file                                     *
     * ---------------------------------------------------------------- */

    public function test_a_student_sees_only_their_own_documents(): void
    {
        $rafi = $this->student();
        $nadia = $this->student();

        $this->documentFor($rafi, ['name' => 'Rafi passport']);
        $this->documentFor($nadia, ['name' => 'Nadia passport']);

        $response = $this->as($rafi)->getJson('/api/my/documents')->assertOk();

        $this->assertCount(1, $response->json());
        $this->assertSame('Rafi passport', $response->json('0.name'));
    }

    public function test_a_student_downloads_their_own_document(): void
    {
        $rafi = $this->student();
        $document = $this->givenAFile($rafi, 'the scanned page');

        $response = $this->as($rafi)
            ->get("/api/my/documents/{$document->id}/download")
            ->assertOk();

        $this->assertSame('the scanned page', $response->streamedContent());
    }

    public function test_a_student_cannot_download_another_students_document(): void
    {
        $rafi = $this->student();
        $nadia = $this->student();
        $hers = $this->givenAFile($nadia, 'her bank statement');

        // 404, not 403: a 403 would confirm that document id exists and
        // belongs to somebody, which is half of what an attacker wants.
        $this->as($rafi)
            ->getJson("/api/my/documents/{$hers->id}/download")
            ->assertStatus(404);
    }

    public function test_a_student_cannot_upload_into_another_students_document(): void
    {
        $rafi = $this->student();
        $nadia = $this->student();
        $hers = $this->documentFor($nadia, ['status' => 'needed']);

        $this->as($rafi)->post("/api/my/documents/{$hers->id}/upload", [
            'file' => UploadedFile::fake()->image('passport.jpg'),
        ])->assertStatus(404);

        $this->assertNull($hers->fresh()->path);
        $this->assertSame('needed', $hers->fresh()->status);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_an_upload_lands_in_the_owners_own_folder_and_goes_back_for_review(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi, ['status' => 'needed']);

        $this->as($rafi)->post("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('passport.jpg'),
        ])->assertOk()->assertJsonPath('status', 'review');

        $path = $document->fresh()->path;

        $this->assertStringStartsWith("documents/{$rafi->id}/", $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_an_upload_needs_a_signed_in_student(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        $this->postJson("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('passport.jpg'),
        ])->assertStatus(401);
    }

    public function test_a_document_row_with_no_file_cannot_be_downloaded(): void
    {
        $rafi = $this->student();
        $asked = $this->documentFor($rafi, ['status' => 'needed']);

        // A row with no file is the office ASKING for something, not a file.
        $this->as($rafi)
            ->getJson("/api/my/documents/{$asked->id}/download")
            ->assertStatus(404);
    }

    /* ---------------------------------------------------------------- *
     *  What reaches the disk                                            *
     * ---------------------------------------------------------------- */

    public function test_the_stored_extension_comes_from_the_file_not_from_its_name(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        // A real JPEG handed over under a PDF name, written to disk rather
        // than made with UploadedFile::fake(): a fake reports the mime type
        // its NAME implies, which is the one thing this test is about, so a
        // faked file would agree with itself and prove nothing.
        //
        // The extension on disk decides the content type the day anything
        // serves this folder, and it is what any extension-based malware or
        // DLP sweep reads, so it has to come from the bytes.
        $this->as($rafi)->post("/api/my/documents/{$document->id}/upload", [
            'file' => $this->aRealJpegCalled('passport.pdf'),
        ])->assertOk();

        $extension = pathinfo($document->fresh()->path, PATHINFO_EXTENSION);

        $this->assertContains($extension, ['jpg', 'jpeg'], "a JPEG called passport.pdf was stored as .{$extension}");
    }

    public function test_a_file_named_like_a_script_is_refused(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        $this->as($rafi)->postJson("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('shell.php'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_the_uploaders_filename_never_becomes_a_path(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        $this->as($rafi)->post("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('../../../escaped.jpg'),
        ])->assertOk();

        $document = $document->fresh();

        $this->assertStringStartsWith("documents/{$rafi->id}/", $document->path);
        $this->assertStringNotContainsString('..', $document->path);
        $this->assertStringNotContainsString('/', (string) $document->original_name);
    }

    public function test_a_file_type_the_office_does_not_accept_is_refused(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        $this->as($rafi)->postJson("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->createWithContent('notes.txt', 'plain text'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_a_file_over_ten_megabytes_is_refused(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        // Real JPEG content so the type rule passes and only the size rule
        // is under test.
        $this->as($rafi)->postJson("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('huge.jpg')->size(11000),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_replacing_a_file_removes_the_one_it_replaces(): void
    {
        $rafi = $this->student();
        $document = $this->documentFor($rafi);

        $this->as($rafi)->post("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('first.jpg'),
        ])->assertOk();
        $first = $document->fresh()->path;

        $this->as($rafi)->post("/api/my/documents/{$document->id}/upload", [
            'file' => UploadedFile::fake()->image('second.jpg'),
        ])->assertOk();
        $second = $document->fresh()->path;

        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);
    }

    public function test_the_private_path_is_never_in_a_response(): void
    {
        $rafi = $this->student();
        $document = $this->givenAFile($rafi);

        $mine = $this->as($rafi)->getJson('/api/my/documents')->assertOk();
        $this->assertArrayNotHasKey('path', $mine->json('0'));
        $mine->assertDontSee($document->path);

        $staff = $this->staff();
        $seen = $this->as($staff)->getJson("/api/students/{$rafi->id}")->assertOk();
        $seen->assertDontSee($document->path);
    }

    /* ---------------------------------------------------------------- *
     *  Staff URLs name two things, and they have to agree               *
     * ---------------------------------------------------------------- */

    public function test_staff_cannot_reach_a_document_through_another_students_url(): void
    {
        $staff = $this->staff();
        $rafi = $this->student();
        $nadia = $this->student();
        $hers = $this->givenAFile($nadia, 'her bank statement');

        // Her document, his id in the path. Every one of these is a 404.
        $this->as($staff)
            ->getJson("/api/students/{$rafi->id}/documents/{$hers->id}/download")
            ->assertStatus(404);

        $this->as($staff)
            ->patchJson("/api/students/{$rafi->id}/documents/{$hers->id}", ['status' => 'accepted'])
            ->assertStatus(404);

        $this->as($staff)
            ->deleteJson("/api/students/{$rafi->id}/documents/{$hers->id}")
            ->assertStatus(404);

        $hers = $hers->fresh();
        $this->assertNotNull($hers, 'the document was deleted through the wrong student url');
        $this->assertNotSame('accepted', $hers->status);
        Storage::disk('local')->assertExists($hers->path);
    }

    public function test_staff_reach_a_document_through_its_own_students_url(): void
    {
        $staff = $this->staff();
        $nadia = $this->student();
        $hers = $this->givenAFile($nadia, 'her bank statement');

        // The control for the test above: the same three calls, correctly
        // addressed, all work — so the 404s there are about the mismatch and
        // not about staff being unable to do this at all.
        $this->as($staff)
            ->get("/api/students/{$nadia->id}/documents/{$hers->id}/download")
            ->assertOk();

        $this->as($staff)
            ->patchJson("/api/students/{$nadia->id}/documents/{$hers->id}", ['status' => 'accepted'])
            ->assertOk();

        $this->assertSame('accepted', $hers->fresh()->status);

        $this->as($staff)
            ->deleteJson("/api/students/{$nadia->id}/documents/{$hers->id}")
            ->assertOk();

        $this->assertNull(Document::find($hers->id));
    }

    public function test_a_student_cannot_use_the_staff_document_routes(): void
    {
        $rafi = $this->student();
        $own = $this->givenAFile($rafi);

        // Not even against their own file: these routes carry the staff
        // verdict on a document, and a student setting it would be deciding
        // their own application.
        $this->as($rafi)
            ->patchJson("/api/students/{$rafi->id}/documents/{$own->id}", ['status' => 'accepted'])
            ->assertStatus(403);

        $this->as($rafi)
            ->deleteJson("/api/students/{$rafi->id}/documents/{$own->id}")
            ->assertStatus(403);

        $this->as($rafi)
            ->postJson("/api/students/{$rafi->id}/documents", ['name' => 'Mine', 'group' => 'application'])
            ->assertStatus(403);

        // givenAFile() leaves the document awaiting the office's verdict.
        $this->assertSame('review', $own->fresh()->status);
    }

    public function test_deleting_a_student_takes_their_files_off_the_disk(): void
    {
        $staff = $this->staff();
        $rafi = $this->student();
        $document = $this->givenAFile($rafi);
        $path = $document->path;

        $this->as($staff)->deleteJson("/api/students/{$rafi->id}")->assertOk();

        // The row cascades away with the user. If the file did not go first,
        // a passport scan would be left on disk with nothing pointing at it:
        // invisible to the office, outside any retention process, and
        // impossible to prove deleted if anyone ever asks.
        Storage::disk('local')->assertMissing($path);
        $this->assertNull(Document::find($document->id));
    }

    /* ---------------------------------------------------------------- *
     *  The record of who looked                                         *
     * ---------------------------------------------------------------- */

    public function test_every_download_is_written_to_the_document_log(): void
    {
        $rafi = $this->student();
        $document = $this->givenAFile($rafi);
        $entries = $this->captureDocumentLog();

        $this->as($rafi)->get("/api/my/documents/{$document->id}/download")->assertOk();

        $this->assertTrue($entries->hasInfoThatContains('download'), 'the download was not recorded');

        $context = collect($entries->getRecords())
            ->first(fn ($record) => $record->message === 'download')
            ->context;

        $this->assertSame($document->id, $context['document_id']);
        $this->assertSame($rafi->id, $context['owner_id']);
        $this->assertSame($rafi->id, $context['actor_id']);
        $this->assertTrue($context['own_file']);

        // The record says who looked, never what they looked at.
        $this->assertArrayNotHasKey('path', $context);
        $this->assertStringNotContainsString($document->path, json_encode($context));
    }

    public function test_staff_opening_a_students_file_is_recorded_as_not_their_own(): void
    {
        $staff = $this->staff();
        $rafi = $this->student();
        $document = $this->givenAFile($rafi);
        $entries = $this->captureDocumentLog();

        $this->as($staff)
            ->get("/api/students/{$rafi->id}/documents/{$document->id}/download")
            ->assertOk();

        $context = collect($entries->getRecords())
            ->first(fn ($record) => $record->message === 'download')
            ->context;

        $this->assertSame($staff->id, $context['actor_id']);
        $this->assertSame('staff', $context['actor_role']);
        $this->assertSame($rafi->id, $context['owner_id']);
        $this->assertFalse($context['own_file'], 'staff reading a student file looked like self-access');
    }

    /* ---------------------------------------------------------------- *
     *  Fixtures                                                         *
     * ---------------------------------------------------------------- */

    /** A document with a real file behind it on the faked private disk. */
    private function givenAFile($owner, string $contents = 'file contents'): Document
    {
        $path = "documents/{$owner->id}/".bin2hex(random_bytes(8)).'.pdf';
        Storage::disk('local')->put($path, $contents);

        return $this->documentFor($owner, [
            'status' => 'review',
            'path' => $path,
            'original_name' => 'passport.pdf',
            'size' => strlen($contents),
            'mime' => 'application/pdf',
        ]);
    }

    /**
     * A genuine JPEG on disk, under whatever name is asked for, so the mime
     * type has to be sniffed from the bytes the way it is in production.
     */
    private function aRealJpegCalled(string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'studyhub-test-');
        $image = imagecreatetruecolor(10, 10);
        imagejpeg($image, $path);
        imagedestroy($image);

        $this->beforeApplicationDestroyed(fn () => @unlink($path));

        // The last argument marks it a test upload, so it is accepted
        // without having arrived through a real multipart POST.
        return new UploadedFile($path, $name, 'application/pdf', null, true);
    }

    /**
     * Point the documents channel at an in-memory handler, so the audit
     * trail can be read back without writing a real log file.
     */
    private function captureDocumentLog(): TestHandler
    {
        config(['logging.channels.documents' => [
            'driver' => 'monolog',
            'handler' => TestHandler::class,
        ]]);

        // Resolving it here caches the channel, so the controller writes into
        // this same handler rather than building its own.
        return Log::channel('documents')->getLogger()->getHandlers()[0];
    }
}
