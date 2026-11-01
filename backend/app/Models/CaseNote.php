<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseNote extends Model
{
    protected $fillable = ['user_id', 'title', 'body', 'status', 'date_label'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
