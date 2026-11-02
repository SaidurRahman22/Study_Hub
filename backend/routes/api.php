<?php

use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

/* ---- public ---- */
/* Both of these are unauthenticated, so the rate limit is the only thing
 * between them and a script. The limiters are defined in AppServiceProvider. */
Route::post('/enquiries', [EnquiryController::class, 'store'])
    ->middleware('throttle:enquiries');
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login');

/* ---- signed in (student or staff) ---- */
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // A student changing their own password. Requires the current one.
    Route::patch('/my/password', [AuthController::class, 'changePassword']);

    // A student's own application (the tracker).
    Route::get('/my/application', [StudentController::class, 'myApplication']);

    // A student's own documents. Each route checks the file belongs to them.
    Route::get('/my/documents', [DocumentController::class, 'mine']);
    Route::post('/my/documents/{document}/upload', [DocumentController::class, 'upload']);
    Route::get('/my/documents/{document}/download', [DocumentController::class, 'myDownload']);

    // A student's own thread with the office, and what the office has told them.
    Route::get('/my/messages', [MessageController::class, 'mine']);
    Route::post('/my/messages', [MessageController::class, 'send']);
    Route::get('/my/announcements', [AnnouncementController::class, 'mine']);
});

/* ---- staff only ---- */
Route::middleware(['auth:sanctum', 'staff', 'throttle:api'])->group(function () {
    Route::get('/enquiries', [EnquiryController::class, 'index']);
    Route::patch('/enquiries/{enquiry}', [EnquiryController::class, 'update']);

    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::get('/students/{student}', [StudentController::class, 'show']);
    Route::patch('/students/{student}', [StudentController::class, 'update']);
    Route::delete('/students/{student}', [StudentController::class, 'destroy']);
    Route::patch('/students/{student}/password', [StudentController::class, 'setPassword']);

    Route::patch('/students/{student}/stages/{stage}', [StudentController::class, 'updateStage']);

    // Documents. A file is sent as multipart; to replace one on an existing
    // document POST with _method=PATCH, since PHP does not parse multipart on PATCH.
    Route::post('/students/{student}/documents', [DocumentController::class, 'store']);
    Route::match(['patch', 'post'], '/students/{student}/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/students/{student}/documents/{document}', [DocumentController::class, 'destroy']);
    Route::get('/students/{student}/documents/{document}/download', [DocumentController::class, 'download']);

    Route::get('/students/{student}/messages', [MessageController::class, 'index']);
    Route::post('/students/{student}/messages', [MessageController::class, 'store']);

    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

    Route::post('/students/{student}/case-notes', [StudentController::class, 'addCaseNote']);
    Route::patch('/students/{student}/case-notes/{note}', [StudentController::class, 'updateCaseNote']);
    Route::delete('/students/{student}/case-notes/{note}', [StudentController::class, 'deleteCaseNote']);
});
