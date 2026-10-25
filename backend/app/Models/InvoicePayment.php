<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePayment extends Model
{
    public const TYPES = [
        'down_payment' => 'DP awal',
        'installment' => 'Pembayaran sebagian',
        'settlement' => 'Pelunasan',
    ];

    public const METHODS = [
        'transfer' => 'Transfer bank',
        'cash' => 'Tunai',
        'qris' => 'QRIS',
        'other' => 'Lainnya',
    ];

    protected $fillable = [
        'invoice_id',
        'type',
        'paid_at',
        'amount',
        'method',
        'reference',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'paid_at' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    public function getMethodLabelAttribute(): string
    {
        return self::METHODS[$this->method] ?? $this->method;
    }
}
