<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EnquiryReceived;
use App\Mail\EnquiryToOffice;
use App\Models\Enquiry;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

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
            // Present when staff book a consultation rather than a visitor enquiring.
            'scheduled_at' => ['nullable', 'date'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'online' => ['nullable', 'boolean'],
        ]);

        /* scheduled_at, timezone and online are staff fields: they mean the
         * office agreed a consultation time. This endpoint is public, so an
         * anonymous caller could otherwise post appointments into the
         * consultation list that nobody in the office ever agreed to. Staff
         * set a time through the authenticated PATCH route instead. */
        $enquiry = Enquiry::create([
            ...Arr::except($data, ['scheduled_at', 'timezone', 'online']),
            'source' => $data['source'] ?? 'contact',
            'status' => 'new',
        ]);

        // Both sides are told at once: the enquirer that we have it, the
        // office that there is someone to ring. Neither can fail the request.
        Notify::mail($enquiry->email, new EnquiryReceived($enquiry));
        Notify::office(new EnquiryToOffice($enquiry));

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

    /** Staff: move a lead along (new -> contacted -> booked -> closed). */
    public function update(Request $request, Enquiry $enquiry): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:new,contacted,booked,closed'],
        ]);

        $enquiry->update($data);

        return response()->json($enquiry);
    }
}
