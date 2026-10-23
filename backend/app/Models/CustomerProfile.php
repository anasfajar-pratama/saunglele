<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerProfile extends Model
{
    protected $fillable = [
        'customer_id',
        'kitchen_capacity',
        'delivery_window',
        'certifications',
        'pond_area_m2',
        'pond_count',
        'water_source',
        'grow_out_capacity_kg',
        'target_abw_g',
        'buyback_agreement',
        'payment_terms_days',
        'preferred_products',
        'delivery_days',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'pond_area_m2' => 'decimal:2',
            'grow_out_capacity_kg' => 'decimal:2',
            'target_abw_g' => 'decimal:2',
            'payment_terms_days' => 'integer',
            'kitchen_capacity' => 'integer',
            'pond_count' => 'integer',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
