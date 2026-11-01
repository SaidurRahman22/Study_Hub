<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnquiryController extends Controller
{
    /**
     * Public: the website contact form (and later the consultation form) posts
     * here. Validated, stored, and acknowledged. No auth: anyone can enquire.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'destination' => ['nullable', 'string', 'max:255'],
            'need' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
            'source' => ['nullable', 'string', 'max:50'],
        ]);

        $enquiry = Enquiry::create([
            ...$data,
            'source' => $data['source'] ?? 'contact',
            'status' => 'new',
        ]);

        // A real email confirmation is wired in Phase 4.
        return response()->json(['ok' => true, 'id' => $enquiry->id], 201);
    }

    /**
     * Staff: every enquiry, newest first. Protected by auth in Phase 2; left
     * open for now so the admin list can be wired and seen.
     */
    public function index(): JsonResponse
    {
        return response()->json(Enquiry::latest()->get());
    }
}
