<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    protected $fillable = [
        'user_id',
        'kind',
        'title',
        'body',
        'href',
        'created_by',
    ];

    /** Null means it was posted to everyone. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** What one student sees: their own, plus everything posted to all. */
    public function scopeVisibleTo(Builder $query, User $student): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->whereNull('user_id')
            ->orWhere('user_id', $student->id)
        );
    }
}
