<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contact extends Model
{
    protected $fillable = [
        'customer_id',
        'name',
        'role',
        'phone',
        'email',
        'is_primary',
        'wa_opt_in',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'wa_opt_in' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
