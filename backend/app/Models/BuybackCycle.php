<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuybackCycle extends Model
{
    public const STATUSES = [
        'stocked' => 'Tebar bibit',
        'growing' => 'Pembesaran',
        'sampling' => 'Sampling',
        'near_harvest' => 'Mendekati panen',
        'ready' => 'Siap buyback',
        'scheduled' => 'Buyback dijadwalkan',
        'harvested' => 'Panen',
        'settled' => 'Selesai',
    ];

    protected $fillable = [
        'customer_id',
        'seed_po_id',
        'stocked_at',
        'seed_qty',
        'seed_size',
        'target_abw_g',
        'estimated_harvest_at',
        'status',
        'actual_harvest_kg',
        'grade',
        'price_per_kg',
        'settlement_total',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'stocked_at' => 'date',
            'estimated_harvest_at' => 'date',
            'paid_at' => 'datetime',
            'seed_qty' => 'integer',
            'target_abw_g' => 'decimal:2',
            'actual_harvest_kg' => 'decimal:2',
            'price_per_kg' => 'decimal:2',
            'settlement_total' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function seedPo(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'seed_po_id');
    }

    public function samplings(): HasMany
    {
        return $this->hasMany(BuybackSampling::class)->latest('sampled_at');
    }

    public function latestSampling()
    {
        return $this->samplings()->first();
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }
}
