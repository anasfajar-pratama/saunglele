<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    public const STATUSES = [
        'received' => 'Diterima',
        'confirmed' => 'Dikonfirmasi',
        'production' => 'Produksi',
        'ready' => 'Siap Kirim',
        'shipped' => 'Dikirim',
        'delivered' => 'Diterima',
        'completed' => 'Selesai',
        'cancelled' => 'Dibatalkan',
    ];

    public const PAYMENT_STATUSES = [
        'unpaid' => 'Belum ditagih',
        'partial' => 'Sebagian',
        'paid' => 'Lunas',
        'overdue' => 'Terlambat',
    ];

    protected $fillable = [
        'number',
        'customer_po_number',
        'customer_id',
        'quotation_id',
        'type',
        'status',
        'requested_delivery_at',
        'confirmed_at',
        'subtotal',
        'tax',
        'shipping',
        'total',
        'payment_terms',
        'payment_status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'requested_delivery_at' => 'date',
            'confirmed_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'shipping' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(PoStatusHistory::class)->latest();
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }
}
