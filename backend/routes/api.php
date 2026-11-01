<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

/* ---- public ---- */
Route::post('/enquiries', [EnquiryController::class, 'store']);
Route::post('/auth/login', [AuthController::class, 'login']);

/* ---- signed in (student or staff) ---- */
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // A student's own application (the tracker).
    Route::get('/my/application', [StudentController::class, 'myApplication']);
});

/* ---- staff only ---- */
Route::middleware(['auth:sanctum', 'staff'])->group(function () {
    Route::get('/enquiries', [EnquiryController::class, 'index']);

    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::get('/students/{student}', [StudentController::class, 'show']);
    Route::patch('/students/{student}', [StudentController::class, 'update']);
    Route::delete('/students/{student}', [StudentController::class, 'destroy']);
    Route::patch('/students/{student}/password', [StudentController::class, 'setPassword']);

    Route::patch('/students/{student}/stages/{stage}', [StudentController::class, 'updateStage']);

    Route::post('/students/{student}/case-notes', [StudentController::class, 'addCaseNote']);
    Route::patch('/students/{student}/case-notes/{note}', [StudentController::class, 'updateCaseNote']);
    Route::delete('/students/{student}/case-notes/{note}', [StudentController::class, 'deleteCaseNote']);
});
