<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicLink extends Model
{
    protected $fillable = [
        'token',
        'type',
        'document_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }
}
