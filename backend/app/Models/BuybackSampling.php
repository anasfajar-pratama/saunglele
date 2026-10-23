<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuybackSampling extends Model
{
    protected $fillable = [
        'buyback_cycle_id',
        'sampled_at',
        'sample_count',
        'avg_weight_g',
        'estimated_sr',
        'estimated_biomass_kg',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'sampled_at' => 'date',
            'sample_count' => 'integer',
            'avg_weight_g' => 'decimal:2',
            'estimated_sr' => 'decimal:2',
            'estimated_biomass_kg' => 'decimal:2',
        ];
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(BuybackCycle::class, 'buyback_cycle_id');
    }
}
