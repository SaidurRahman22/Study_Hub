<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'group',
        'status',
        'path',
        'original_name',
        'size',
        'mime',
        'note',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** A readable size for the screens, e.g. "1.2 MB". */
    public function humanSize(): ?string
    {
        if (! $this->size) {
            return null;
        }
        if ($this->size >= 1048576) {
            return round($this->size / 1048576, 1).' MB';
        }
        if ($this->size >= 1024) {
            return round($this->size / 1024).' KB';
        }

        return $this->size.' B';
    }
}
