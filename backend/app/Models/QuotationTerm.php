<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationTerm extends Model
{
    protected $fillable = [
        'name',
        'body',
        'is_default',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
