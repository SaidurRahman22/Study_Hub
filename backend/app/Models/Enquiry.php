<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Enquiry extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'destination',
        'need',
        'subject',
        'message',
        'source',
        'status',
        'scheduled_at',
        'timezone',
        'online',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'online' => 'boolean',
        ];
    }
}
