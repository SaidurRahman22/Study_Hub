<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'student_code',
        'counsellor',
        'country',
        'university',
        'course',
        'intake',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['staff', 'admin'], true);
    }

    /** The six application stages, in order. */
    public function stages(): HasMany
    {
        return $this->hasMany(ApplicationStage::class)->orderBy('position');
    }

    /** The admin's notes on this student, newest first. */
    public function caseNotes(): HasMany
    {
        return $this->hasMany(CaseNote::class)->latest();
    }

    /** Passports, transcripts, bank statements. Files live on the private disk. */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class)->orderBy('group')->orderBy('id');
    }

    /** The one thread between this student and the office, oldest first so it
     *  reads top to bottom like a conversation. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->oldest();
    }

    /** Announcements addressed to this student by name. Those posted to
     *  everyone are not here; `Announcement::visibleTo()` covers both. */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class)->latest();
    }
}
