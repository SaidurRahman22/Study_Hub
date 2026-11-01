<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
 * This API has no login page: the React apps sign in through
 * POST /api/auth/login and hold a token. But Laravel's auth middleware builds
 * its redirect with route('login') the moment an unauthenticated request
 * arrives, so without a route of that name the framework throws
 * "Route [login] not defined" and a missing token surfaces as a 500 instead of
 * a 401. Naming this route keeps that path honest.
 */
Route::get('/login', fn () => response()->json(['message' => 'Unauthenticated.'], 401))
    ->name('login');
