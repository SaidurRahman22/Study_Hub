<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationStage extends Model
{
    protected $fillable = ['user_id', 'name', 'state', 'date_label', 'note', 'position'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
