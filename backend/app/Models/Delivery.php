<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    public const STATUSES = [
        'scheduled' => 'Dijadwalkan',
        'loading' => 'Dimuat',
        'in_transit' => 'Dalam perjalanan',
        'delivered' => 'Diterima',
        'failed' => 'Gagal',
        'returned' => 'Dikembalikan',
    ];

    protected $fillable = [
        'purchase_order_id',
        'number',
        'driver_name',
        'driver_phone',
        'vehicle',
        'scheduled_at',
        'departed_at',
        'arrived_at',
        'receiver_name',
        'proof_path',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'departed_at' => 'datetime',
            'arrived_at' => 'datetime',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
